import type { ConversionMatrix } from "./RawImage"
import { multiplyMatrices } from "./RawImage"
export const XYZ_to_sRGB: ConversionMatrix = {
    matrix: [
        3.2404542, -1.5371385, -0.4985314, -0.969266, 1.8760108, 0.041556,
        0.0556434, -0.2040259, 1.0572252,
    ],
    n: 3,
    m: 3,
}

export const P3_to_XYZ: ConversionMatrix = {
    matrix: [
        0.51512, 0.29198, 0.1571, 0.2412, 0.69225, 0.06657, -0.00105, 0.04189,
        0.78407,
    ],
    n: 3,
    m: 3,
}

export const cam_to_P3: ConversionMatrix = {
    matrix: [
        1.82774, -0.12403, 0.01736, -0.20948, 1.0, -0.31897, 0.0318, -0.24788,
        1.58678,
    ],
    n: 3,
    m: 3,
}

export const cam_to_paper: ConversionMatrix = {
    matrix: [
        0.90179675, -0.12727153, 0.04085573, -0.10258672, 0.96000495,
        0.12602968, 0.09744488, -0.04798717, 0.86181243,
    ],
    n: 3,
    m: 3,
}

export const paper_to_srgb: ConversionMatrix = {
    matrix: [
        1.33419518, -0.29620981, -0.03814209, 0.11188025, 0.89727952,
        -0.00906062, 0.0570433, 0.02292647, 0.92010467,
    ],
    n: 3,
    m: 3,
}

export const srgb_to_paper: ConversionMatrix = {
    matrix: [
        0.72804006, 0.2395091, 0.03253877, -0.0912109, 1.0841932, 0.0068954,
        -0.04286323, -0.04186383, 1.08464376,
    ],
    n: 3,
    m: 3,
}

export const P3_to_sRGB = multiplyMatrices(XYZ_to_sRGB, P3_to_XYZ)

export const cam_to_APD: ConversionMatrix = {
    matrix: [
        1.49177603, -0.04791066, 0.12848632, -0.06064921, 1.0386549,
        -0.08930718, 0.02489184, -0.07676105, 1.0802084,
    ],
    n: 3,
    m: 3,
}

export const exp_to_sRGB: ConversionMatrix = {
    matrix: [
        1.62114951, -0.61300878, -0.40519641, -0.04018526, 1.00288235,
        0.02327451, 0.14536897, 0.02083871, 1.03923671,
    ],
    n: 3,
    m: 3,
}

export const sRGB_to_EXP: ConversionMatrix = {
    matrix: [
        0.6054679, 0.36535516, 0.22788837, 0.0262387, 1.01342328, -0.01246598,
        -0.0852193, -0.07142717, 0.93061751,
    ],
    n: 3,
    m: 3,
}

export const cdd_to_cid: ConversionMatrix = {
    matrix: [
        0.75573, 0.05901, 0.16134, 0.22197, 0.96928, 0.07406, 0.0223, -0.02829,
        0.7646,
    ],
    n: 3,
    m: 3,
}

export const cam_to_APD2: ConversionMatrix = {
    matrix: [
        0.95356326, -0.14186406, 0.02663051, -0.22810524, 1.05284343, 0.1227711,
        0.17591593, -0.1971507, 0.91540103,
    ],
    n: 3,
    m: 3
}
