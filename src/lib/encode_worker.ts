import init, {
    decode_image,
    Image as WasmImage,
} from "../../rawloader-wasm/pkg/rawloader_wasm.js"
import { mapTrich } from "./RawImage"
import { invertRaw } from "./inversion"
import type { ProcessedImage, LoadedImage } from "./RawImage"
import { allPromises } from "./utils.js"
import { read_file, loadImage } from "./wasm_loader.js"

function typedArrayToURL(arr: Uint8Array, mimeType: string): string {
    return URL.createObjectURL(new Blob([arr.buffer], { type: mimeType }))
}

async function getRawImage(file: File): Promise<[WasmImage, LoadedImage]> {
    const original = await read_file(file)
    const decoded: WasmImage = decode_image(original)
    const old = loadImage(decoded)
    return [decoded, old]
}

onmessage = async function (e) {
    const images: ProcessedImage[] = e.data
    await init()

    let newImage: Uint8Array
    let filename: string

    for (const image of images) {
        if (image.kind == "normal") {
            const [decoded, old] = await getRawImage(image.file)
            const newArr = invertRaw(old, image.settings)
            newImage = decoded.encode(newArr)
            filename = image.filename
        } else if (image.kind == "trichrome") {
            const xs = mapTrich(getRawImage, image.files)
            const raws = await allPromises(xs)
            const newArr = invertRaw(
                mapTrich((raw) => raw[1], raws),
                image.settings
            )
            // Gebruik eerste raw (Red image) om naar te schrijven
            newImage = raws.R[0].encode(newArr)
            filename = image.filenames.R
        } else {
            const [decoded, old] = await getRawImage(image.file)
            const [_, old_bg] = await getRawImage(image.bg_file)
            const newArr = invertRaw(
                { image: old, background: old_bg, expfac: image.expfac },
                image.settings
            )
            newImage = decoded.encode(newArr)
            filename = image.filename
        }
        const URL = typedArrayToURL(newImage, "RAF: image/x-fuji-raf")
        postMessage([filename, URL])
    }
}
