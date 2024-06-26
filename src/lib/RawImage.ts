import { single_to_APD } from "./matrices"
import type { BgPrimary, ColorMatrix, Matrix, Primary, Triple } from "./utils"
import { allPromises, bgMap, clamp, colorOrder } from "./utils"

export const BLACK = 1016

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
    expfac: number
}

export interface Trich<T> {
    R: T
    G: T
    B: T
    BR: T
    BG: T
    BB: T
    expfac: Triple
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
        expfac: x.expfac,
    }
}

export async function allPromisesTrich<T>(
    o: Trich<Promise<T>>
): Promise<Trich<T>> {
    const { expfac: _, ...rest } = o
    const resolved = await allPromises(rest)
    return { ...resolved, expfac: o.expfac }
}

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

export interface LoadedSingleImage extends LoadedImage {
    bg_value: Triple
    DR: number
}

export interface LoadedDensity extends Bg<LoadedImage> {
    DR: number
}

export interface LoadedTrichrome extends Trich<LoadedImage> {
    DR: number
}

export interface _LoadedInfo {
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

export interface DeBayeredImage extends _LoadedInfo {
    filename: string
    file: File
}

export interface _ProcessedInfo extends _LoadedInfo {
    // Abstract
    preview: Uint16Array
    preview_width: number
    preview_height: number
    DR: number
}

export interface ProcessedSingle extends _ProcessedInfo {
    filename: string
    file: File
    bg_value: Triple
    kind: "normal"
}

export interface ProcessedDensity extends _ProcessedInfo {
    filename: string
    file: File
    bg_filename: string
    bg_file: File
    expfac: number
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

export type TCName = "Default" | "Filmic"

export interface Settings {
    mode: "advanced" | "basic" | "bw"
    rotation: number
    rotationMatrix: Matrix
    zoom: [number, number, number, number]
    show_clipping: boolean
    show_negative: boolean
    tone_curve: TCName
    matrix: ColorMatrix
    advanced: AdvancedSettings
    bw: BWSettings
}

export interface AdvancedSettings {
    toe: boolean
    dmin: Triple
    neutral: Triple
    exposure: number
    blue: number
    green: number
    gamma: number
    facG: number
    facB: number
    toe_width: number
    toe_facG: number
    toe_facB: number
}

export interface BWSettings {
    toe: boolean
    blackpoint: Triple
    exposure: number
    gamma: number
    toe_width: number
    blackpoint_shift: number
}

export const defaultSettings: Settings = {
    mode: "advanced",
    rotation: 0,
    rotationMatrix: { matrix: [1, 0, 0, 1], m: 2, n: 2 },
    zoom: [1, 1, 0, 0],
    show_clipping: false,
    show_negative: false,
    tone_curve: "Default",
    matrix: single_to_APD,
    advanced: {
        toe: true,
        dmin: [6624, 3054, 1546],
        neutral: [2366, 720, 340],
        exposure: 0,
        blue: 0,
        green: 0,
        // gamma: 0.312,
        // facB: 1.4649359387807215,
        // facG: 1.6522,
        gamma: 0.312*1.3724,
        facB: 1.4649359387807215/1.3724,
        facG: 1.6522/1.3724,
        toe_width: 0.0521,
        toe_facG: 1.786,
        toe_facB: 1.462,
    },
    // bw: {
    //     toe: true,
    //     blackpoint: [6583, 6583, 6583],
    //     exposure: 0,
    //     gamma: 68 / 100,
    //     toe_width: 0.2,
    //     blackpoint_shift: 0,
    // },

    bw: {
        toe: true,
        blackpoint: [4837, 4874, 5337],
        exposure: -0.5,
        gamma: 77 / 100,
        toe_width: 0.22,
        blackpoint_shift: 0,
    },
}

export function buildPreview(image: RawImage): {
    preview: Uint16Array
    preview_width: number
    preview_height: number
} {
    const N = Math.floor(image.width / 8)
    const M = Math.floor(image.height / 8)
    const out = new Uint16Array(N * M * 4)
    for (let y = 0; y < M - 1; y++) {
        for (let x = 0; x < N - 1; x++) {
            let R = 0
            let G = 0
            let B = 0
            for (let j = 0; j < 8; j++) {
                for (let i = 0; i < 8; i++) {
                    R +=
                        image.image[
                            ((y * 8 + j) * image.width + (x * 8 + i)) * 4 + 0
                        ]
                    G +=
                        image.image[
                            ((y * 8 + j) * image.width + (x * 8 + i)) * 4 + 1
                        ]
                    B +=
                        image.image[
                            ((y * 8 + j) * image.width + (x * 8 + i)) * 4 + 2
                        ]
                }
            }

            out[(y * N + x) * 4 + 0] = R / 64
            out[(y * N + x) * 4 + 1] = G / 64
            out[(y * N + x) * 4 + 2] = B / 64
            out[(y * N + x) * 4 + 3] = 65535
        }
    }

    return { preview: out, preview_width: N, preview_height: M }
}

export function getCFAValue(cfa: CFA, x: number, y: number): Primary {
    // Getransponeerde CFA
    let color: Primary
    // Ad hoc fix omdat deMosaic andere offset gebruikt
    const offset = [cfa.offset[0] + 4, cfa.offset[1] - 1]
    const c =
        cfa.str[
            ((y + 6 - offset[1]) % cfa.width) +
                ((x + 6 - offset[0]) % cfa.height) * cfa.width
        ]
    if (c == "R" || c == "G" || c == "B") {
        color = c
    } else {
        throw "Invalid CFA"
    }
    return color
}

function getColorValueSingle(
    image: LoadedSingleImage,
    cfa: CFA,
    x: number,
    y: number
): { main: Primary; color: Triple } {
    const w = image.width,
        h = image.height
    let color: Triple = [0, 0, 0]
    let pixelCounts: Triple = [0, 0, 0]
    const main = getCFAValue(cfa, x, y)
    color[colorOrder[main]] = getTransmittanceNormal(image, main, x, y)
    pixelCounts[colorOrder[main]] = 1
    for (let i = Math.max(x - 1, 0); i < Math.min(x + 1, w) + 1; i++) {
        for (let j = Math.max(y - 1, 0); j < Math.min(y + 1, h) + 1; j++) {
            const c = getCFAValue(cfa, i, j)
            if (c !== main) {
                color[colorOrder[c]] += getTransmittanceNormal(image, c, i, j)
                pixelCounts[colorOrder[c]]++
            }
        }
    }
    color[0] /= pixelCounts[0]
    color[1] /= pixelCounts[1]
    color[2] /= pixelCounts[2]
    return { main, color }
}

export function getTransmittanceNormal(
    image: LoadedSingleImage,
    primary: Primary,
    x: number,
    y: number
) {
    const w = image.width
    const wb_coeffs = image.wb_coeffs
    const wb = [wb_coeffs[0] / wb_coeffs[1], 1, wb_coeffs[2] / wb_coeffs[1]]
    const color_index = colorOrder[primary]
    return (
        ((image.image[x + y * w] - BLACK) * wb[color_index]) /
        image.bg_value[color_index]
    )
}

export function getTransmittanceBg(
    images: Bg<LoadedImage>,
    primary: Primary,
    x: number,
    y: number
): number {
    const color_index = colorOrder[primary]
    const w = images.image.width
    const wbb = images.background.wb_coeffs[color_index]
    const wbi = images.image.wb_coeffs[color_index]
    const wb_factor = wbi / wbb
    return (
        ((images.image.image[x + y * w] - BLACK) /
            (images.background.image[x + y * w] - BLACK) /
            images.expfac) *
        wb_factor
    )
}

function getColorValueBg(
    image: Bg<LoadedImage>,
    cfa: CFA,
    x: number,
    y: number
): { main: Primary; color: Triple } {
    const w = image.image.width,
        h = image.image.height
    let color: Triple = [0, 0, 0]
    let pixelCounts: Triple = [0, 0, 0]
    const main = getCFAValue(cfa, x, y)
    color[colorOrder[main]] = getTransmittanceBg(image, main, x, y)
    pixelCounts[colorOrder[main]] = 1
    for (let i = Math.max(x - 1, 0); i < Math.min(x + 1, w) + 1; i++) {
        for (let j = Math.max(y - 1, 0); j < Math.min(y + 1, h) + 1; j++) {
            const c = getCFAValue(cfa, i, j)
            if (c !== main) {
                color[colorOrder[c]] += getTransmittanceBg(image, c, i, j)
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
    images: Trich<LoadedImage>,
    color: Primary,
    x: number,
    y: number
): number {
    const w = images.R.width
    const im = images[color].image
    const wbim = images[color].wb_coeffs[colorOrder[color]]
    const bg = images[bgMap[color]].image
    const wbbg = images[bgMap[color]].wb_coeffs[colorOrder[color]]

    const expf = images.expfac[colorOrder[color]]
    return (
        ((im[x + y * w] - BLACK) * wbim) /
        ((bg[x + y * w] - BLACK) * wbbg * expf)
    )
}

function getColorValueTrich(
    images: Trich<LoadedImage>,
    cfa: CFA,
    x: number,
    y: number
): { main: Primary; color: Triple } {
    const w = images.R.width,
        h = images.G.height
    let color: Triple = [0, 0, 0]
    let pixelCounts: Triple = [0, 0, 0] // !!!!
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

export function loadSingle(
    image: DeBayeredImage,
    bg_value: Triple,
    DR: number
): ProcessedSingle {
    const N = image.image.length
    const max = 2 ** 14
    const out = new Uint16Array(N)
    for (let i = 0; i < N; i += 4) {
        out[i + 0] = clamp((image.image[i + 0] / bg_value[0]) * max, 0, max)
        out[i + 1] = clamp((image.image[i + 1] / bg_value[1]) * max, 0, max)
        out[i + 2] = clamp((image.image[i + 2] / bg_value[2]) * max, 0, max)
        out[i + 3] = 65535
    }
    const preview = buildPreview({
        image: out,
        width: image.width,
        height: image.height,
    })
    return {
        ...image,
        ...preview,
        DR: DR,
        image: out,
        bg_value,
        kind: "normal",
    }
}

export function loadTrichrome(
    trichImages: Trich<DeBayeredImage>,
    DR: number
): ProcessedTrichrome {
    const N = trichImages.R.image.length / 4
    const out = new Uint16Array(N * 4)
    const max = 2 ** 14
    for (let i = 0; i < N; i++) {
        const r = trichImages.R.image[i * 4]
        const g = trichImages.G.image[i * 4 + 1]
        const b = trichImages.B.image[i * 4 + 2]

        const br = trichImages.BR.image[i * 4]
        const bg = trichImages.BG.image[i * 4 + 1]
        const bb = trichImages.BB.image[i * 4 + 2]

        out[i * 4 + 0] = clamp((r / (br * trichImages.expfac[0])) * max, 0, max)
        out[i * 4 + 1] = clamp((g / (bg * trichImages.expfac[1])) * max, 0, max)
        out[i * 4 + 2] = clamp((b / (bb * trichImages.expfac[2])) * max, 0, max)
        out[i * 4 + 3] = 65535
    }

    const preview = buildPreview({
        image: out,
        width: trichImages.R.width,
        height: trichImages.R.height,
    })

    return {
        ...trichImages.R,
        ...preview,
        DR,
        filenames: mapTrich((x) => x.filename, trichImages),
        files: mapTrich((x) => x.file, trichImages),
        image: out,
        wb_coeffs: [1, 1, 1, 1],
        kind: "trichrome",
    }
}

export function loadWithBackground(
    images: Bg<DeBayeredImage>,
    DR: number
): ProcessedDensity {
    const { image, background, expfac } = images

    const N = image.image.length
    const out = new Uint16Array(N)
    const max = 2 ** 14
    for (let i = 0; i < N; i += 4) {
        out[i + 0] = clamp(
            (image.image[i + 0] / background.image[i + 0] / expfac) * max,
            0,
            max
        )
        out[i + 1] = clamp(
            (image.image[i + 1] / background.image[i + 1] / expfac) * max,
            0,
            max
        )
        out[i + 2] = clamp(
            (image.image[i + 2] / background.image[i + 2] / expfac) * max,
            0,
            max
        )
        out[i + 3] = 65535
    }
    const preview = buildPreview({
        image: out,
        width: image.width,
        height: image.height,
    })
    return {
        ...image,
        ...preview,
        DR,
        image: out,
        filename: image.filename,
        file: image.file,
        bg_filename: background.filename,
        bg_file: background.file,
        expfac,
        kind: "density",
    }
}

export function getColorValue(
    image: LoadedSingleImage | LoadedDensity | LoadedTrichrome,
    x: number,
    y: number
): { main: Primary; color: Triple } {
    if ("R" in image) {
        return getColorValueTrich(image, image.R.cfa, x, y)
    } else if ("background" in image) {
        //     return getColorValueBg(image, image.image.cfa, x, y)
        return getColorValueBg(image, image.image.cfa, x, y)
    } else {
        return getColorValueSingle(image, image.cfa, x, y)
    }
}
