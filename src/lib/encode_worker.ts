import { invertRaw } from "./inversion"
import type { Image } from "./RawImage"

function typedArrayToURL(arr: Uint8Array, mimeType: string): string {
    return URL.createObjectURL(new Blob([arr], { type: mimeType }))
}

function image_to_tiff(arr: Float32Array): Uint8Array {
    throw new Error("unimplemented")
}


onmessage = async function (e) {
    const images: Image[] = e.data
    let newImage: Uint8Array
    let filename: string

    for (const image of images) {
        const newArr = invertRaw(image)
        const tiff = image_to_tiff(newArr)
        filename = image.file.name.replace("rgs", "tiff")

        const URL = typedArrayToURL(tiff, "tiff: image")
        postMessage([filename, URL])
    }
}
