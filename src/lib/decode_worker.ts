import init, { decode_image } from "../../rawloader-wasm/pkg/rawloader_wasm.js"
import { buildPreview, defaultSettings } from "./RawImage"
import { deBayer, deMosaicFuji } from "./deMosaic"
import type { RawImage, LoadedImage, DeBayeredImage } from "./RawImage"
import { read_file, loadImage } from "./wasm_loader.js"
import type { Triple } from "./utils.js"

function demosaic(im: LoadedImage): RawImage {
    if (im.make == "FUJIFILM") {
        const wb = im.wb_coeffs
        const wb_coeffs: Triple = [wb[0] / wb[1], 1, wb[2] / wb[1]]
        return deMosaicFuji(
            im,
            im.cfa.offset,
            [im.blacks[0], im.blacks[1], im.blacks[2]],
            wb_coeffs
        )
    } else {
        return deBayer(im, im.cfa, [im.blacks[0], im.blacks[1], im.blacks[2]])
    }
}

onmessage = async function (e: MessageEvent) {
    const files: [number, File][] = e.data
    await init()
    for (const file of files) {
        const arr = await read_file(file[1])
        const decoded = decode_image(arr)
        const loadedImage = loadImage(decoded)
        const demosaiced = demosaic(loadedImage)

        const processed: DeBayeredImage = {
            ...loadedImage,
            ...demosaiced,
            file: file[1],
            orientation: decoded.get_orientation(),
            settings: defaultSettings,
            iter: 0,
            filename: file[1].name,
        }
        postMessage([file[0], processed])
    }
}
