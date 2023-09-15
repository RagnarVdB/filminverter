import type {
    AdvancedSettings,
    BWSettings,
    Bg,
    LoadedImage,
    Settings,
    Trich,
} from "./RawImage"
import {
    BLACK,
    getCFAValue,
    getColorValue,
    getTransmittanceBg,
    getTransmittanceNormal,
} from "./RawImage"
import { cam_to_APD, sRGB_to_cam } from "./matrices"
import { applyCMV, applyCMVRow, clamp, colorOrder, mapTriple } from "./utils"

import type { Primary, Triple } from "./utils"

interface ConversionValuesColor {
    m: Triple
    b: Triple
    d: Triple
    dmin: Triple
    invert_toe: boolean
}
interface ConversionValuesBw {
    m: number
    b: number
    d: number
    dmin: Triple
    invert_toe: boolean
}

type LutSets = [number, number, number, number]
const lutSets: [LutSets, LutSets, LutSets] = [
    [-10.531924030702566, -5.8404278002068075, 0.1, -0.23031522712591435],
    [-5.58974329151427, -8.0595005202138381, 0.2, -0.74694390911064334],
    [-7.7641792146902739, -11.103306662255587, 0.2, -0.88572369488605363],
]

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

function paperToExp(color: Triple): Triple {
    return [
        pteCurve(color[0], lutSets[0]),
        pteCurve(color[1], lutSets[1]),
        pteCurve(color[2], lutSets[2]),
    ]
}

export function getConversionValuesColor(
    settings: AdvancedSettings
): ConversionValuesColor {
    const gamma: Triple = [
        settings.gamma,
        settings.gamma * settings.facG,
        settings.gamma * settings.facB,
    ]
    const m = mapTriple((x) => 1 / (x * Math.log10(2)), gamma)

    const dminAPD = applyCMV(
        cam_to_APD,
        mapTriple((x) => -Math.log10(x / 2 ** 14), settings.dmin)
    )

    const d: Triple = [
        settings.toe_width,
        settings.toe_width,
        settings.toe_width,
    ]
    console.log(settings.blue, settings.green)
    const target_neutral_APD: Triple = [
        -3 + settings.exposure,
        (-3 + settings.exposure) / settings.green,
        (-3 + settings.exposure) / settings.blue,
    ]
    const selected_neutral_cam = settings.neutral
    console.log(
        "selected_neutral_cam",
        mapTriple((x) => x / 2 ** 14, selected_neutral_cam)
    )
    const selected_neutral_APD = applyCMV(
        cam_to_APD,
        mapTriple((x) => -Math.log10(x / 2 ** 14), selected_neutral_cam)
    )
    console.log("selected_neutral_APD", selected_neutral_APD)
    // ms+b=t
    // b = t - ms
    const b: Triple = [
        target_neutral_APD[0] - m[0] * selected_neutral_APD[0],
        target_neutral_APD[1] - m[1] * selected_neutral_APD[1],
        target_neutral_APD[2] - m[2] * selected_neutral_APD[2],
    ]
    console.log("x0", [dminAPD[0] + d[0], dminAPD[1] + d[1], dminAPD[2] + d[2]])
    console.log({ m, b, d, dmin: dminAPD })
    return {
        m,
        b,
        d,
        dmin: dminAPD,
        invert_toe: settings.toe,
    }
}

function procesValueColor(
    colorValue: Triple,
    primary: Primary,
    conversionValues: ConversionValuesColor,
    wb_coeff: number
): number {
    // Camera raw to output (sRGB)
    const { m, b, d, dmin, invert_toe } = conversionValues
    const APD = applyCMV(
        cam_to_APD,
        mapTriple((x) => -Math.log10(x), colorValue)
    )
    let exp: Triple
    if (invert_toe) {
        exp = [
            pteCurve(APD[0], [m[0], b[0], d[0], dmin[0]]),
            pteCurve(APD[1], [m[1], b[1], d[1], dmin[1]]),
            pteCurve(APD[2], [m[2], b[2], d[2], dmin[2]]),
        ]
    } else {
        exp = [m[0] * APD[0] + b[0], m[1] * APD[1] + b[1], m[2] * APD[2] + b[2]]
    }
    const rawValuesRGB = mapTriple((x) => 2 ** x, exp)
    const rawValue = applyCMVRow(sRGB_to_cam, rawValuesRGB, primary) / wb_coeff
    return clamp(rawValue * 16384 + BLACK, 0, 16384)
}

function invertRawColor(
    image: LoadedImage | Bg<LoadedImage> | Trich<LoadedImage>,
    settings: AdvancedSettings
): Uint16Array {
    let w: number, h: number
    let wb
    if ("R" in image) {
        // Trichrome
        w = image.R.width
        h = image.R.height
        wb = image.R.wb_coeffs
    } else if ("background" in image) {
        w = image.image.width
        h = image.image.height
        wb = image.image.wb_coeffs
    } else {
        w = image.width
        h = image.height
        wb = image.wb_coeffs
    }
    const wb_coeffs = [wb[0] / wb[1], 1, wb[2] / wb[1]]
    const conversion_values = getConversionValuesColor(settings)
    let out = new Uint16Array(w * h)

    for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
            const { main, color } = getColorValue(image, i, j)
            out[i + j * w] = procesValueColor(
                color,
                main,
                conversion_values,
                wb_coeffs[colorOrder[main]]
            )
        }
    }
    return out
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

    const maxDensity = dmin[1] + 1.2
    const b = settings.exposure - m * maxDensity
    const invert_toe = settings.toe
    console.log({ m, b, d, dmin })
    return { m, b, d, dmin, invert_toe }
}

export function invertJS(
    im: Uint16Array,
    conversionValues: ConversionValuesBw
): Uint16Array {
    const { m, b, d, dmin } = conversionValues
    const out = new Uint16Array(im.length)
    for (let i = 0; i < im.length; i += 4) {
        const densityR = -Math.log10(im[i] / 16384)
        const densityG = -Math.log10(im[i + 1] / 16384)
        const densityB = -Math.log10(im[i + 2] / 16384)
        const expR = pteCurve(densityR, [m, b, d, dmin[0]])
        const expG = pteCurve(densityG, [m, b, d, dmin[1]])
        const expB = pteCurve(densityB, [m, b, d, dmin[2]])
        out[i] = 2 ** expR * 16384
        out[i + 1] = 2 ** expG * 16384
        out[i + 2] = 2 ** expB * 16384
    }
    return out
}

function processColorValueBw(
    colorValue: number,
    conversionValues: {
        m: number
        b: number
        d: number
        dmin: number
        invert_toe: boolean
    },
    wb_coeff: number
): number {
    const { m, b, d, dmin, invert_toe } = conversionValues
    const density = -Math.log10(colorValue)
    const exp = invert_toe
        ? pteCurve(density, [m, b, d, dmin])
        : m * density + b
    const rawValue = 2 ** exp / wb_coeff
    return clamp(rawValue * 16384 + BLACK, 0, 16384)
}

function invertRawBW(
    image: LoadedImage | Bg<LoadedImage>,
    settings: BWSettings
): Uint16Array {
    const withBackground = "background" in image
    const [w, h] = withBackground
        ? [image.image.width, image.image.height]
        : [image.width, image.height]
    const cfa = withBackground ? image.image.cfa : image.cfa

    const { m, b, d, dmin, invert_toe } = getConversionValuesBw(settings)
    let wb = withBackground ? image.image.wb_coeffs : image.wb_coeffs
    console.log("wb2", wb)
    const white_balance = [wb[0] / wb[1], 1, wb[2] / wb[1]]
    const out = new Uint16Array(w * h)
    console.log("values", m, b, d, dmin, white_balance)
    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            const primary = getCFAValue(cfa, i, j)
            const colorIndex = colorOrder[primary]
            const color_value = withBackground
                ? getTransmittanceBg(image, primary, i, j)
                : getTransmittanceNormal(image, primary, i, j)

            out[i + j * w] = processColorValueBw(
                color_value,
                {
                    m,
                    b,
                    d,
                    dmin: dmin[colorIndex],
                    invert_toe,
                },
                white_balance[colorIndex]
            )
            // if (primary == "B") {
            //     out[i + j * w] = 2500 / white_balance[colorIndex] + 1016
            // } else {
            //     out[i + j * w] = 1016
            // }
            // out[i + j * w] = 2500 / white_balance[colorIndex] + 1016
        }
    }

    return out
}

export function invertRaw(
    image: LoadedImage | Bg<LoadedImage> | Trich<LoadedImage>,
    settings: Settings
): Uint16Array {
    if (settings.mode == "bw") {
        if ("R" in image) {
            throw new Error("BW not supported for trichrome")
        }
        return invertRawBW(image, settings.bw)
    } else {
        return invertRawColor(image, settings.advanced)
    }
}
