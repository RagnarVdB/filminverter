export function number_of_workers(nFiles: number): number {
    const nthreads = navigator.hardwareConcurrency
    let maxWorkers = 1
    if (nthreads % 2 == 0 && nthreads != 2) maxWorkers = nthreads -2
    else if (nthreads != 1) maxWorkers = nthreads - 1

    return Math.min(maxWorkers, nFiles)
}

export function zip<T, Y>(l1: T[], l2: Y[]): [T, Y][] {
    return l1.map((x, i) => [x, l2[i]])
}


export function chunks<T>(array: ArrayLike<T>, chunkSize: number): T[][] {
    const result = []
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(Array.prototype.slice.call(array).slice(i, i + chunkSize))
    }
    return result
}

export function chunksRgba(array: Uint16Array): [number, number, number, number][] {
    const result = []
    for (let i = 0; i < array.length; i += 4) {
        result.push(Array.prototype.slice.call(array).slice(i, i + 4))
    }
    return result
}

export function chunksRgb(array: Uint16Array): [number, number, number][] {
    const result = []
    for (let i = 0; i < array.length; i += 3) {
        result.push(Array.prototype.slice.call(array).slice(i, i + 3))
    }
    return result
}
