import { identity } from "./matrices"
import type { ColorMatrix, Matrix, Triple } from "./utils"
// @ts-ignore
import LibRaw from "libraw-wasm"

export interface RawConvSettings {
    gain: [number, number, number]
    black: [number, number, number]
    background: [number, number, number]
}

export interface RawImage {
    arr: Uint16Array // RAW
    width: number
    height: number
}

export interface Image {
    file: File
    large: RawImage
    small: RawImage
    raw_conv_settings: RawConvSettings
    settings: Settings
    iter: number
}

export type TCName = "Default" | "Filmic" | "Filmic2"

export interface Settings {
    mode: "advanced" | "basic" | "bw"
    rotation: number
    rotationMatrix: Matrix
    zoom: [number, number, number, number]
    show_clipping: boolean
    show_negative: boolean
    shown_value?: number
    tone_curve: TCName
    matrix1: ColorMatrix
    matrix2: ColorMatrix
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
    shown_value: 0,
    tone_curve: "Default",
    matrix1: identity,
    matrix2: identity,
    advanced: {
        toe: true,
        dmin: [6829, 3406, 1956],
        neutral: [1458, 562, 329],
        exposure: 1.35,
        blue: -0.17,
        green: -0.14,
        gamma: 0.40375526,
        facB: 1.075,
        facG: 1.06875,
        toe_width: 0.1,
        toe_facB: 1.7,
        toe_facG: 1.4,
    },
    bw: {
        toe: true,
        blackpoint: [4837, 4874, 5337],
        exposure: -0.5,
        gamma: 77 / 100,
        toe_width: 0.22,
        blackpoint_shift: 0,
    },
}

const libraw_settings = {
    outputColor: 0,
    gamm: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    noAutoBright: 1,
    useCameraWb: false,
    useAutoWb: false,
    highlight: 0,
    fbddNoiserd: 0,
    userFlip: 0,
    outputBps: 16,
}

export async function read_raw(file: File): Promise<RawImage> {
    const raw = new LibRaw()
    const file_arr = new Uint8Array(await file.arrayBuffer())
    await raw.open(file_arr, libraw_settings)

    // Fetch metadata
    // const meta = await raw.metadata(/* fullOutput=false */)

    const imageData = await raw.imageData()
    console.log(imageData)
    return {
        arr: imageData.data,
        width: imageData.width,
        height: imageData.height,
    }
}

export function buildPreview(image: RawImage, scale: number): RawImage {
    const N = Math.floor(image.width / scale)
    const M = Math.floor(image.height / scale)
    const out = new Uint16Array(N * M * 4)
    for (let y = 0; y < M - 1; y++) {
        for (let x = 0; x < N - 1; x++) {
            let R = 0
            let G = 0
            let B = 0
            for (let j = 0; j < scale; j++) {
                for (let i = 0; i < scale; i++) {
                    R +=
                        image.arr[
                            ((y * scale + j) * image.width + (x * scale + i)) *
                                3 +
                                0
                        ]
                    G +=
                        image.arr[
                            ((y * scale + j) * image.width + (x * scale + i)) *
                                3 +
                                1
                        ]
                    B +=
                        image.arr[
                            ((y * scale + j) * image.width + (x * scale + i)) *
                                3 +
                                2
                        ]
                }
            }

            out[(y * N + x) * 4 + 0] = R / (scale * scale)
            out[(y * N + x) * 4 + 1] = G / (scale * scale)
            out[(y * N + x) * 4 + 2] = B / (scale * scale)
            out[(y * N + x) * 4 + 3] = 65535
        }
    }

    return { arr: out, width: N, height: M }
}

export function initializeImage(
    image: RawImage,
    file: File,
    raw_conv_settings: RawConvSettings
): Image {
    const large = buildPreview(image, 4)
    const small = buildPreview(image, 24)
    console.log("Large preview: ", large.width, large.height)
    console.log("small preview: ", small.width, small.height)
    return {
        file,
        large,
        small,
        raw_conv_settings,
        settings: defaultSettings,
        iter: 0,
    }
}
