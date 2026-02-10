import { deMosaicFuji } from "./deMosaic"
import {
    defaultSettings,
    downSample,
    type RawConvSettings,
    read_and_demoisaic_raw,
    read_raw,
    read_rgb,
} from "./RawImage"

const raw_conv_settings: RawConvSettings = {
    gain: [1, 1, 1],
    black: [0.0620117188, 0.0620117188, 0.0620117188],
    background: [0.644867, 1.402771, 0.86978493],
    max: 16383,
}

onmessage = async function (e: MessageEvent) {
    const files: [number, File][] = e.data
    for (const [i, file] of files) {
        console.log("Reading", file.name)

        const { large, small } = await (async () => {
            if (file.name.endsWith("RAF")) {
                const raw = await read_raw(file)
                const large = deMosaicFuji(raw, [-2, 1])
                const small = downSample(large, 6, 4)
                return { large, small }
            } else {
                const raw_image = await (file.name.endsWith("rgb")
                    ? read_rgb(file)
                    : read_and_demoisaic_raw(file))
                const large = downSample(raw_image, 4, 3)
                const small = downSample(raw_image, 24, 3)
                return { large, small }
            }
        })()

        const processed = {
            file,
            large,
            small,
            raw_conv_settings,
            settings: defaultSettings,
            iter: 0,
        }
        postMessage([i, processed])
    }
}
