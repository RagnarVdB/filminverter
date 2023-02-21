import { chunksRgba, zip } from "./utils"
import {
    XYZ_to_sRGB,
    P3_to_XYZ,
    cam_to_P3,
    cam_to_paper,
    paper_to_srgb,
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
const EXPDIFF = 2

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
    advanced: {
        neutral: [number, number, number]
        exposure: number
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

export function deBayer(image: RawImage, cfa: CFA, black: [number, number, number]): RawImage {
    // Tel voorkomen in cfa
    const nR = cfa.str.match(/R/g).length
    const nG = cfa.str.match(/G/g).length
    const nB = cfa.str.match(/B/g).length

    const n = Math.floor((image.width - cfa.offset[0]) / cfa.width)
    const m = Math.floor((image.height - cfa.offset[1]) / cfa.height)

    const buffer = new ArrayBuffer(n * m * 8)
    const im = new Uint16Array(buffer)
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            let red = 0
            let green = 0
            let blue = 0
            for (let k = 0; k < cfa.width; k++) {
                for (let l = 0; l < cfa.height; l++) {
                    const index =
                        (j * cfa.height + l + cfa.offset[1]) * image.width +
                        i * cfa.height +
                        k +
                        cfa.offset[0]
                    const value = image.image[index]
                    if (value == undefined) {
                        console.error(
                            i,
                            j,
                            l,
                            k,
                            index,
                            value,
                            index < image.image.length
                        )
                        throw new Error("No value")
                    }
                    switch (cfa.str[l * cfa.width + k]) {
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
                            console.error(l, k, cfa.str[l * cfa.width + k])
                            throw new Error("No matching color found")
                    }
                }
            }

            im[(n * j + i) * 4] = red / nR - black[0]
            im[(n * j + i) * 4 + 1] = green / nG - black[1]
            im[(n * j + i) * 4 + 2] = blue / nB - black[2]
            im[(n * j + i) * 4 + 3] = 65535
        }
    }
    return { image: im, width: n, height: m }
}

function clamp(x: number, min: number, max: number) {
    return Math.max(min, Math.min(x, max))
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
    factor: [number, number, number, number],
    exponent: [number, number, number, number],
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
    settings: Settings,
    blacks: number[],
    wb_coeffs: number[],
    cam_to_xyz: ConversionMatrix
): Uint16Array {
    const w = image.width,
        h = image.height
    const { factor, exponent } = calculateConversionValues(
        settings,
        wb_coeffs
    )
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

const P3_to_sRGB = multiplyMatrices(XYZ_to_sRGB, P3_to_XYZ)

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

function multiplyMatrices(
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

function extendMatrixAlpha(matrix: ConversionMatrix): ConversionMatrix {
    if (matrix.n != 3 || matrix.m != 3) throw "Invalid size"
    let out: number[] = []
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            out[i * 4 + j] = matrix.matrix[i * 3 + j]
        }
    }
    out[3] = 0
    out[7] = 0
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = 0
    out[15] = 1

    return {
        matrix: out,
        n: 4,
        m: 4,
    }
}

function applyMatrixVector(vec: number[], matrix: ConversionMatrix): number[] {
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

function calculateConversionValues(
    settings: Settings,
    wb_coeffs: number[]
): {
    factor: [number, number, number, number]
    exponent: [number, number, number, number]
} {
    if (settings.mode == "advanced") {
        // const neutralColor = applyMatrixVector([0.3, 0.3, 0.3, 1], {matrix: inverse, m:4, n:4})
        const neutralColor = [0.3, 0.3, 0.3]
        const s = settings.advanced
        const gamma = [s.gamma, s.gamma * s.facG, s.gamma * s.facB]
        const neutral = s.neutral.map((x) => x / 2 ** 14)
        const exposure = s.exposure

        const neutralValue: number[] = [
            (2 ** exposure * neutralColor[0]) ** -gamma[0],
            (2 ** exposure * neutralColor[1]) ** -gamma[1],
            (2 ** exposure * neutralColor[2]) ** -gamma[2],
            1,
        ]

        const neutralInputP3 = applyMatrixVector(neutral, cam_to_P3)

        const exponent: [number, number, number, number] = [
            1 / gamma[0],
            1 / gamma[1],
            1 / gamma[2],
            1,
        ]

        const factor: [number, number, number, number] = [
            neutralValue[0] / neutralInputP3[0],
            neutralValue[1] / neutralInputP3[1],
            neutralValue[2] / neutralInputP3[2],
            1,
        ]

        const cs: ("R" | "G" | "B")[] = ["R", "G", "B"]
        console.log(
            "Neutral: ",
            cs.map((main) =>
                processColorValue(
                    s.neutral,
                    main,
                    factor,
                    exponent,
                    cam_to_P3,
                    true
                )
            )
        )

        return { exponent: exponent, factor: factor }
    } else if (settings.mode == "bw") {
        const inverse = [
            0.222, 0.02456, 0.03352, 0, 0.06363, 0.45789, 0.12199, 0, 0.0085,
            0.08808, 0.30311, 0, 0, 0, 0, 1,
        ]

        const neutralColor = applyMatrixVector([0.1, 0.1, 0.1, 1], {
            matrix: inverse,
            m: 4,
            n: 4,
        })

        const wb: [number, number, number] = [
            wb_coeffs[0] / wb_coeffs[1] / 2,
            1,
            wb_coeffs[2] / wb_coeffs[1] / 2,
        ]

        const s = settings.bw
        const gamma = [s.gamma, s.gamma, s.gamma]
        const neutral = s.black.map((x) => x / 2 ** 14)
        const fade = s.fade

        const neutralValue: [number, number, number] = [
            (2 ** fade * neutralColor[0]) / wb[0],
            (2 ** fade * neutralColor[1]) / wb[1],
            (2 ** fade * neutralColor[2]) / wb[2],
        ]

        console.log(
            "neutral",
            neutralValue.map((x) => x * 2 ** 14),
            neutralColor
        )

        const exponent: [number, number, number, number] = [
            1 / gamma[0],
            1 / gamma[1],
            1 / gamma[2],
            1,
        ]

        const factor: [number, number, number, number] = [
            (neutralValue[0] * neutral[0] ** exponent[0]) ** -gamma[0],
            (neutralValue[1] * neutral[1] ** exponent[1]) ** -gamma[1],
            (neutralValue[2] * neutral[2] ** exponent[2]) ** -gamma[2],
            1,
        ]
        return { exponent: exponent, factor: factor }
    }
}

function getRotation(
    rotationValue: number
): [[number, number], [number, number], [number, number]] {
    let RotX: [number, number], RotY: [number, number], trans: [number, number]
    switch (rotationValue) {
        case 0:
            RotX = [0.5, 0.5]
            RotY = [0, 0]
            trans = [0.5, 0.5]
            break
        case 1:
            RotX = [0, 0]
            RotY = [-0.5, 0.5]
            trans = [-0.5, 0.5]
            break
        case 2:
            RotX = [-0.5, -0.5]
            RotY = [0, 0]
            trans = [-0.5, -0.5]
            break
        case 3:
            RotX = [0, 0]
            RotY = [0.5, -0.5]
            trans = [0.5, -0.5]
            break
        default:
            throw new Error("Invalid rotation value" + rotationValue)
    }
    return [RotX, RotY, trans]
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
    var ext = gl.getExtension("EXT_color_buffer_float")
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

    function checkCompileError(s) {
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
        img // texture data
        // Uint16Array.from(out)
        // img_8bit
    )

    for (const parameter of parameters) {
        const { name, f, data } = parameter
        const loc = gl.getUniformLocation(program, name)
        f.apply(gl, [loc, ...data])
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6) // execute program
}

export function draw(
    gl: WebGL2RenderingContext,
    image: ProcessedImage,
    invert: boolean,
    cc: number
) {
    if (!gl) console.log("No gl")

    const w = image.width
    const h = image.height
    const img = image.image

    const [matr1, matr2] =
        image.type == "normal"
            ? [
                  transpose(extendMatrixAlpha(cam_to_P3)),
                  transpose(extendMatrixAlpha(P3_to_sRGB)),
              ]
            : [
                  transpose(extendMatrixAlpha(cam_to_paper)),
                  transpose(extendMatrixAlpha(paper_to_srgb)),
              ]

    const wb: [number, number, number] = [
        image.wb_coeffs[0] / image.wb_coeffs[1] / 2,
        1,
        image.wb_coeffs[2] / image.wb_coeffs[1] / 2,
    ]

    const { factor, exponent } = calculateConversionValues(
        image.settings,
        image.wb_coeffs
    )
    const [RotX, RotY, trans] = getRotation(image.settings.rotation)

    const parameters: WebGLArgument<any[]>[] = [
        { name: "rotX", f: gl.uniform2f, data: RotX },
        { name: "rotY", f: gl.uniform2f, data: RotY },
        { name: "trans", f: gl.uniform2f, data: trans },
        {
            name: "matrix1",
            f: gl.uniformMatrix4fv,
            data: [false, matr1.matrix],
        },
        {
            name: "matrix2",
            f: gl.uniformMatrix4fv,
            data: [false, matr2.matrix],
        },
        { name: "inv", f: gl.uniform1i, data: [invert ? 1 : 0] },
        {
            name: "trichrome",
            f: gl.uniform1i,
            data: [image.type == "trichrome" ? 1 : 0],
        },
        { name: "fac", f: gl.uniform4f, data: factor },
        { name: "exponent", f: gl.uniform4f, data: exponent },
        { name: "wb", f: gl.uniform4f, data: [...wb, 1] },
    ]

    webglDraw(gl, img, w, h, parameters)
}

export const defaultSettings: Settings = {
    mode: "advanced",
    rotation: 0,
    advanced: {
        neutral: [3024, 2094, 427],
        exposure: -1.95,
        gamma: 0.45,
        facB: -0.35 / 20 + 1,
        facG: 0.25 / 20 + 1,
    },
    bw: {
        black: [1886, 1657, 1135],
        fade: 0,
        gamma: 0.9,
    },
}
