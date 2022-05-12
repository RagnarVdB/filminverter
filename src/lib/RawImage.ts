import { chunks, chunksRgba, zip } from "./utils"
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
    image: Uint16Array // RGBA 14bit
    width: number
    height: number
    bps: number
    cam_to_xyz: ConversionMatrix
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
    gamma: [number, number, number]
    offset: [number, number, number]
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
            im[(n*j+i)*4+3] = 2**16 - 1
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

function gammaTranform(linear: number): number {
    const gamma = 1/2.4
    if (linear < 0.0031308) {
        return linear * 12.92*256
    } else {
        return (Math.pow(linear*1.055,gamma) - 0.055)*256
    }
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

export function showImage(image: ProcessedImage): ImageData {
    console.log("processing")
    const im = Array.from(image.image)
    const blacks = image.blacks
    let rgbImage = []
    console.log(image.cam_to_xyz, xyz_to_rgb)
    const mult = multiplyMatrices(xyz_to_rgb, image.cam_to_xyz) 
    console.log(mult)
    for (let i = 0; i < im.length; i += 4) {
        // console.log(im.slice(i, i+1))
        //const xyz = applyMatrixVector([im[i]-blacks[0], im[i+1]-blacks[1], im[i+2]-blacks[2], im[i+3]-blacks[3]], image.cam_to_xyz)
        // // console.log("xyz", xyz)
        //const rgb = applyMatrixVector(xyz, xyz_to_rgb)

        const rgb = applyMatrixVector([im[i]-blacks[0], im[i+1]-blacks[1], im[i+2]-blacks[2], im[i+3]-blacks[3]], mult)
        rgbImage.push(...rgb, 1)
    }
    const clamped = Uint8ClampedArray.from(rgbImage, gammaTranform)

    const imdat = new ImageData(clamped, image.width, image.height)
    return imdat
}

export function draw(canvas: HTMLCanvasElement, image: ProcessedImage) {
    const imdat = showImage(image)
    
    const gl = canvas.getContext("webgl")
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

    // Create our vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertexShader, vertex_shader)
    gl.compileShader(vertexShader)

    // // Create our fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragmentShader, fragment_shader)
    gl.compileShader(fragmentShader)

    // Create our program
    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    // Enable the program
    gl.useProgram(program)

    // Bind VERTICES as the active array buffer.
    const VERTICES = new Float32Array([-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1])

    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW)

    // Set and enable our array buffer as the program's "position" variable
    const positionLocation = gl.getAttribLocation(program, "position")
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(positionLocation)

    
    
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imdat);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // Draw our 6 VERTICES as 1 triangle
    gl.clearColor(1.0, 1.0, 1.0, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Set uniforms
    const locexp = gl.getUniformLocation(program, "exposure")
    gl.uniform1f(locexp, 0)

    const locmat = gl.getUniformLocation(program, "matrix")
    gl.uniformMatrix3fv(locmat, false, [1, 0, 0, 0, 1, 0, 0, 0, 1])

    gl.drawArrays(gl.TRIANGLES, 0, 6)
}

export const defaultSettings: Settings = {
    gamma: [1, 1, 1],
    offset: [1, 1, 1]
}
