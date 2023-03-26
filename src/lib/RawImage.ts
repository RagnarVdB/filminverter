import { chunksRgba, zip, clamp } from "./utils"
import {
    P3_to_sRGB,
    cam_to_P3,
    cam_to_paper,
    paper_to_srgb,
    srgb_to_paper,
    cam_to_APD,
    cdd_to_cid,
    exp_to_sRGB,
} from "./matrices"

//@ts-ignore
import vertex_shader from "./glsl/vertex_shader.glsl"
//@ts-ignore
import fragment_shader from "./glsl/fragment_shader.glsl"

const colorOrder = {
    R: 0,
    G: 1,
    B: 2,
}

export const TRICHNAMES = ["Red", "Green", "Blue", "BRed", "BGreen", "BBlue"]

export type TrichImages = [
    ProcessedImage,
    ProcessedImage,
    ProcessedImage,
    ProcessedImage,
    ProcessedImage,
    ProcessedImage
]
const EXPDIFF = 3

export interface RawImage {
    image: Uint16Array // RAW
    width: number
    height: number
}

export interface ProcessedImage {
    filename: string
    file: File
    image: Uint16Array // RGBA 14bit
    type: "normal" | "trichrome"
    width: number
    height: number
    bps: number
    cfa: CFA
    cam_to_xyz: ConversionMatrix
    wb_coeffs: number[]
    blacks: number[]
    orientation: string
    settings: Settings
    iter: number
}

export interface CFA {
    str: string
    width: number
    height: number
    offset: [number, number]
}

export interface Settings {
    mode: "advanced" | "basic" | "bw"
    rotation: number
    rotationMatrix: ConversionMatrix
    zoom: [number, number, number, number]
    advanced: {
        neutral: [number, number, number]
        exposure: number
        blue: number
        green: number
        gamma: number
        facG: number
        facB: number
    }
    bw: {
        black: [number, number, number]
        fade: number
        gamma: number
    }
    //mask: [number, number, number]
}

export interface ConversionMatrix {
    matrix: number[]
    n: number // naar
    m: number // van
}

export function multiplyMatrices(
    matrix1: ConversionMatrix,
    matrix2: ConversionMatrix
): ConversionMatrix {
    if (matrix1.m != matrix2.n) {
        throw new Error("Invalid shapes")
    }
    let result: number[] = []
    for (let i = 0; i < matrix1.n; i++) {
        const row = matrix1.matrix.slice(i * matrix1.m, (i + 1) * matrix1.m)
        for (let j = 0; j < matrix2.m; j++) {
            let col: number[] = []
            for (let k = 0; k < matrix2.n; k++) {
                col[k] = matrix2.matrix[j + k * matrix2.m]
            }
            result[i * matrix2.m + j] = zip(row, col).reduce(
                (acc, [x, y]) => acc + x * y,
                0
            )
        }
    }
    return {
        matrix: result,
        n: matrix1.n,
        m: matrix2.m,
    }
}

function transpose(matrix: ConversionMatrix): ConversionMatrix {
    const transposed = []
    for (let i = 0; i < matrix.m; i++) {
        for (let j = 0; j < matrix.n; j++) {
            transposed[i * matrix.n + j] = matrix.matrix[j * matrix.m + i]
        }
    }
    return {
        matrix: transposed,
        n: matrix.m,
        m: matrix.n,
    }
}

export function applyMatrixVector(
    vec: number[],
    matrix: ConversionMatrix
): number[] {
    const result: number[] = []
    const { n, m } = matrix
    for (let i = 0; i < n; i++) {
        result.push(
            zip(
                Array.from(matrix.matrix).slice(i * m, (i + 1) * m),
                vec
            ).reduce((acc, val) => acc + val[0] * val[1], 0)
        )
    }
    return result
}

export function applyConversionMatrix(
    image: number[] | Uint16Array,
    matrix: ConversionMatrix
): number[] {
    return chunksRgba(image).flatMap((vec) => applyMatrixVector(vec, matrix))
}

function getCFAValue(cfa: CFA, x: number, y: number): "R" | "G" | "B" {
    let color: "R" | "G" | "B"
    const c = cfa.str[(x % cfa.width) + (y % cfa.height) * cfa.width]
    if (c == "R" || c == "G" || c == "B") {
        color = c
    } else {
        throw "Invalid CFA"
    }
    return color
}

function getColorValue(
    image: RawImage,
    cfa: CFA,
    x: number,
    y: number
): { main: "R" | "G" | "B"; color: [number, number, number] } {
    const w = image.width
    let color: [number, number, number] = [0, 0, 0]
    let pixelCounts: [number, number, number] = [0, 0, 0]
    const main = getCFAValue(cfa, x, y)
    color[colorOrder[main]] = image.image[x + y * w]
    pixelCounts[colorOrder[main]] = 1
    for (
        let i = Math.max(x - 1, 0);
        i < Math.min(x + 1, image.width) + 1;
        i++
    ) {
        for (
            let j = Math.max(y - 1, 0);
            j < Math.min(y + 1, image.height) + 1;
            j++
        ) {
            const c = getCFAValue(cfa, i, j)
            if (c !== main) {
                color[colorOrder[c]] += image.image[i + j * w]
                pixelCounts[colorOrder[c]]++
            }
        }
    }
    color[0] /= pixelCounts[0]
    color[1] /= pixelCounts[1]
    color[2] /= pixelCounts[2]
    return {
        main,
        color,
    }
}

export function convertTrichrome(trichImages: TrichImages): ProcessedImage {
    const N = trichImages[0].image.length / 4
    const out = new Uint16Array(N * 4)
    for (let i = 0; i < N; i++) {
        const r =
            trichImages[0].image[i * 4] +
            trichImages[0].image[i * 4 + 1] +
            trichImages[0].image[i * 4 + 2]
        const g =
            trichImages[1].image[i * 4] +
            trichImages[1].image[i * 4 + 1] +
            trichImages[1].image[i * 4 + 2]
        const b =
            trichImages[2].image[i * 4] +
            trichImages[2].image[i * 4 + 1] +
            trichImages[2].image[i * 4 + 2]

        const br =
            trichImages[3].image[i * 4] +
            trichImages[3].image[i * 4 + 1] +
            trichImages[3].image[i * 4 + 2]
        const bg =
            trichImages[4].image[i * 4] +
            trichImages[4].image[i * 4 + 1] +
            trichImages[4].image[i * 4 + 2]
        const bb =
            trichImages[5].image[i * 4] +
            trichImages[5].image[i * 4 + 1] +
            trichImages[5].image[i * 4 + 2]

        const max = 2 ** 14
        out[i * 4] = clamp((r / (br * 2 ** EXPDIFF)) * max, 0, max)
        out[i * 4 + 1] = clamp((g / (bg * 2 ** EXPDIFF)) * max, 0, max)
        out[i * 4 + 2] = clamp((b / (bb * 2 ** EXPDIFF)) * max, 0, max)
        out[i * 4 + 3] = 65535
    }
    return {
        ...trichImages[0],
        image: out,
        wb_coeffs: [1, 1, 1, 1],
        type: "trichrome",
    }
}

function processColorValue(
    color: [number, number, number],
    main: "R" | "G" | "B",
    factor: [number, number, number],
    exponent: [number, number, number],
    matrix: ConversionMatrix,
    log: boolean
): number {
    const j = colorOrder[main]
    let cb = [0, 0, 0]

    cb[0] = (color[0] - 1024 - 9) / 16384
    cb[1] = (color[1] - 1024 - 26) / 16384
    cb[2] = (color[2] - 1024 - 17) / 16384
    if (log) console.log(main, color)

    // Change colorspace
    const m = matrix.matrix
    let out = m[j * 3] * cb[0] + m[j * 3 + 1] * cb[1] + m[j * 3 + 2] * cb[2]
    if (log) console.log(out)

    const inv = (out * factor[j]) ** -exponent[j]

    if (log) console.log(main, "inverted 01: ", inv)

    return clamp(Math.round(inv * 16383 + 1024), 1024, 16383)
}

export function invertRaw(
    image: RawImage,
    cfa: CFA,
    settings: Settings
): Uint16Array {
    const w = image.width,
        h = image.height
    const { factor, exponent } = calculateConversionValues(settings, "normal")
    let out = new Uint16Array(w * h)

    const tr = {
        matrix: [1, 0, 1, 1, 0, 1, 1, 1, 1],
        n: 3,
        m: 3,
    }

    for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
            const { main, color } = getColorValue(image, cfa, i, j)
            out[i + j * w] = processColorValue(
                color,
                main,
                factor,
                exponent,
                tr,
                false
            )
        }
    }
    return out
}

function calculateConversionValues(
    settings: Settings,
    type: "normal" | "trichrome"
): {
    factor: [number, number, number]
    exponent: [number, number, number]
    dmin: [number, number, number]
} {
    const s = settings.advanced
    const dmin: [number, number, number] = [
        s.neutral[0] / 2 ** 14,
        s.neutral[1] / 2 ** 14,
        s.neutral[2] / 2 ** 14,
    ]
    const a = 2.0174547676239669
    const exposure = [
        a - s.exposure,
        a - s.exposure * s.green,
        a - s.exposure * s.blue,
    ]
    const factor: [number, number, number] = [
        10 ** -exposure[0],
        10 ** -exposure[1],
        10 ** -exposure[2],
    ]
    const gamma = [s.gamma, s.gamma * s.facG, s.gamma * s.facB]
    const exponent: [number, number, number] = [
        -1 / gamma[0],
        -1 / gamma[1],
        -1 / gamma[2],
    ]

    return { exponent: exponent, factor: factor, dmin: dmin }
}

export function getRotationMatrix(rotationValue: number): ConversionMatrix {
    // Determine rotation matrix
    let Rot: [number, number, number, number], trans: [number, number]
    switch (rotationValue) {
        case 0:
            Rot = [1, 0, 0, 1]
            break
        case 1:
            Rot = [0, -1, 1, 0]
            break
        case 2:
            Rot = [-1, 0, 0, -1]
            break
        case 3:
            Rot = [0, 1, -1, 0]
            break
        default:
            throw new Error("Invalid rotation value" + rotationValue)
    }
    return { matrix: Rot, m: 2, n: 2 }
}

export function applyRotation(
    x: number,
    y: number,
    rot: ConversionMatrix
): [number, number] {
    const a = applyMatrixVector([2 * x - 1, 2 * y - 1], rot)
    return [(a[0] + 1) / 2, (a[1] + 1) / 2]
}

export function applyRotationAndZoom(
    x: number,
    y: number,
    rot: ConversionMatrix,
    zoom: [number, number, number, number]
): [number, number] {
    // [0, 1] -> [0, 1]
    console.log("apply", rot, zoom)
    const a = applyMatrixVector([2 * x - 1, 1 - 2 * y], rot)
    return [
        (zoom[0] / 2) * (a[0] + 1) + zoom[2],
        1 - ((zoom[1] / 2) * (a[1] + 1) + zoom[3]),
    ]
}

interface WebGLArgument<T extends unknown[]> {
    name: string
    f: (location: WebGLUniformLocation, ...data: T) => void
    data: T
}

function webglDraw(
    gl: WebGL2RenderingContext,
    img: Uint16Array,
    w: number,
    h: number,
    parameters: WebGLArgument<unknown[]>[]
) {
    // program
    const program: any = gl.createProgram()
    const ext = gl.getExtension("EXT_color_buffer_float")
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA16F, 256, 256)

    // texture
    const tex = gl.createTexture() // create empty texture
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    // buffer
    const buffer = gl.createBuffer()
    const bufferData = new Float32Array([
        -1, -1, 1, -1, 1, 1, 1, 1, -1, 1, -1, -1,
    ])
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

    function checkCompileError(s: WebGLShader) {
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s))
        }
    }

    gl.attachShader(program, program.vs)
    gl.attachShader(program, program.fs)
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
        w,
        h, // width and height
        0, // border
        gl.RGBA_INTEGER, //format -> gm.RGBA_INTEGER
        gl.UNSIGNED_SHORT,
        // gl.UNSIGNED_BYTE, // type -> gl.UNSIGNED_SHORT
        img // texture dat
    )

    for (const parameter of parameters) {
        const { name, f, data } = parameter
        const loc = gl.getUniformLocation(program, name)
        if (loc == null) {
            throw new Error("Could not find uniform " + name)
        }
        f.apply(gl, [loc, ...data])
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6) // execute program
}

export function draw(gl: WebGL2RenderingContext, image: ProcessedImage) {
    if (!gl) console.log("No gl")

    const w = image.width
    const h = image.height
    const img = image.image

    const [matr1, matr2, matr3] = [
        transpose(cam_to_APD),
        transpose(cdd_to_cid),
        transpose(exp_to_sRGB),
    ]

    const { factor, exponent, dmin } = calculateConversionValues(
        image.settings,
        image.type
    )
    console.log(factor, exponent, dmin)
    const rot = image.settings.rotationMatrix.matrix
    const zoom = image.settings.zoom
    const parameters: WebGLArgument<any[]>[] = [
        { name: "rot", f: gl.uniformMatrix2fv, data: [false, rot] },
        { name: "scale", f: gl.uniform2f, data: [zoom[0] / 2, zoom[1] / 2] },
        { name: "trans", f: gl.uniform2f, data: [zoom[2], zoom[3]] },
        {
            name: "matrix1",
            f: gl.uniformMatrix3fv,
            data: [false, matr1.matrix],
        },
        {
            name: "matrix2",
            f: gl.uniformMatrix3fv,
            data: [false, matr2.matrix],
        },
        {
            name: "matrix3",
            f: gl.uniformMatrix3fv,
            data: [false, matr3.matrix],
        },
        // {
        //     name: "trichrome",
        //     f: gl.uniform1i,
        //     data: [image.type == "trichrome" ? 1 : 0],
        // },
        { name: "fac", f: gl.uniform3f, data: factor },
        { name: "exponent", f: gl.uniform3f, data: exponent },
        { name: "dmin", f: gl.uniform3f, data: dmin },
    ]

    webglDraw(gl, img, w, h, parameters)
}

export const defaultSettings: Settings = {
    mode: "advanced",
    rotation: 0,
    rotationMatrix: { matrix: [1, 0, 0, 1], m: 2, n: 2 },
    zoom: [1, 1, 0, 0],
    advanced: {
        neutral: [7662, 2939, 1711],
        exposure: 0,
        blue: 1,
        green: 1,
        gamma: 55 / 100,
        facB: 1 / 0.95,
        facG: 1 / 0.92,
    },
    bw: {
        black: [1886, 1657, 1135],
        fade: 0,
        gamma: 0.9,
    },
}
