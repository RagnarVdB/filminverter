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
} from "./RawImage"
import {
    cam_to_APD,
    cam_to_APD2,
    cdd_to_cid,
    sRGB_to_EXP,
    sRGB_to_cam,
} from "./matrices"
import {
    applyCMV,
    applyMatrixVector,
    clamp,
    colorOrder,
    mapTriple,
    toTriple,
} from "./utils"

import type { Primary, Triple } from "./utils"
interface ConversionValuesBw {
    m: number
    b: number
    d: number
    dmin: Triple
}

type LutSets = [number, number, number, number]
const lutSets: [LutSets, LutSets, LutSets] = [
    [-10.531924030702566, -5.8404278002068075, 0.1, -0.23031522712591435],
    [-5.58974329151427, -8.0595005202138381, 0.2, -0.74694390911064334],
    [-7.7641792146902739, -11.103306662255587, 0.2, -0.88572369488605363],
]

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

export function getConversionValuesColor(
    settings: AdvancedSettings,
    kind: "normal" | "trichrome" | "density"
): {
    factor: Triple
    exponent: Triple
    dmin: Triple
} {
    const gamma = [
        settings.gamma,
        settings.gamma * settings.facG,
        settings.gamma * settings.facB,
    ]
    const exponent: Triple = [
        1 / (gamma[0] * 1.818181),
        1 / (gamma[1] * 1.818181),
        1 / (gamma[2] * 1.818181),
    ]

    const dminCam: Triple = [
        settings.dmin[0] / 2 ** 14,
        settings.dmin[1] / 2 ** 14,
        settings.dmin[2] / 2 ** 14,
    ]
    const dminAPD = toTriple(applyMatrixVector(dminCam, cam_to_APD))

    const neutralTargetsRGB = [
        0.5 * 2 ** settings.exposure,
        0.5 * 2 ** settings.exposure * settings.green,
        0.5 * 2 ** settings.exposure * settings.blue,
    ]
    console.log("neutralTargetsRGB", neutralTargetsRGB)
    const neutralTargetLogE = [
        Math.log10(applyMatrixVector(neutralTargetsRGB, sRGB_to_EXP)[0]),
        Math.log10(applyMatrixVector(neutralTargetsRGB, sRGB_to_EXP)[1]),
        Math.log10(applyMatrixVector(neutralTargetsRGB, sRGB_to_EXP)[2]),
    ]
    const selectedNeutralCam: Triple = [
        settings.neutral[0] / 2 ** 14,
        settings.neutral[1] / 2 ** 14,
        settings.neutral[2] / 2 ** 14,
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

    const factor: Triple = [
        neutralTargetLogE[0] - selectedNeutralLogE[0],
        neutralTargetLogE[1] - selectedNeutralLogE[1],
        neutralTargetLogE[2] - selectedNeutralLogE[2],
    ]
    console.log({ exponent: exponent, factor: factor, dmin: dminAPD })
    return { exponent: exponent, factor: factor, dmin: dminAPD }
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

    const cam_log = mapTriple(Math.log10, color)
    const APD = applyCMV(cam_to_APD2, cam_log)
    const exp = paper_to_exp(APD)
    const inv = mapTriple((x) => 0.2823561717 * 2 ** x, exp)
    const out = applyCMV(sRGB_to_cam, inv)[j] / mult
    // const out = inv[colorOrder[main]]
    // return clamp(Math.round(out * 16384 + BLACK), 0, 16383)
    return clamp(out, 0, 1) * 16384
}

function invertRawColor(
    image: LoadedImage | Bg<LoadedImage> | Trich<LoadedImage>,
    settings: AdvancedSettings
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
    const { factor, exponent } = getConversionValuesColor(settings, "normal")
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

export function getConversionValuesBw(
    settings: BWSettings
): ConversionValuesBw {
    const dmin = mapTriple(
        (x) => -Math.log10(x / 2 ** 14) + settings.blackpoint_shift,
        settings.blackpoint
    )
    console.log("dmin", dmin)
    const m = 1 / (settings.gamma * Math.log10(2))
    console.log("m", m)
    const d = settings.toe_width
    console.log("d", d)

    const neutralDensity = dmin[1] + 0.82
    const b = settings.exposure - m * neutralDensity
    console.log("exposure", settings.exposure)
    console.log("b", b)
    return { m, b, d, dmin }
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

function invertRawBW(
    image: LoadedImage | Bg<LoadedImage> | Trich<LoadedImage>,
    settings: BWSettings
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
        return invertRawBW(image, settings.bw)
    } else {
        return invertRawColor(image, settings.advanced)
    }
}
