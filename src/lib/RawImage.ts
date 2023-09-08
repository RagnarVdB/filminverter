import { chunksRgba, zip, clamp, omap } from "./utils"
import {
    cam_to_APD,
    cam_to_APD2,
    cam_to_sRGB,
    cdd_to_cid,
    exp_to_sRGB,
    sRGB_to_EXP,
    sRGB_to_cam,
} from "./matrices"

//@ts-ignore
import vertex_shader from "./glsl/vertex_shader.glsl"
//@ts-ignore
import fragment_color from "./glsl/fragment_color.glsl"
//@ts-ignore
import fragment_bw from "./glsl/fragment_bw.glsl"
import { get } from "svelte/store"

const BLACK = 1016

const colorOrder = {
    R: 0,
    G: 1,
    B: 2,
}

const bgMap: { [Key in Primary]: BgPrimary } = {
    R: "BR",
    G: "BG",
    B: "BB",
}

type Primary = "R" | "G" | "B"
type BgPrimary = "BR" | "BG" | "BB"
type Triple = [number, number, number]

export const TRICHNAMES = [
    "Red",
    "Green",
    "Blue",
    "BRed",
    "BGreen",
    "BBlue",
] as const
export type TrichName = (typeof TRICHNAMES)[number]

export function isTrichName(name: string): name is TrichName {
    return TRICHNAMES.includes(name as TrichName)
}

export const TrichNameMap: { [Key in TrichName]: Primary | BgPrimary } = {
    Red: "R",
    Green: "G",
    Blue: "B",
    BRed: "BR",
    BGreen: "BG",
    BBlue: "BB",
}

export interface Bg<T> {
    image: T
    background: T
}

export interface Trich<T> {
    R: T
    G: T
    B: T
    BR: T
    BG: T
    BB: T
}

export function trichNotNull<T>(xs: Trich<T | null>): xs is Trich<T> {
    return Object.values(xs).every((x) => x != null)
}

export function mapTrich<T, U>(f: (x: T) => U, x: Trich<T>): Trich<U> {
    return {
        R: f(x.R),
        G: f(x.G),
        B: f(x.B),
        BR: f(x.BR),
        BG: f(x.BG),
        BB: f(x.BB),
    }
}

export function mapTriple(f: (x: number) => number, x: Triple): Triple {
    return [f(x[0]), f(x[1]), f(x[2])]
}

const EXPFAC: Triple = [30 / 4, 30 / 4, 13 * 0.6]
const EXPFACSINGLE = 180 / 15

export interface RawImage {
    image: Uint16Array // RAW
    width: number
    height: number
}

export interface LoadedImage extends RawImage {
    make: string
    bps: number
    cfa: CFA
    cam_to_xyz: Matrix
    wb_coeffs: number[]
    blacks: number[]
}

export interface _ProcessedInfo {
    // Abstract
    image: Uint16Array // RGBA 14bit
    width: number
    height: number
    make: string
    bps: number
    cfa: CFA
    cam_to_xyz: Matrix
    wb_coeffs: number[]
    blacks: number[]
    orientation: string
    settings: Settings
    iter: number
}
export interface ProcessedSingle extends _ProcessedInfo {
    filename: string
    file: File
    kind: "normal"
}

export interface ProcessedDensity extends _ProcessedInfo {
    filename: string
    file: File
    bg_filename: string
    bg_file: File
    kind: "density"
}

export interface ProcessedTrichrome extends _ProcessedInfo {
    filenames: Trich<string>
    files: Trich<File>
    kind: "trichrome"
}

export type ProcessedImage =
    | ProcessedSingle
    | ProcessedTrichrome
    | ProcessedDensity

export interface CFA {
    str: string
    width: number
    height: number
    offset: [number, number]
}

export interface Settings {
    mode: "advanced" | "basic" | "bw"
    rotation: number
    rotationMatrix: Matrix
    zoom: [number, number, number, number]
    advanced: {
        toe: boolean
        dmin: Triple
        neutral: Triple
        exposure: number
        blue: number
        green: number
        gamma: number
        facG: number
        facB: number
    }
    bw: {
        toe: boolean
        blackpoint: Triple
        exposure: number
        gamma: number
        toe_width: number
        blackpoint_shift: number
    }
    //mask: Triple
}

interface ConversionValuesBw {
    m: number
    b: number
    d: number
    dmin: Triple
}

export interface Matrix {
    matrix: number[]
    n: number // naar
    m: number // van
}

export interface ColorMatrix {
    matrix: number[]
    n: 3 // naar
    m: 3 // van
}

type LutSets = [number, number, number, number]
const lutSets: [LutSets, LutSets, LutSets] = [
    [-10.531924030702566, -5.8404278002068075, 0.1, -0.23031522712591435],
    [-5.58974329151427, -8.0595005202138381, 0.2, -0.74694390911064334],
    [-7.7641792146902739, -11.103306662255587, 0.2, -0.88572369488605363],
]

function matmul(
    M1: number[],
    n1: number,
    m1: number,
    M2: number[],
    n2: number,
    m2: number
): number[] {
    let result: number[] = []
    for (let i = 0; i < n1; i++) {
        const row = M1.slice(i * m1, (i + 1) * m1)
        for (let j = 0; j < m2; j++) {
            let col: number[] = []
            for (let k = 0; k < n2; k++) {
                col[k] = M2[j + k * m2]
            }
            result[i * m2 + j] = zip(row, col).reduce(
                (acc, [x, y]) => acc + x * y,
                0
            )
        }
    }
    return result
}

export function multiplyMatrices(matrix1: Matrix, matrix2: Matrix): Matrix {
    if (matrix1.m != matrix2.n) {
        throw new Error("Invalid shapes")
    }
    return {
        matrix: matmul(
            matrix1.matrix,
            matrix1.n,
            matrix1.m,
            matrix2.matrix,
            matrix2.n,
            matrix2.m
        ),
        n: matrix1.n,
        m: matrix2.m,
    }
}

export function multiplyColorMatrices(
    matrix1: ColorMatrix,
    matrix2: ColorMatrix
): ColorMatrix {
    return {
        matrix: matmul(matrix1.matrix, 3, 3, matrix2.matrix, 3, 3),
        n: 3,
        m: 3,
    }
}

function transpose(matrix: Matrix): Matrix {
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

export function applyMatrixVector(vec: number[], matrix: Matrix): number[] {
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

export function applyCMV(matrix: ColorMatrix, vec: Triple): Triple {
    const result: Triple = [0, 0, 0]
    for (let i = 0; i < 3; i++) {
        result[i] = zip(
            Array.from(matrix.matrix).slice(i * 3, (i + 1) * 3),
            vec
        ).reduce((acc, val) => acc + val[0] * val[1], 0)
    }
    return result
}

export function applyConversionMatrix(
    image: number[] | Uint16Array,
    matrix: Matrix
): number[] {
    return chunksRgba(image).flatMap((vec) => applyMatrixVector(vec, matrix))
}

function getCFAValue(cfa: CFA, x: number, y: number): Primary {
    // Getransponeerde CFA
    let color: Primary
    const c =
        cfa.str[
            ((y + 6 - cfa.offset[1]) % cfa.width) +
                ((x + 6 - cfa.offset[0]) % cfa.height) * cfa.width
        ]
    if (c == "R" || c == "G" || c == "B") {
        color = c
    } else {
        throw "Invalid CFA"
    }
    return color
}

function getColorValueSingle(
    image: RawImage,
    cfa: CFA,
    x: number,
    y: number
): { main: Primary; color: Triple } {
    const w = image.width,
        h = image.height
    let color: Triple = [0, 0, 0]
    let pixelCounts: Triple = [0, 0, 0]
    const main = getCFAValue(cfa, x, y)
    color[colorOrder[main]] = image.image[x + y * w]
    pixelCounts[colorOrder[main]] = 1
    for (let i = Math.max(x - 1, 0); i < Math.min(x + 1, w) + 1; i++) {
        for (let j = Math.max(y - 1, 0); j < Math.min(y + 1, h) + 1; j++) {
            const c = getCFAValue(cfa, i, j)
            if (c !== main) {
                color[colorOrder[c]] +=
                    image.image[i + j * w] - pixelCounts[colorOrder[c]]++
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

function getTransmittanceBg(image: Bg<RawImage>, x: number, y: number): number {
    const w = image.image.width
    return (
        (image.image.image[x + y * w] - BLACK) /
        (image.background.image[x + y * w] - BLACK) /
        EXPFACSINGLE
    )
}

function getColorValueBg(
    image: Bg<RawImage>,
    cfa: CFA,
    x: number,
    y: number
): { main: Primary; color: Triple } {
    const w = image.image.width,
        h = image.image.height
    let color: Triple = [0, 0, 0]
    let pixelCounts: Triple = [0, 0, 0]
    const main = getCFAValue(cfa, x, y)
    color[colorOrder[main]] = getTransmittanceBg(image, x, y)
    pixelCounts[colorOrder[main]] = 1
    for (let i = Math.max(x - 1, 0); i < Math.min(x + 1, w) + 1; i++) {
        for (let j = Math.max(y - 1, 0); j < Math.min(y + 1, h) + 1; j++) {
            const c = getCFAValue(cfa, i, j)
            if (c !== main) {
                color[colorOrder[c]] += getTransmittanceBg(image, i, j)
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

function getTransmittanceTrich(
    images: Trich<RawImage>,
    color: Primary,
    x: number,
    y: number
): number {
    const w = images.R.width
    const im = images[color].image
    const bg = images[bgMap[color]].image
    return (
        (im[x + y * w] - BLACK) /
        (bg[x + y * w] - BLACK) /
        EXPFAC[colorOrder[color]]
    )
}

function getColorValueTrich(
    images: Trich<RawImage>,
    cfa: CFA,
    x: number,
    y: number
): { main: Primary; color: Triple } {
    const w = images.R.width,
        h = images.G.height
    let color: Triple = [0, 0, 0]
    let pixelCounts: Triple = [1, 1, 1]
    const main = getCFAValue(cfa, x, y)
    color[colorOrder[main]] = getTransmittanceTrich(images, main, x, y)
    pixelCounts[colorOrder[main]] = 1
    for (let i = Math.max(x - 1, 0); i < Math.min(x + 1, w) + 1; i++) {
        for (let j = Math.max(y - 1, 0); j < Math.min(y + 1, h) + 1; j++) {
            const c = getCFAValue(cfa, i, j)
            if (c !== main) {
                color[colorOrder[c]] += getTransmittanceTrich(images, c, i, j)
                pixelCounts[colorOrder[c]]++
            }
        }
    }
    color[0] /= pixelCounts[0]
    color[1] /= pixelCounts[1]
    color[2] /= pixelCounts[2]
    return { main, color }
}

export function convertTrichrome(
    trichImages: Trich<ProcessedSingle>
): ProcessedTrichrome {
    const N = trichImages.R.image.length / 4
    const out = new Uint16Array(N * 4)
    const max = 2 ** 14
    for (let i = 0; i < N; i++) {
        const r =
            trichImages.R.image[i * 4] +
            trichImages.R.image[i * 4 + 1] +
            trichImages.R.image[i * 4 + 2]
        const g =
            trichImages.G.image[i * 4] +
            trichImages.G.image[i * 4 + 1] +
            trichImages.G.image[i * 4 + 2]
        const b =
            trichImages.B.image[i * 4] +
            trichImages.B.image[i * 4 + 1] +
            trichImages.B.image[i * 4 + 2]

        const br =
            trichImages.BR.image[i * 4] +
            trichImages.BR.image[i * 4 + 1] +
            trichImages.BR.image[i * 4 + 2]
        const bg =
            trichImages.BG.image[i * 4] +
            trichImages.BG.image[i * 4 + 1] +
            trichImages.BG.image[i * 4 + 2]
        const bb =
            trichImages.BB.image[i * 4] +
            trichImages.BB.image[i * 4 + 1] +
            trichImages.BB.image[i * 4 + 2]

        out[i * 4 + 0] = clamp((r / (br * EXPFAC[0])) * max, 0, max)
        out[i * 4 + 1] = clamp((g / (bg * EXPFAC[1])) * max, 0, max)
        out[i * 4 + 2] = clamp((b / (bb * EXPFAC[2])) * max, 0, max)
        out[i * 4 + 3] = 65535
    }
    return {
        ...trichImages.R,
        filenames: mapTrich((x) => x.filename, trichImages),
        files: mapTrich((x) => x.file, trichImages),
        image: out,
        wb_coeffs: [1, 1, 1, 1],
        kind: "trichrome",
    }
}

export function convertWithBackground(
    background: ProcessedSingle,
    image: ProcessedSingle
): ProcessedDensity {
    const N = image.image.length / 4
    const out = new Uint16Array(N * 4)
    const max = 2 ** 14
    for (let i = 0; i < N; i++) {
        out[i * 4 + 0] = clamp(
            (image.image[i * 4 + 0] /
                (background.image[i * 4 + 0] * EXPFACSINGLE)) *
                max,
            0,
            max
        )
        out[i * 4 + 1] = clamp(
            (image.image[i * 4 + 1] /
                (background.image[i * 4 + 1] * EXPFACSINGLE)) *
                max,
            0,
            max
        )
        out[i * 4 + 2] = clamp(
            (image.image[i * 4 + 2] /
                (background.image[i * 4 + 2] * EXPFACSINGLE)) *
                max,
            0,
            max
        )
        out[i * 4 + 3] = 65535
    }
    return {
        ...image,
        image: out,
        filename: image.filename,
        file: image.file,
        bg_filename: background.filename,
        bg_file: background.file,
        kind: "density",
    }
}

function pte_curve(x: number, sets: LutSets): number {
    const [m, b, d, x1] = sets
    const x0 = x1 + d
    if (x >= x0) {
        return m * x + b
    } else if (x > x1) {
        return m * (2.0 * x0 - x1 - ((x0 - x1) * (x0 - x1)) / (x - x1)) + b
    } else {
        return -1000
    }
}

function paper_to_exp(color: Triple): Triple {
    return [
        pte_curve(color[0], lutSets[0]),
        pte_curve(color[1], lutSets[1]),
        pte_curve(color[2], lutSets[2]),
    ]
}

function procesValueColor(
    color: Triple,
    primary: Primary,
    mult: number,
    factor: Triple,
    exponent: Triple
): number {
    // Camera raw to output (sRGB)
    const j = colorOrder[primary]
    // let cb = [0, 0, 0]

    // cb[0] = (color[0] - 1016) / 16384
    // cb[1] = (color[1] - 1016) / 16384
    // cb[2] = (color[2] - 1016) / 16384
    // if (log) console.log(main, color)

    // // Change colorspace
    // const m = matrix.matrix
    // let out = m[j * 3] * cb[0] + m[j * 3 + 1] * cb[1] + m[j * 3 + 2] * cb[2]
    // if (log) console.log(out)

    // const inv = (out * factor[j]) ** -exponent[j]

    // if (log) console.log(main, "inverted 01: ", inv)

    // TEST: methode van bw chart

    // const m = cam_to_APD2.matrix

    // const APD =
    //     m[3 * j] * cam_log[0] +
    //     m[3 * j + 1] * cam_log[1] +
    //     m[3 * j + 2] * cam_log[2]

    const cam_log = mapTriple(Math.log10, color)
    const APD = applyCMV(cam_to_APD2, cam_log)
    const exp = paper_to_exp(APD)
    const inv = mapTriple((x) => 0.2823561717 * 2 ** x, exp)
    const out = applyCMV(sRGB_to_cam, inv)[j] / mult
    // const out = inv[colorOrder[main]]
    // return clamp(Math.round(out * 16384 + BLACK), 0, 16383)
    return clamp(out, 0, 1) * 16384
}

function processColorValueBw(
    colorValue: number,
    conversionValues: {
        m: number
        b: number
        d: number
        dmin: number
        wb_coeff: number
    }
): number {
    const { m, b, d, dmin, wb_coeff } = conversionValues
    const density = -Math.log10(colorValue)
    const exp = pte_curve(density, [m, b, d, dmin])
    const rawValue = 2 ** exp / wb_coeff
    return clamp(rawValue * 16384 + BLACK, 0, 16384)
}

function getColorValue(
    image: LoadedImage | Bg<LoadedImage> | Trich<LoadedImage>,
    x: number,
    y: number
): { main: Primary; color: Triple } {
    if ("R" in image) {
        return getColorValueTrich(image, image.R.cfa, x, y)
    } else if ("background" in image) {
        return getColorValueBg(image, image.image.cfa, x, y)
    } else {
        return getColorValueSingle(image, image.cfa, x, y)
    }
}

function invertRawColor(
    image: LoadedImage | Bg<LoadedImage> | Trich<LoadedImage>,
    settings: Settings
): Uint16Array {
    let w: number, h: number
    let wb_coeffs: number[]
    if ("R" in image) {
        // Trichrome
        w = image.R.width
        h = image.R.height
        wb_coeffs = image.R.wb_coeffs
    } else if ("background" in image) {
        w = image.image.width
        h = image.image.height
        wb_coeffs = image.image.wb_coeffs
    } else {
        w = image.width
        h = image.height
        wb_coeffs = image.wb_coeffs
    }

    const wb: Triple = [
        wb_coeffs[0] / wb_coeffs[1] / 2,
        1,
        wb_coeffs[2] / wb_coeffs[1] / 2,
    ]
    console.log("wb", wb)
    const { factor, exponent } = calculateConversionValues(settings, "normal")
    let out = new Uint16Array(w * h)

    for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
            const { main, color } = getColorValue(image, i, j)
            const mult = wb[colorOrder[main]]
            out[i + j * w] = procesValueColor(
                color,
                main,
                mult,
                factor,
                exponent
            )
        }
    }
    return out
}

// Tijdelijke colorramp functies
function cmap(i: number): number {
    return (i / 6384) * (16384 - BLACK)
}

function cmap2(i: number): number {
    return (i / 6384) ** 4 * (16384 - BLACK)
}

function invertRawBW(
    image: LoadedImage | Bg<LoadedImage> | Trich<LoadedImage>,
    settings: Settings
): Uint16Array {
    if ("R" in image) {
        throw new Error("BW not implemented for trichrome")
    }
    const withBackground = "background" in image
    const [w, h] = withBackground
        ? [image.image.width, image.image.height]
        : [image.width, image.height]
    const cfa = withBackground ? image.image.cfa : image.cfa

    const { m, b, d, dmin } = getConversionValuesBw(settings)
    let wb = withBackground ? image.image.wb_coeffs : image.wb_coeffs
    console.log("wb2", wb)
    const white_balance = [wb[0] / wb[1], 1, wb[2] / wb[1]]
    const out = new Uint16Array(w * h)
    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            const primary = getCFAValue(cfa, i, j)
            const colorIndex = colorOrder[primary]
            const color_value = withBackground
                ? getTransmittanceBg(image, i, j)
                : image.image[i + j * w]
            // out[i + j * w] = (cmap2(i) / white_balance[colorIndex]) + BLACK

            out[i + j * w] = 3000
            out[i + j * w] = processColorValueBw(color_value, {
                m,
                b,
                d,
                dmin: dmin[colorIndex],
                wb_coeff: white_balance[colorIndex],
            })
        }
    }

    return out
}

export function invertRaw(
    image: LoadedImage | Bg<LoadedImage> | Trich<LoadedImage>,
    settings: Settings
): Uint16Array {
    if (settings.mode == "bw") {
        return invertRawBW(image, settings)
    } else {
        return invertRawColor(image, settings)
    }
}

function to_color(x: number[]): Triple {
    return [x[0], x[1], x[2]]
}

function calculateConversionValues(
    settings: Settings,
    kind: "normal" | "trichrome" | "density"
): {
    factor: Triple
    exponent: Triple
    dmin: Triple
} {
    const s = settings.advanced

    const gamma = [s.gamma, s.gamma * s.facG, s.gamma * s.facB]
    const exponent: Triple = [
        1 / (gamma[0] * 1.818181),
        1 / (gamma[1] * 1.818181),
        1 / (gamma[2] * 1.818181),
    ]

    const dminCam: Triple = [
        s.dmin[0] / 2 ** 14,
        s.dmin[1] / 2 ** 14,
        s.dmin[2] / 2 ** 14,
    ]
    const dminAPD = to_color(applyMatrixVector(dminCam, cam_to_APD))

    const neutralTargetsRGB = [
        0.5 * 2 ** s.exposure,
        0.5 * 2 ** s.exposure * s.green,
        0.5 * 2 ** s.exposure * s.blue,
    ]
    console.log("neutralTargetsRGB", neutralTargetsRGB)
    const neutralTargetLogE = [
        Math.log10(applyMatrixVector(neutralTargetsRGB, sRGB_to_EXP)[0]),
        Math.log10(applyMatrixVector(neutralTargetsRGB, sRGB_to_EXP)[1]),
        Math.log10(applyMatrixVector(neutralTargetsRGB, sRGB_to_EXP)[2]),
    ]
    const selectedNeutralCam: Triple = [
        s.neutral[0] / 2 ** 14,
        s.neutral[1] / 2 ** 14,
        s.neutral[2] / 2 ** 14,
    ]
    const selectedNeutralAPD = applyMatrixVector(selectedNeutralCam, cam_to_APD)
    const selectedNeutralDensD = [
        -Math.log10(selectedNeutralAPD[0] / dminAPD[0]),
        -Math.log10(selectedNeutralAPD[1] / dminAPD[1]),
        -Math.log10(selectedNeutralAPD[2] / dminAPD[2]),
    ]
    const selectedNeutralDensI = applyMatrixVector(
        selectedNeutralDensD,
        cdd_to_cid
    )

    console.log("selectedNeutralCam", selectedNeutralCam)
    console.log("dminCam", dminCam)
    console.log("selectedNeutralDensD", selectedNeutralDensD)
    console.log("selectedNeutralDensI", selectedNeutralDensI)

    const selectedNeutralLogE = [
        exponent[0] * (1.818181 * selectedNeutralDensI[0] - 2.0174547676239),
        exponent[1] * (1.818181 * selectedNeutralDensI[1] - 2.0174547676239),
        exponent[2] * (1.818181 * selectedNeutralDensI[2] - 2.0174547676239),
    ]
    // const a = 2.0174547676239669
    // const exposure = [
    //     a - s.exposure,
    //     a - s.exposure * s.green,
    //     a - s.exposure * s.blue,
    // ]
    // const factor: Triple = [
    //     10 ** -exposure[0],
    //     10 ** -exposure[1],
    //     10 ** -exposure[2],
    // ]
    const factor: Triple = [
        neutralTargetLogE[0] - selectedNeutralLogE[0],
        neutralTargetLogE[1] - selectedNeutralLogE[1],
        neutralTargetLogE[2] - selectedNeutralLogE[2],
    ]
    console.log({ exponent: exponent, factor: factor, dmin: dminAPD })
    return { exponent: exponent, factor: factor, dmin: dminAPD }
}

export function getRotationMatrix(rotationValue: number): Matrix {
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
    rot: Matrix
): [number, number] {
    const a = applyMatrixVector([2 * x - 1, 2 * y - 1], rot)
    return [(a[0] + 1) / 2, (a[1] + 1) / 2]
}

export function applyRotationAndZoom(
    x: number,
    y: number,
    rot: Matrix,
    zoom: [number, number, number, number]
): [number, number] {
    // [0, 1] -> [0, 1]
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
    fragment_shader: string,
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
        if (!loc) {
            throw new Error("Could not find uniform " + name)
        }
        f.apply(gl, [loc, ...data])
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6) // execute program
}

const m = 0.97196409570708564
const b1 = 7.7569813579659606 - 8.0
const x1 = -2.7564270485348357
const x2 = 3.2564838780152452
const a = 5.1823082903070744e-18
const b = -0.080823091143373382
const c = 0.52639818655950421
const d = 7.1428963960262566 - 8.0

function ets_curve(x: number): number {
    if (x < x1) {
        return b1 + m * x
    } else if (x < x2) {
        return a * x * x * x + b * x * x + c * x + d
    } else {
        return 0.0
    }
}

function _processColor(color: Triple): Triple {
    const c = mapTriple((x) => x / 16384, color)
    const r1 = procesValueColor(c, "R", 1, [1, 1, 1], [1, 1, 1]) - BLACK
    const g1 = procesValueColor(c, "G", 1, [1, 1, 1], [1, 1, 1]) - BLACK
    const b1 = procesValueColor(c, "B", 1, [1, 1, 1], [1, 1, 1]) - BLACK
    return [r1, g1, b1]
}

function rawConvertMock(color: Triple): Triple {
    const raw = color.map((x) => x / 16384)
    const FC = applyMatrixVector(raw, cam_to_sRGB)
    const [r, g, b] = FC.map(
        (x) => 16384 * 2 ** ets_curve(Math.log2(x / 0.2823561717))
    )
    return [r, g, b]
}

function get_shader_params_color(
    gl: WebGL2RenderingContext,
    settings: Settings,
    kind: "normal" | "trichrome" | "density"
): WebGLArgument<any[]>[] {
    const [matr1, matr2, matr3] = [
        transpose(cam_to_APD2),
        transpose(cam_to_sRGB),
        transpose(sRGB_to_cam),
    ]

    const { factor, exponent, dmin } = calculateConversionValues(settings, kind)
    console.log(factor, exponent, dmin)

    const parameters: WebGLArgument<any[]>[] = [
        {
            name: "toe",
            f: gl.uniform1i,
            data: [settings.advanced.toe === true ? 1 : 0],
        },
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
        // {
        //     name: "matrix3",
        //     f: gl.uniformMatrix3fv,
        //     data: [false, matr3.matrix],
        // },
        // {
        //     name: "trichrome",
        //     f: gl.uniform1i,
        //     data: [image.type == "trichrome" ? 1 : 0],
        // },
        // { name: "fac", f: gl.uniform3f, data: factor },
        // { name: "exponent", f: gl.uniform3f, data: exponent },
        // { name: "dmin", f: gl.uniform3f, data: dmin },
    ]
    return parameters
}

function getConversionValuesBw(settings: Settings): ConversionValuesBw {
    const dmin = mapTriple(
        (x) => -Math.log10(x / 2 ** 14) + settings.bw.blackpoint_shift,
        settings.bw.blackpoint
    )
    console.log("dmin", dmin)
    const m = 1 / (settings.bw.gamma * Math.log10(2))
    console.log("m", m)
    const d = settings.bw.toe_width
    console.log("d", d)

    const neutralDensity = dmin[1] + 0.82
    const b = settings.bw.exposure - m * neutralDensity
    console.log("exposure", settings.bw.exposure)
    console.log("b", b)
    return { m, b, d, dmin }
}

function get_shader_params_bw(
    gl: WebGL2RenderingContext,
    settings: Settings,
    kind: "normal" | "trichrome" | "density"
): WebGLArgument<any[]>[] {
    console.log("kind", kind)
    if (kind == "trichrome") {
        throw new Error("BW not supported for trichrome")
    } else if (kind == "normal") {
        throw new Error("BW not supported for normal")
    } else {
        const { m, b, d, dmin } = getConversionValuesBw(settings)
        return [
            {
                name: "density",
                f: gl.uniform1i,
                data: [1],
            },
            {
                name: "toe",
                f: gl.uniform1i,
                data: [settings.bw.toe === true ? 1 : 0],
            },
            { name: "m", f: gl.uniform1f, data: [m] },
            { name: "b", f: gl.uniform1f, data: [b] },
            { name: "d", f: gl.uniform1f, data: [d] },
            { name: "dmin", f: gl.uniform3f, data: dmin },
        ]
    }
}

function test_prepare_image(im: Uint16Array): Uint16Array {
    const img = new Uint16Array(im.length)
    for (let i = 0; i < img.length; i += 4) {
        const color: Triple = [im[i], im[i + 1], im[i + 2]]
        // const c = color.map((x) => Math.log10(x / 16384))
        // const [r, g, b] = applyMatrixVector(c, cam_to_APD2)
        // const E = [
        //     paper_to_exp(r, lutSets[0]),
        //     paper_to_exp(g, lutSets[1]),
        //     paper_to_exp(b, lutSets[2]),
        // ]

        // const Rs = E.map((x) => 0.28235617170 * 2 ** x)
        // const R = applyMatrixVector(Rs, sRGB_to_cam)

        // const out = R.map((x) => clamp(x, 0, 1) * 16384)
        // const c = mapTriple((x) => x / 16384, color)
        // const out: Triple = [r, g, b]
        const out: Triple = mapTriple((x) => x / 16384, color)
        img[i] = procesValueColor(out, "R", 1, [0, 0, 0], [0, 0, 0])
        img[i + 1] = procesValueColor(out, "G", 1, [0, 0, 0], [0, 0, 0])
        img[i + 2] = procesValueColor(out, "B", 1, [0, 0, 0], [0, 0, 0])
    }
    return img
}

export function draw(gl: WebGL2RenderingContext, image: ProcessedImage) {
    if (!gl) console.log("No gl")

    const w = image.width
    const h = image.height
    // const img = image.image
    const im = image.image
    // const img = test_prepare_image(im)
    const img = im

    const rot = image.settings.rotationMatrix.matrix
    const zoom = image.settings.zoom

    const mode = image.settings.mode
    const shader = mode == "bw" ? fragment_bw : fragment_color
    const fragment_parameters =
        mode == "bw"
            ? get_shader_params_bw(gl, image.settings, image.kind)
            : get_shader_params_color(gl, image.settings, image.kind)

    const parameters: WebGLArgument<any[]>[] = [
        { name: "rot", f: gl.uniformMatrix2fv, data: [false, rot] },
        { name: "scale", f: gl.uniform2f, data: [zoom[0] / 2, zoom[1] / 2] },
        { name: "trans", f: gl.uniform2f, data: [zoom[2], zoom[3]] },
        ...fragment_parameters,
    ]

    webglDraw(gl, img, w, h, shader, parameters)
}

export const defaultSettings: Settings = {
    mode: "advanced",
    rotation: 0,
    rotationMatrix: { matrix: [1, 0, 0, 1], m: 2, n: 2 },
    zoom: [1, 1, 0, 0],
    advanced: {
        toe: false,
        dmin: [7662, 2939, 1711],
        neutral: [3300, 730, 320],
        exposure: 0,
        blue: 1,
        green: 1,
        gamma: 55 / 100,
        facB: 1 / 0.95,
        facG: 1 / 0.92,
    },
    bw: {
        toe: true,
        blackpoint: [6583, 6583, 6583],
        exposure: 0,
        gamma: 68 / 100,
        toe_width: 0.2,
        blackpoint_shift: 0,
    },
}
