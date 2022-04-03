export function number_of_workers(nFiles: number): number {
    const nthreads = navigator.hardwareConcurrency
    let maxWorkers = 1
    if (nthreads % 2 == 0 && nthreads != 2) maxWorkers = nthreads -2
    else if (nthreads != 1) maxWorkers = nthreads - 1

    return Math.min(maxWorkers, nFiles)
}