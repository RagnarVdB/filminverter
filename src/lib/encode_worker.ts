import init, {
    decode_image,
    Image as WasmImage,
} from "../../rawloader-wasm/pkg/rawloader_wasm.js"
import { invertRaw, mapTrich } from "./RawImage"
import type { ProcessedImage, LoadedImage } from "./RawImage"
import { allPromises } from "./utils.js"
import { read_file, getLoadedImage } from "./wasm_loader.js"

function typedArrayToURL(arr: Uint8Array, mimeType: string): string {
    return URL.createObjectURL(new Blob([arr.buffer], { type: mimeType }))
}

async function getRawImage(file: File): Promise<[WasmImage, LoadedImage]> {
    const original = await read_file(file)
    const decoded: WasmImage = decode_image(original)
    const old = getLoadedImage(decoded)
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
        } else {
            const xs = mapTrich(getRawImage, image.files)
            const raws = await allPromises(xs)
            const newArr = invertRaw(
                mapTrich((raw) => raw[1], raws),
                image.settings
            )
            console.log(newArr)
            // Gebruik eerste raw (Red image) om naar te schrijven
            newImage = raws.R[0].encode(newArr)
            filename = image.filenames.R
        }
        const URL = typedArrayToURL(newImage, "RAF: image/x-fuji-raf")
        postMessage([filename, URL])
    }
}
