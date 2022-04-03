export interface RawImage {
    image: Uint16Array, // RAW
    width: number,
    height: number
}

export interface ProcessedImage {
    image: Uint16Array, // RGBA
    width: number,
    height: number
}

export interface CFA {
    str: string
    width: number
    height: number
}

export function deBayer(image: RawImage, cfa: CFA): ProcessedImage {
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
            im[(i*n+j)*4] = red/nR
            im[(i*n+j)*4+1] = blue/nB
            im[(i*n+j)*4+2] = green/nG
            im[(i*n+j)*4+3] = 2**16 - 1
        }
    }
        return {image: im, width: n, height: m}
}