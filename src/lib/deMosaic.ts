import type { RawImage, CFA } from "./RawImage"

type Triple = [number, number, number]

export function deBayer(image: RawImage, cfa: CFA, black: Triple): RawImage {
    // Tel voorkomen in cfa
    const R = cfa.str.match(/R/g)
    const G = cfa.str.match(/G/g)
    const B = cfa.str.match(/B/g)
    if (R == null || G == null || B == null) {
        throw new Error("Invalid CFA")
    }
    const nR = R.length
    const nG = G.length
    const nB = B.length

    const n = Math.floor((image.width - cfa.offset[0]) / cfa.width)
    const m = Math.floor((image.height - cfa.offset[1]) / cfa.height)

    const buffer = new ArrayBuffer(n * m * 8)
    const im = new Uint16Array(buffer)
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            let red = 0
            let green = 0
            let blue = 0
            for (let k = 0; k < cfa.width; k++) {
                for (let l = 0; l < cfa.height; l++) {
                    const index =
                        (j * cfa.height + l + cfa.offset[1]) * image.width +
                        i * cfa.height +
                        k +
                        cfa.offset[0]
                    const value = image.image[index]
                    if (value == undefined) {
                        console.error(
                            i,
                            j,
                            l,
                            k,
                            index,
                            value,
                            index < image.image.length
                        )
                        throw new Error("No value")
                    }
                    switch (cfa.str[l * cfa.width + k]) {
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
                            console.error(l, k, cfa.str[l * cfa.width + k])
                            throw new Error("No matching color found")
                    }
                }
            }

            im[(n * j + i) * 4] = red / nR - black[0]
            im[(n * j + i) * 4 + 1] = green / nG - black[1]
            im[(n * j + i) * 4 + 2] = blue / nB - black[2]
            im[(n * j + i) * 4 + 3] = 65535
        }
    }
    return { image: im, width: n, height: m }
}

export function deMosaicFuji(
    image: RawImage,
    offset: [number, number],
    black: Triple,
    wb_coeffs: Triple
): RawImage {
    const cfa1 = "GRGBGBGRG"
    const cfa2 = "GBGRGRGBG"

    const nR = 2
    const nG = 5
    const nB = 2

    const n = Math.floor((image.width - offset[0]) / 3)
    const m = Math.floor((image.height - offset[1]) / 3)

    const buffer = new ArrayBuffer(n * m * 8)
    const im = new Uint16Array(buffer)
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            let red = 0
            let green = 0
            let blue = 0

            const cfa = (i + j) % 2 == 0 ? cfa1 : cfa2

            for (let k = 0; k < 3; k++) {
                for (let l = 0; l < 3; l++) {
                    const index =
                        (j * 3 + l + offset[1]) * image.width +
                        i * 3 +
                        k +
                        offset[0]
                    const value = image.image[index]
                    switch (cfa[l * 3 + k]) {
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
                            console.error(l, k, cfa[l * 3 + k])
                            throw new Error("No matching color found")
                    }
                }
            }
            im[(n * j + i) * 4] = (red / nR - black[0]) * wb_coeffs[0]
            im[(n * j + i) * 4 + 1] = (green / nG - black[1]) * wb_coeffs[1]
            im[(n * j + i) * 4 + 2] = (blue / nB - black[2]) * wb_coeffs[2]
            im[(n * j + i) * 4 + 3] = 65535
        }
    }
    return { image: im, width: n, height: m }
}
