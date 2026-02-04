export type Triple = [number, number, number]
export type Primary = "R" | "G" | "B"
export type BgPrimary = "BR" | "BG" | "BB"

export interface Matrix {
    matrix: number[]
    n: number // naar
    m: number // van
}
export interface ColorMatrix {
    matrix: number[]
    n: 3 // naar
    m: 3 // van
}
export const colorOrder = {
    R: 0,
    G: 1,
    B: 2,
}

export function mapTriple(f: (x: number) => number, x: Triple): Triple {
    return [f(x[0]), f(x[1]), f(x[2])]
}

export function toTriple(x: number[]): Triple {
    return [x[0], x[1], x[2]]
}

export function numberOfWorkers(nFiles: number): number {
    const nthreads = navigator.hardwareConcurrency
    let maxWorkers = 1
    if (nthreads % 2 == 0 && nthreads != 2) maxWorkers = nthreads - 2
    else if (nthreads != 1) maxWorkers = nthreads - 1

    return Math.min(maxWorkers, nFiles)
}

export function zip<T, Y>(l1: T[], l2: Y[]): [T, Y][] {
    return l1.map((x, i) => [x, l2[i]])
}

function matmul(
    M1: number[],
    n1: number,
    m1: number,
    M2: number[],
    n2: number,
    m2: number
): number[] {
    let result: number[] = []
    for (let i = 0; i < n1; i++) {
        const row = M1.slice(i * m1, (i + 1) * m1)
        for (let j = 0; j < m2; j++) {
            let col: number[] = []
            for (let k = 0; k < n2; k++) {
                col[k] = M2[j + k * m2]
            }
            result[i * m2 + j] = zip(row, col).reduce(
                (acc, [x, y]) => acc + x * y,
                0
            )
        }
    }
    return result
}

export function multiplyMatrices(matrix1: Matrix, matrix2: Matrix): Matrix {
    if (matrix1.m != matrix2.n) {
        throw new Error("Invalid shapes")
    }
    return {
        matrix: matmul(
            matrix1.matrix,
            matrix1.n,
            matrix1.m,
            matrix2.matrix,
            matrix2.n,
            matrix2.m
        ),
        n: matrix1.n,
        m: matrix2.m,
    }
}

export function multiplyColorMatrices(
    matrix1: ColorMatrix,
    matrix2: ColorMatrix
): ColorMatrix {
    return {
        matrix: matmul(matrix1.matrix, 3, 3, matrix2.matrix, 3, 3),
        n: 3,
        m: 3,
    }
}

export function transpose(matrix: Matrix): Matrix {
    const transposed = []
    for (let i = 0; i < matrix.m; i++) {
        for (let j = 0; j < matrix.n; j++) {
            transposed[i * matrix.n + j] = matrix.matrix[j * matrix.m + i]
        }
    }
    return {
        matrix: transposed,
        n: matrix.m,
        m: matrix.n,
    }
}

export function applyMatrixVector(vec: number[], matrix: Matrix): number[] {
    const result: number[] = []
    const { n, m } = matrix
    for (let i = 0; i < n; i++) {
        result.push(
            zip(
                Array.from(matrix.matrix).slice(i * m, (i + 1) * m),
                vec
            ).reduce((acc, val) => acc + val[0] * val[1], 0)
        )
    }
    return result
}

export function applyCMV(matrix: ColorMatrix, vec: Triple): Triple {
    const result: Triple = [0, 0, 0]
    for (let i = 0; i < 3; i++) {
        result[i] = zip(
            Array.from(matrix.matrix).slice(i * 3, (i + 1) * 3),
            vec
        ).reduce((acc, val) => acc + val[0] * val[1], 0)
    }
    return result
}

export function applyCMVRow(
    matrix: ColorMatrix,
    vec: Triple,
    primary: Primary
): number {
    const i = colorOrder[primary]
    const result = zip(
        Array.from(matrix.matrix).slice(i * 3, (i + 1) * 3),
        vec
    ).reduce((acc, val) => acc + val[0] * val[1], 0)
    return result
}

export function clamp(x: number, min: number, max: number) {
    return Math.max(min, Math.min(x, max))
}

export function download(url: string, filename: string) {
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(function () {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }, 0)
}
