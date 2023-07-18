import init, {
    decode_image,
    Image as WasmImage,
} from "../../rawloader-wasm/pkg/rawloader_wasm.js"
import { invertRaw, mapTrich } from "./RawImage"
import type { RawImage, ProcessedImage, ProcessedSingle, CFA } from "./RawImage"
import { allPromises } from "./utils.js"

async function read_file(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const arrayBuffer = reader.result
            if (typeof arrayBuffer == "string" || arrayBuffer == null) {
                reject("file cannot be read")
            } else {
                const original = new Uint8Array(arrayBuffer)
                resolve(original)
            }
        }
        reader.readAsArrayBuffer(file)
    })
}

function typedArrayToURL(arr: Uint8Array, mimeType: string): string {
    return URL.createObjectURL(new Blob([arr.buffer], { type: mimeType }))
}

async function getRawImage(file: File): Promise<[WasmImage, RawImage]> {
    const original = await read_file(file)
    const decoded: WasmImage = decode_image(original)
    const old: RawImage = {
        image: decoded.get_data(),
        width: decoded.get_width(),
        height: decoded.get_height(),
    }
    return [decoded, old]
}

onmessage = async function (e) {
    const images: ProcessedImage[] = e.data
    await init()

    let newImage: Uint8Array
    let filename: string

    for (const image of images) {
        const cfa = image.cfa
        if (image.type == "normal") {
            const [decoded, old] = await getRawImage(image.file)
            const newArr = invertRaw(old, cfa, image.settings)
            newImage = decoded.encode(newArr)
            filename = image.filename
        } else {
            const xs = mapTrich(getRawImage, image.files)
            const raws = await allPromises(xs)
            const newArr = invertRaw(
                mapTrich((raw) => raw[1], raws),
                cfa,
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
