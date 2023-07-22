import init, { decode_image } from "../../rawloader-wasm/pkg/rawloader_wasm.js"
import { defaultSettings } from "./RawImage"
import { deBayer, deMosaicFuji } from "./deMosaic"
import type { RawImage, ProcessedSingle, LoadedImage } from "./RawImage"
import { read_file, loadImage } from "./wasm_loader.js"

function getDeMosaiced(im: LoadedImage): RawImage {
    if (im.make == "FUJIFILM") {
        console.log("FUJI")
        return deMosaicFuji(im, im.cfa.offset, [
            im.blacks[0],
            im.blacks[1],
            im.blacks[2],
        ])
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
        const deBayered = getDeMosaiced(loadedImage)

        console.log(decoded.get_make())
        const processed: ProcessedSingle = {
            ...loadedImage,
            ...deBayered,
            kind: "normal",
            file: file[1],
            orientation: decoded.get_orientation(),
            settings: defaultSettings,
            iter: 0,
            filename: file[1].name,
        }
        console.log("wb", processed.wb_coeffs)
        postMessage([file[0], processed])
    }
}
