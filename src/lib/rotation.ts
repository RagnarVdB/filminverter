import { applyMatrixVector, type Matrix } from "./utils"

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
