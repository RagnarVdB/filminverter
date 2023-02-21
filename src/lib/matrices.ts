import type { ConversionMatrix } from './RawImage'

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
        1.75770771, -0.57264877, -0.13551353,
        0.63231951, 0.51279871, -0.10448185,
        0.23176891, -0.09070517, 0.88107295,
    ],
    n: 3,
    m: 3,
}
