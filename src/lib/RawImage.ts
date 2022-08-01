import { chunks, chunksRgba, zip, changeBitDepth } from "./utils"
//@ts-ignore
import vertex_shader from "./glsl/vertex_shader.glsl"
//@ts-ignore
import fragment_shader from "./glsl/fragment_shader.glsl"

export interface RawImage {
    image: Uint16Array // RAW
    width: number
    height: number
}

export interface ProcessedImage {
    filename: String
    image: Uint16Array // RGBA 14bit
    width: number
    height: number
    bps: number
    cam_to_xyz: ConversionMatrix
    wb_coeffs: number[]
    blacks: number[]
    orientation: String
    settings: Settings
    iter: number
}

export interface CFA {
    str: string
    width: number
    height: number
}

export interface Settings {
    mode: "advanced" | "basic"
    advanced: {
        neutral: [number, number, number]
        exposure: number,
        gamma: number,
        facG: number,
        facB: number
    }
    //mask: [number, number, number]
}

export interface ConversionMatrix {
    matrix: number[]
    n: number // naar
    m: number // van
}

export function deBayer(image: RawImage, cfa: CFA): RawImage {
    // Tel voorkomen in cfa
    const nR = cfa.str.match(/R/g).length
    const nG = cfa.str.match(/G/g).length
    const nB = cfa.str.match(/B/g).length

    const n = Math.floor(image.width / cfa.width)
    const m = Math.floor(image.height / cfa.height)

    const buffer = new ArrayBuffer(n*m*8)
    const im = new Uint16Array(buffer)
    for (let i=0; i<n; i++) {
        for (let j=0; j<m; j++) {
            let red = 0
            let green = 0
            let blue = 0
            for (let k=0; k<cfa.width; k++) {
                for (let l=0; l<cfa.height; l++) {
                    const index = (j*cfa.height + l)*image.width + i*cfa.height + k
                    const value = image.image[index]
                    if (value == undefined) {
                        console.error(i, j, l, k, index, value, index < image.image.length)
                        throw new Error("No value")
                    }
                    switch (cfa.str[l*cfa.width + k]) {
                        case "R":
                            red += value
                            break
                        case "G":
                            green += value
                            break
                        case "B":
                            blue += value
                            break
                        default:
                            console.error(l, k, cfa.str[l*cfa.width + k])
                            throw new Error("No matching color found")
                    }
                }
            }

            im[(n*j+i)*4] = red/nR
            im[(n*j+i)*4+1] = green/nG
            im[(n*j+i)*4+2] = blue/nB
            im[(n*j+i)*4+3] = 65535
        }
    }
    return {image: im, width: n, height: m}
}

const xyz_to_rgb: ConversionMatrix = {
    matrix: [3.2404542, -1.5371385, -0.4985314,
        -0.9692660, 1.8760108, 0.0415560,
        0.0556434, -0.2040259, 1.0572252],
    n:  3,
    m: 3
}


function multiplyMatrices(matrix1: ConversionMatrix, matrix2: ConversionMatrix): ConversionMatrix {
    if (matrix1.m != matrix2.n) {
        throw new Error("Invalid shapes")
    }
    let result: number[] = []
    for (let i=0; i<matrix1.n; i++) {
        const row = matrix1.matrix.slice(i*matrix1.m, (i+1)*matrix1.m)
        for (let j=0; j<matrix2.m; j++) {
            let col: number[] = []
            for (let k=0; k<matrix2.n; k++) {
                col[k] = matrix2.matrix[j + k*matrix2.m]
            }
            result[i*matrix2.m + j] = zip(row, col).reduce((acc, [x, y]) => acc+x*y , 0)
        }
    }
    return {
        matrix: result,
        n: matrix1.n,
        m: matrix2.m
    }
    
}

function applyMatrixVector(vec: number[], matrix: ConversionMatrix): number[] {
    const result: number[] = []
    const { n, m } = matrix
    for (let i = 0; i < n; i++) {
        result.push(zip(
            Array.from(matrix.matrix).slice(i*m, (i+1)*m),
            vec)
            .reduce((acc, val) => acc + val[0]*val[1], 0)
        )
    }
    return result
}

export function applyConversionMatrix(image: number[] | Uint16Array, matrix: ConversionMatrix): number[] {
    return chunksRgba(image).flatMap((vec) => applyMatrixVector(vec, matrix))
}

export function draw(gl: WebGL2RenderingContext, image: ProcessedImage, invert: boolean, cc: number) {
    if (!gl) console.log("No gl")


    const w = image.width
    const h = image.height
    const img = image.image
    //let img
    
    // Test neutral color

    const inverse = [
        0.222, 0.02456, 0.03352, 0,
        0.06363, 0.45789, 0.12199, 0,
        0.00850, 0.08808, 0.30311, 0,
        0, 0, 0, 1]


    const neutralColor = applyMatrixVector([0.3, 0.3, 0.3, 1], {matrix: inverse, m:4, n:4})
    

    // Calculate Matrix
    const matr = multiplyMatrices(xyz_to_rgb, image.cam_to_xyz)
    let matr3d: number[] = []
    for (let i=0; i<3; i++) {
        for (let j=0; j<4; j++) {
            matr3d[i*4 + j] = matr.matrix[i*4 + j] * 2**14
        }
    }
    matr3d[12] = 0
    matr3d[13] = 0
    matr3d[14] = 0
    matr3d[15] = 1
    const obj: ConversionMatrix = {matrix: matr3d, n: 4, m: 4}
    // Transpose
    const transpose = []
    for (let i=0; i<4; i++) {
        for (let j=0; j<4; j++) {
            transpose[i*4 + j] = matr3d[j*4 + i]
        }
    }





    let exponent: [number, number, number, number]
    let factor: [number, number, number, number]

    const wb: [number, number, number] = [
        image.wb_coeffs[0]/image.wb_coeffs[1]/2,
        1,
        image.wb_coeffs[2]/image.wb_coeffs[1]/2]



    if (image.settings.mode == "advanced") {
        const s = image.settings.advanced
        console.log(s)
        const black = image.blacks[0]
        const gamma = [s.gamma, s.gamma*s.facG, s.gamma*s.facB]
        const neutral = s.neutral.map(x => (x-black)/ 2**14)
        const exposure = s.exposure

        
        const neutralValue: [number, number, number] = 
            [2**exposure*neutralColor[0]/wb[0],
             2**exposure*neutralColor[1]/wb[1],
             2**exposure*neutralColor[2]/wb[2]]
        
        exponent= [
            1/gamma[0],
            1/gamma[1],
            1/gamma[2],
            1
        ]
        
        factor = [
            (neutralValue[0]*(neutral[0]**exponent[0]))**(-gamma[0]),
            (neutralValue[1]*(neutral[1]**exponent[1]))**(-gamma[1]),
            (neutralValue[2]*(neutral[2]**exponent[2]))**(-gamma[2]),
            1
        ]

        // let arr = []
        // const kl = [1908, 1682, 1133]
        // //const kl = [0.234958656539, 0.32177733406, 0.115905554186].map(x => x*2**14)
        // //const kl=[0, 0, 0]
        // for (let i=0; i<image.width*image.height*4; i+=4) {
        //     arr[i] = kl[0]
        //     arr[i + 1] = kl[1]
        //     arr[i + 2] = kl[2]
        //     arr[i + 3] = 65535
        // }
        // console.log("kl", kl)
        // img = Uint16Array.from(arr)
        // console.log(img)

    }

    // const ec = 1
    // factor = [0.000684**(-1/2), 0.000519**(-1/2), 0.00000513**(-1/2), 1]

    console.log("factor:   ", factor)
    console.log("exponent: ", exponent)

    // const kl = [1908, 1682, 1133]
    // console.log(Math.pow(factor[0]*(kl[0]/16384 - image.blacks[0]/16384), exponent[0]))
    
    // const r = [ 11434,-4948,-1210,-3746,12042,1903,-666,1479,5235 ].map(x => x/1000)
    // const alt = [r[0], r[3], r[6], 0, r[1], r[4], r[7], 0, r[2], r[5], r[8], 0, 0, 0, 0, 1]

    // // Get maximum
    // let min = [10000, 10000, 10000]
    // let max = [0, 0, 0]
    // for (let i = 0; i<image.image.length; i+=4) {
    //     for (let j=0; j<3; j++) {
    //         if (image.image[i+j] < min[j])
    //             min[j] = image.image[i+j]
    //         if (image.image[i+j] > max[j])
    //             max[j] = image.image[i+j]
    //     }
    // }
    // console.log("Min: ", min)
    // console.log("Max: ", max)


    




    // program
    const program: any = gl.createProgram()
    var ext = gl.getExtension('EXT_color_buffer_float')
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA16F, 256, 256)


    // texture
    const tex = gl.createTexture(); // create empty texture
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    
    
    
    // buffer
    const buffer = gl.createBuffer()
    const bufferData =  new Float32Array([
        -1, -1,
        1, -1,
        1, 1,               
        1, 1,
        -1, 1,
        -1, -1
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW)
    
    // shaders
    program.vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(program.vs, vertex_shader)
    
    program.fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(program.fs, fragment_shader)
    
    gl.compileShader(program.vs)
    checkCompileError(program.vs)
    gl.compileShader(program.fs)
    checkCompileError(program.fs)
    
    function checkCompileError(s) {
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s))
        }
    }
    
    gl.attachShader(program,program.vs)
    gl.attachShader(program,program.fs)
    
    gl.deleteShader(program.vs)
    gl.deleteShader(program.fs)
    
    
    // program
    gl.bindAttribLocation(program, 0, "vertex")
    gl.linkProgram(program)
    gl.useProgram(program)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    
    // Load image
    gl.texImage2D(
        gl.TEXTURE_2D, // target
        0, // mip level
        gl.RGBA16UI, // internal format -> gl.RGBA16UI
        w, h, // width and height
        0, // border
        gl.RGBA_INTEGER, //format -> gm.RGBA_INTEGER
        gl.UNSIGNED_SHORT,
        // gl.UNSIGNED_BYTE, // type -> gl.UNSIGNED_SHORT
        img // texture data
        // Uint16Array.from(out)
        // img_8bit
    );
    
    const locBlack = gl.getUniformLocation(program, "black")
    gl.uniform1f(locBlack, image.blacks[0]/16384)





    const locmat = gl.getUniformLocation(program, "matrix")
    gl.uniformMatrix4fv(locmat, false, transpose)
    
    const locinvert = gl.getUniformLocation(program, "inv")
    gl.uniform1i(locinvert, invert ? 1 : 0)

    const locfac = gl.getUniformLocation(program, "fac")
    gl.uniform4f(locfac, ...factor)

    const locexp = gl.getUniformLocation(program, "exponent")
    gl.uniform4f(locexp, ...exponent)

    const locwb = gl.getUniformLocation(program, "wb")
    gl.uniform4f(locwb, ...wb, 1)
    //console.log(image.wb_coeffs[0]/image.wb_coeffs[1], 2*image.wb_coeffs[1]/image.wb_coeffs[1], image.wb_coeffs[2]/image.wb_coeffs[1], 1)
    gl.drawArrays(gl.TRIANGLES, 0, 6); // execute program
}


export const defaultSettings: Settings = {
    mode: "advanced",
    advanced: {
        neutral: [1886, 1657, 1135],
        exposure: 0,
        gamma: 0.5,
        facB: 1,
        facG: 1            
        }
}
