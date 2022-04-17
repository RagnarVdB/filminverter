import { chunks, chunksRgba, zip } from "./utils"
export interface RawImage {
    image: Uint16Array // RAW
    width: number
    height: number
}

export interface ProcessedImage {
    image: Uint16Array // RGBA 14bit
    width: number
    height: number
    bps: number
    cam_to_xyz: ConversionMatrix
    blacks: number[]
    orientation: String
    settings: Settings
    iter: number
}

export interface CFA {
    str: string
    width: number
    height: number
}

export interface Settings {
    gamma: [number, number, number]
    offset: [number, number, number]
}

export interface ConversionMatrix {
    matrix: number[] | Float32Array
    n: number // naar
    m: number // van
}

export function deBayer(image: RawImage, cfa: CFA): RawImage {
    // Tel voorkomen in cfa
    const nR = cfa.str.match(/R/g).length
    const nG = cfa.str.match(/G/g).length
    const nB = cfa.str.match(/B/g).length

    const n = Math.floor(image.width / cfa.width)
    const m = Math.floor(image.height / cfa.height)

    const buffer = new ArrayBuffer(n*m*8)
    const im = new Uint16Array(buffer)
    for (let i=0; i<n; i++) {
        for (let j=0; j<m; j++) {
            let red = 0
            let green = 0
            let blue = 0
            for (let k=0; k<cfa.width; k++) {
                for (let l=0; l<cfa.height; l++) {
                    const index = (j*cfa.height + l)*image.width + i*cfa.height + k
                    const value = image.image[index]
                    if (value == undefined) {
                        console.error(i, j, l, k, index, value, index < image.image.length)
                        throw new Error("No value")
                    }
                    switch (cfa.str[l*cfa.width + k]) {
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
                            console.error(l, k, cfa.str[l*cfa.width + k])
                            throw new Error("No matching color found")
                    }
                }
            }

            im[(n*j+i)*4] = red/nR
            im[(n*j+i)*4+1] = green/nG
            im[(n*j+i)*4+2] = blue/nB
            im[(n*j+i)*4+3] = 2**16 - 1
        }
    }
    return {image: im, width: n, height: m}
}

const xyz_to_rgb: ConversionMatrix = {
    matrix: [3.2404542, -1.5371385, -0.4985314,
        -0.9692660, 1.8760108, 0.0415560,
        0.0556434, -0.2040259, 1.0572252],
    n:  3,
    m: 3
}

function gammaTranform(linear: number): number {
    const gamma = 1/2.4
    if (linear < 0.0031308) {
        return linear * 12.92*256
    } else {
        return (Math.pow(linear*1.055,gamma) - 0.055)*256
    }
}

function multiplyMatrices(matrix1: ConversionMatrix, matrix2: ConversionMatrix) {
    if (matrix1.n != matrix2.m) {
        throw new Error("Invalid shapes")
    }
    
}

function applyMatrixVector(vec: number[], matrix: ConversionMatrix): number[] {
    const result: number[] = []
    const { n, m } = matrix
    for (let i = 0; i < n; i++) {
        result.push(zip(
            Array.from(matrix.matrix).slice(i*m, (i+1)*m),
            vec)
            .reduce((acc, val) => acc + val[0]*val[1], 0)
        )
    }
    return result
}

export function applyConversionMatrix(image: number[] | Uint16Array, matrix: ConversionMatrix): number[] {
    return chunksRgba(image).flatMap((vec) => applyMatrixVector(vec, matrix))
}

export async function showImage(image: ProcessedImage): Promise<ImageBitmap> {
    console.log("processing")
    const im = Array.from(image.image)
    const blacks = image.blacks
    let rgbImage = []
    for (let i = 0; i < im.length; i += 4) {
        // console.log(im.slice(i, i+1))
        const xyz = applyMatrixVector([im[i]-blacks[0], im[i+1]-blacks[1], im[i+2]-blacks[2], im[i+3]-blacks[3]], image.cam_to_xyz)
        // console.log("xyz", xyz)
        const rgb = applyMatrixVector(xyz, xyz_to_rgb)
        // console.log("rgb", rgb)
        rgbImage.push(...rgb, 1)
    }
    const clamped = Uint8ClampedArray.from(rgbImage, gammaTranform)

    const imdat = new ImageData(clamped, image.width, image.height)
    const bitmap = await createImageBitmap(imdat)
    return bitmap
}

export const defaultSettings: Settings = {
    gamma: [1, 1, 1],
    offset: [1, 1, 1]
}
