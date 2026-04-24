import { identity } from "./matrices"
import type { ColorMatrix, Matrix, Triple } from "./utils"
//@ts-ignore
import LibRaw from "libraw-wasm"
// import LibRaw from "/Users/rvandenbroec/Documents/LibRaw-Wasm"

export interface RawConvSettings {
    gain: [number, number, number]
    black: [number, number, number]
    background: [number, number, number]
    max: number
}

export interface RawImage {
    arr: Uint16Array // RAW
    width: number
    height: number
    channels: 3 | 4
}

export interface Image {
    file: File
    large: RawImage
    small: RawImage
    raw_conv_settings: RawConvSettings
    settings: Settings
    iter: number
}

export type TCName = "Default" | "None" | "Filmic" | "Filmic2"

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
    dmin: [number, number, number]
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
        dmin: [6829/2**14, 3406/2**14, 1956/2**14],
        neutral: [0.1633474, 0.0668805, 0.0436712],
        exposure: 0,
        blue: 0,
        green: 0,
        // gamma: 0.40375526,
        // facB: 1.075,
        // facG: 1.06875,
        gamma: 0.3814546973905106,
        facB: 1.085394120130381,
        facG: 1.04195592179697 ,
        toe_width: 0.1,
        toe_facB: 1.7,
        toe_facG: 1.4,
    },
    bw: {
        toe: true,
        dmin: [6829/2**14, 3406/2**14, 1956/2**14],
        exposure: -0.5,
        gamma: 77 / 100,
        toe_width: 0.22,
        blackpoint_shift: 0,
    },
}

const libraw_settings = {
    outputColor: 0,
    gamm: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    noAutoBright: true,
    useCameraWb: false,
    useAutoWb: false,
    highlight: 0,
    fbddNoiserd: 0,
    userFlip: 0,
    outputBps: 16,
    noAutoScale: 1,
    userBlack: 0,
}

export async function read_rgb(file: File): Promise<RawImage> {
    let arr = new Uint16Array(await file.arrayBuffer())
    let width = arr.slice(0, 2)[0]
    let height = arr.slice(2, 4)[0]
    let image = arr.slice(4, arr.length)
    console.log("Read image: ", width, height)
    return {
        arr: image,
        width,
        height,
        channels: 3,
    }
}

export async function read_raw(file: File): Promise<RawImage> {
    const raw = new LibRaw()
    const file_arr = new Uint8Array(await file.arrayBuffer())
    // @ts-ignore
    await raw.open(file_arr, libraw_settings)
    // Fetch metadata
    // const meta = await raw.metadata(/* fullOutput=false */)
    const rawData: any = await raw.rawData()
    console.log(rawData)
    return {
        arr: rawData.data,
        width: rawData.width,
        height: rawData.height,
        channels: 3,
    }
}

export async function read_and_demoisaic_raw(file: File): Promise<RawImage> {
    const raw = new LibRaw()
    const file_arr = new Uint8Array(await file.arrayBuffer())
    // @ts-ignore
    await raw.open(file_arr, libraw_settings)
    // Fetch metadata
    // const meta: any = await raw.metadata(true)
    // console.log(meta.color_data.xtrans_pattern)

    const imageData: any = await raw.imageData()
    console.log(imageData)
    return {
        arr: imageData.data,
        width: imageData.width,
        height: imageData.height,
        channels: 3,
    }
}

export interface CFA {
    str: string
    width: number
    height: number
    offset: [number, number]
}

export function downSample(image: RawImage, scale: number): RawImage {
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
                                image.channels +
                                0
                        ]
                    G +=
                        image.arr[
                            ((y * scale + j) * image.width + (x * scale + i)) *
                                image.channels +
                                1
                        ]
                    B +=
                        image.arr[
                            ((y * scale + j) * image.width + (x * scale + i)) *
                                image.channels +
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

    return { arr: out, width: N, height: M, channels: 4 }
}
