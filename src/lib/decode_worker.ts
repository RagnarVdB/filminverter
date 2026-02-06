import {
    initializeImage,
    type RawConvSettings,
    type RawImage,
    read_raw,
} from "./RawImage"

const raw_conv_settings: RawConvSettings = {
    gain: [2.21913894, 1.07177346, 1.5691682],
    black: [0.0015258789, 0.0015258789, 0.0015258789],
    background: [0.644867, 1.402771, 0.86978493],
}

async function read_rgb(file: File): Promise<RawImage> {
    let arr = new Uint16Array(await file.arrayBuffer())
    let width = arr.slice(0, 2)[0]
    let height = arr.slice(2, 4)[0]
    let image = arr.slice(4, arr.length)
    console.log("Read image: ", width, height)
    return {
        arr: image,
        width,
        height,
    }
}

onmessage = async function (e: MessageEvent) {
    const files: [number, File][] = e.data
    for (const [i, file] of files) {
        console.log("Reading", file.name)
        const raw_image = await (file.name.endsWith("rgb")
            ? read_rgb(file)
            : read_raw(file))
        const processed = initializeImage(raw_image, file, raw_conv_settings)
        postMessage([i, processed])
    }
}
