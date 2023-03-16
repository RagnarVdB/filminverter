import init, {
    decode_image,
    Image as WasmImage,
} from "../../rawloader-wasm/pkg/rawloader_wasm.js"
import { invertRaw } from "./RawImage"
import type {
    RawImage,
    ProcessedImage,
    CFA,
    ConversionMatrix,
} from "./RawImage"

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

onmessage = async function (e) {
    const images: ProcessedImage[] = e.data
    await init()
    for (const image of images) {
        const original = await read_file(image.file)
        const decoded: WasmImage = decode_image(original)
        const old: RawImage = {
            image: decoded.get_data(),
            width: decoded.get_width(),
            height: decoded.get_height(),
        }
        const cfa = image.cfa
        const newArr = invertRaw(
            old,
            cfa,
            image.settings,
            image.blacks,
            image.wb_coeffs,
            image.cam_to_xyz
        )
        const newImage = decoded.encode(newArr)
        const URL = typedArrayToURL(newImage, "RAF: image/x-fuji-raf")
        postMessage([image.filename, URL])
    }
}
