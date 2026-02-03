import { type RawConvSettings, initializeImage, read_raw } from "./RawImage"


const raw_conv_settings: RawConvSettings = {
    gain: [2.21913894, 1.07177346, 1.5691682],
    black: [0.0015258789, 0.0015258789, 0.0015258789],
    background: [0.644867, 1.402771, 0.86978493]
}

onmessage = async function (e: MessageEvent) {
    const files: [number, File][] = e.data
    for (const file of files) {
        const raw_image = await read_raw(file[1])
        const processed = initializeImage(raw_image, file[1], raw_conv_settings)
        postMessage([file[0], processed])
    }
}
