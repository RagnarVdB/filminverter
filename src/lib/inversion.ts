import type {
    AdvancedSettings,
    BWSettings,
    Image,
    RawConvSettings,
    RawImage,
    Settings,
    TCName,
} from "./RawImage"
import luts from "./luts"
import type { ColorMatrix, Triple } from "./utils"
import { applyCMV, clamp, mapTriple } from "./utils"
// @ts-ignore
import linear from "linear-solve"

interface ConversionValuesColor {
    m: Triple
    b: Triple
    d: Triple
    dmin: Triple
    invert_toe: boolean
    matrix1: ColorMatrix
    matrix2: ColorMatrix
}
interface ConversionValuesBw {
    m: number
    b: Triple
    d: number
    dmin: Triple
    invert_toe: boolean
}

export type FileType = "png" | "jpg" | "tiff" | "dng"
export const output_types: Record<
    string,
    {
        name: string
        filetype: FileType
        linear: boolean
        bit_depth: 8 | 16 | 32
        channels: 3 | 4
        little_endian: boolean
    }
> = {
    png16: {
        name: "16-bit PNG",
        filetype: "png",
        linear: false,
        bit_depth: 16,
        channels: 3,
        little_endian: true,
    },
    png8: {
        name: "8-bit PNG",
        filetype: "png",
        linear: false,
        bit_depth: 8,
        channels: 3,
        little_endian: true,
    },
    tiff32: {
        name: "32-bit Tiff",
        filetype: "tiff",
        linear: true,
        bit_depth: 32,
        channels: 3,
        little_endian: false,
    },
    tiff16: {
        name: "16-bit Tiff",
        filetype: "tiff",
        linear: false,
        bit_depth: 16,
        channels: 3,
        little_endian: false,
    },
    tiff8: {
        name: "8-bit Tiff",
        filetype: "tiff",
        linear: false,
        bit_depth: 8,
        channels: 3,
        little_endian: false,
    },
    dng_dem16: {
        name: "16-bit linear DNG",
        filetype: "dng",
        linear: true,
        bit_depth: 16,
        channels: 3,
        little_endian: false,
    },
}
export type OutputType = keyof typeof output_types
export type OutputResolution = 1 | 2 | 4

type LutSets = [number, number, number, number]

function pteCurve(x: number, sets: LutSets): number {
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

export const tc_map: Record<
    TCName,
    { name: string; exp_shift: number; LUT: number[] | null }
> = {
    Default: { name: "Default", exp_shift: 0, LUT: luts.Default },
    None: { name: "None", exp_shift: 0, LUT: null },
    Filmic: { name: "Filmic", exp_shift: 1, LUT: luts.Filmic },
    Filmic2: { name: "Filmic 2", exp_shift: 2, LUT: luts.Filmic2 },
}

export function applyLUT(x: number, LUT: number[] | null): number {
    if (!LUT) {
        return x
    }
    const index = Math.floor(clamp(x, 0, 1) * 255)
    return LUT[index]
}

function sRGBGamma(x: number) {
    if (x <= 0.0031308) {
        return 12.92 * x
    } else {
        return 1.055 * x ** (1.0 / 2.4) - 0.055
    }
}

export function getConversionValuesColor(
    settings: AdvancedSettings,
    matrix1: ColorMatrix,
    matrix2: ColorMatrix
): ConversionValuesColor {
    const gamma: Triple = [
        settings.gamma * (3 - settings.facG - settings.facB),
        settings.gamma * settings.facG,
        settings.gamma * settings.facB,
    ]
    console.debug(gamma)
    console.debug(settings.dmin)
    const m = mapTriple((x) => 1 / (x * Math.log10(2)), gamma)
    const dminAPD = mapTriple(
        (x) => -Math.log10(x),
        applyCMV(
            matrix1,
            mapTriple((x) => x / 2 ** 14, settings.dmin)
        )
    )

    const d: Triple = [
        settings.toe_width,
        settings.toe_width * settings.toe_facG,
        settings.toe_width * settings.toe_facB,
    ]
    console.debug("d=", d)
    const target_neutral_EXP1: Triple = [
        -3 + settings.exposure,
        -3 + settings.exposure + settings.green,
        -3 + settings.exposure + settings.blue,
    ]
    const matrix2_arr = [
        matrix2.matrix.slice(0, 3),
        matrix2.matrix.slice(3, 6),
        matrix2.matrix.slice(6, 9),
    ]
    const target_neutral_EXP = linear
        .solve(
            matrix2_arr,
            target_neutral_EXP1.map((x) => 2 ** x)
        )
        .map((x: number) => Math.log2(x))
    console.debug("exposure=", [
        settings.exposure,
        settings.exposure + settings.green,
        settings.exposure + settings.blue,
    ])
    const selected_neutral_cam = settings.neutral
    console.debug("selected_neutral_cam=", selected_neutral_cam)

    const selected_neutral_APD = mapTriple(
        (x) => -Math.log10(x),
        applyCMV(
            matrix1,
            mapTriple((x) => x / 2 ** 14, selected_neutral_cam)
        )
    )
    console.debug("target_neutral_EXP=", target_neutral_EXP)
    console.debug("selected_neutral_APD=", selected_neutral_APD)
    // ms+b=t
    // b = t - ms
    const b: Triple = [
        target_neutral_EXP[0] - m[0] * selected_neutral_APD[0],
        target_neutral_EXP[1] - m[1] * selected_neutral_APD[1],
        target_neutral_EXP[2] - m[2] * selected_neutral_APD[2],
    ]
    console.debug({ m, b, d, dmin: dminAPD })
    return {
        m,
        b,
        d,
        dmin: dminAPD,
        invert_toe: settings.toe,
        matrix1,
        matrix2,
    }
}

export function process_color_value(
    color: Triple,
    raw_conv_settings: RawConvSettings,
    conversion_values: ConversionValuesColor,
    exp_shift: number,
    lut: number[] | null,
    apply_clamp: boolean
): Triple {
    const { m, b, d, dmin, invert_toe, matrix1, matrix2 } = conversion_values
    const { black, gain, background, max } = raw_conv_settings
    const linear_in: Triple = [
        ((color[0] / max - black[0]) * gain[0]) / background[0],
        ((color[1] / max - black[1]) * gain[1]) / background[1],
        ((color[2] / max - black[2]) * gain[2]) / background[2],
    ]
    const APD = mapTriple((x) => -Math.log10(x), applyCMV(matrix1, linear_in))
    let exp: Triple
    if (invert_toe) {
        exp = applyCMV(matrix2, [
            pteCurve(APD[0], [m[0], b[0], d[0], dmin[0]]),
            pteCurve(APD[1], [m[1], b[1], d[1], dmin[1]]),
            pteCurve(APD[2], [m[2], b[2], d[2], dmin[2]]),
        ])
    } else {
        exp = applyCMV(matrix2, [
            m[0] * APD[0] + b[0],
            m[1] * APD[1] + b[1],
            m[2] * APD[2] + b[2],
        ])
    }
    const linear_out = mapTriple(
        (x) => applyLUT(2 ** (x - exp_shift), lut),
        exp
    )
    if (apply_clamp) return mapTriple((x) => Math.min(x, 1), linear_out)
    else return linear_out
}

export function invertColor(
    im: RawImage,
    raw_conv_settings: RawConvSettings,
    inversion_settings: Settings,
    channels_in: 3 | 4,
    channels_out: 3 | 4,
    bit_depth: 8 | 16 | 32,
    linear: boolean,
    little_endian: boolean
): ArrayBuffer {
    const conversion_values = getConversionValuesColor(
        inversion_settings.advanced,
        inversion_settings.matrix1,
        inversion_settings.matrix2
    )
    const { LUT, exp_shift } = tc_map[inversion_settings.tone_curve]
    const byte_depth = bit_depth / 8
    const buffer = new ArrayBuffer(
        im.width * im.height * channels_out * byte_depth
    )
    const view = new DataView(buffer)
    const [setter, max] = (() => {
        if (bit_depth == 8) return [view.setUint8.bind(view), 255]
        else if (bit_depth == 16) return [view.setUint16.bind(view), 65535]
        else return [view.setFloat32.bind(view), 1.0]
    })()

    let j = 0
    for (let i = 0; i < im.arr.length; i += channels_in) {
        const color_value: Triple = [im.arr[i], im.arr[i + 1], im.arr[i + 2]]
        let processed = process_color_value(
            color_value,
            raw_conv_settings,
            conversion_values,
            exp_shift,
            LUT,
            bit_depth !== 32
        )
        if (!linear) processed = mapTriple(sRGBGamma, processed)

        setter((j + 0) * byte_depth, processed[0] * max, little_endian)
        setter((j + 1) * byte_depth, processed[1] * max, little_endian)
        setter((j + 2) * byte_depth, processed[2] * max, little_endian)

        // Full rgb testimage
        // const k = j / 3
        // const f = max / 117
        // setter((j + 0) * byte_depth, Math.floor(k / 13689) * f, little_endian)
        // setter(
        //     (j + 1) * byte_depth,
        //     Math.floor((k % 13689) / 117) * f,
        //     little_endian
        // )
        // setter((j + 2) * byte_depth, Math.floor(k % 117) * f, little_endian)

        // Greyscale ramp
        // const ratio = Math.floor(j/channels_out % im.width) / im.width
        // setter((j + 0) * byte_depth, ratio * max, little_endian)
        // setter((j + 1) * byte_depth, ratio * max, little_endian)
        // setter((j + 2) * byte_depth, ratio * max, little_endian)

        if (channels_out == 4) setter((j + 3) * byte_depth, max, little_endian)
        j += channels_out
    }
    return buffer
}

export function getConversionValuesBw(
    settings: BWSettings
): ConversionValuesBw {
    const dmin = mapTriple(
        (x) => -Math.log10(x / 2 ** 14) + settings.blackpoint_shift,
        settings.blackpoint
    )
    const m = 1 / (settings.gamma * Math.log10(2))
    const d = settings.toe_width

    const b = mapTriple((x) => settings.exposure - m * (x + 1.2), dmin)
    const invert_toe = settings.toe
    console.debug({ m, b, d, dmin })
    return { m, b, d, dmin, invert_toe }
}

export function invertJSBW8bit(
    im: Uint16Array,
    conversionValues: ConversionValuesBw,
    tone_curve: TCName
): Uint8Array {
    const { m, b, d, dmin } = conversionValues
    const { LUT, exp_shift } = tc_map[tone_curve]
    const out = new Uint8Array(im.length)
    for (let i = 0; i < im.length; i += 4) {
        const densityR = -Math.log10(im[i] / 16384)
        const densityG = -Math.log10(im[i + 1] / 16384)
        const densityB = -Math.log10(im[i + 2] / 16384)
        const expR = pteCurve(densityR, [m, b[0], d, dmin[0]])
        const expG = pteCurve(densityG, [m, b[1], d, dmin[1]])
        const expB = pteCurve(densityB, [m, b[2], d, dmin[2]])
        out[i] = sRGBGamma(applyLUT(2 ** (expR - exp_shift), LUT)) * 256
        out[i + 1] = sRGBGamma(applyLUT(2 ** (expG - exp_shift), LUT)) * 256
        out[i + 2] = sRGBGamma(applyLUT(2 ** (expB - exp_shift), LUT)) * 256
        out[i + 3] = 255
    }
    return out
}

// function processColorValueBw(
//     colorValue: number,
//     conversionValues: {
//         m: number
//         b: number
//         d: number
//         dmin: number
//         invert_toe: boolean
//     },
//     wb_coeff: number,
//     exp_shift: number
// ): number {
//     const { m, b, d, dmin, invert_toe } = conversionValues
//     const density = -Math.log10(colorValue)
//     const exp = invert_toe
//         ? pteCurve(density, [m, b, d, dmin])
//         : m * density + b
//     const rawValue = 2 ** (exp - exp_shift) / wb_coeff
//     return clamp(rawValue * 16384 + BLACK, BLACK, 16384)
// }

function invertRawBW(image: Image): Float32Array {
    throw new Error("unimplemented")
    // const withBackground = "background" in image
    // const [w, h] = withBackground
    //     ? [image.width, image.height]
    //     : [image.width, image.height]

    // const { m, b, d, dmin, invert_toe } = getConversionValuesBw(image.settings.bw)
    // const exp_shift = tc_map[settings.tone_curve].exp_shift

    // const out = new Uint16Array(w * h)
    // for (let j = 0; j < h; j++) {
    //     for (let i = 0; i < w; i++) {
    //         const primary = getCFAValue(cfa, i, j)
    //         const colorIndex = colorOrder[primary]
    //         const color_value = withBackground
    //             ? getTransmittanceBg(image, primary, i, j)
    //             : getTransmittanceNormal(image, primary, i, j)

    //         out[i + j * w] = processColorValueBw(
    //             color_value,
    //             {
    //                 m,
    //                 b: b[colorIndex],
    //                 d,
    //                 dmin: dmin[colorIndex],
    //                 invert_toe,
    //             },
    //             white_balance[colorIndex],
    //             exp_shift
    //         )
    //     }
    // }

    // return out
}
