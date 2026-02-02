import { type RawImage, initializeImage, type Image, type RawConvSettings } from "./RawImage"
import type { Triple } from "./utils.js"

async function read_raw(file: File): Promise<RawImage> {
    let arr = new Uint16Array(await file.arrayBuffer())
    let width = arr.slice(0, 2)[0]
    let height = arr.slice(2, 4)[0]
    let image = arr.slice(4, arr.length)
    console.log("Read image: ", width, height)
    return {
        arr: image,
        width,
        height
    }
    
}

const raw_conv_settings: RawConvSettings = {
    gain: [2.21913894, 1.07177346, 1.5691682],
    offset: [1041, 1041, 1041],
    background: [0.644867  , 1.402771  , 0.86978493]
}

onmessage = async function (e: MessageEvent) {
    const files: [number, File][] = e.data
    for (const file of files) {
        const raw_image = await read_raw(file[1])
        const processed = initializeImage(raw_image, file[1], raw_conv_settings)
        postMessage([file[0], processed])
    }
}
