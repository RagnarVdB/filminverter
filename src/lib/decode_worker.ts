import init, {
    decode_image,
    Image as WasmImage,
} from "../../rawloader-wasm/pkg/rawloader_wasm.js"
import { deBayer, defaultSettings } from "./RawImage"
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
            if (typeof arrayBuffer == "string") {
                reject("file cannot be read")
            } else {
                const original = new Uint8Array(arrayBuffer)
                resolve(original)
            }
        }
        reader.readAsArrayBuffer(file)
    })
}

function getDeBayered(decoded: WasmImage) {
    const rawImage: RawImage = {
        image: decoded.get_data(),
        width: decoded.get_width(),
        height: decoded.get_height(),
    }
    let offset: [number, number] = [0, 0]
    console.log("model", decoded.get_model())
    switch (decoded.get_model()) {
        case "X-T2":
            offset = [0, 0]
            break
        case "X-E4":
            offset = [0, 5]
            break
    }
    console.log("offset", offset)
    const cfa: CFA = {
        str: decoded.get_cfastr(),
        width: decoded.get_cfawidth(),
        height: decoded.get_cfaheight(),
        offset: offset,
    }
    return deBayer(rawImage, cfa)
}

onmessage = async function (e: MessageEvent) {
    const files: [number, File][] = e.data
    await init()
    for (const file of files) {
        const arr = await read_file(file[1])
        const decoded = decode_image(arr)
        const deBayered = getDeBayered(decoded)

        const cam_to_xyz: ConversionMatrix = {
            matrix: Array.from(decoded.get_cam_to_xyz()),
            n: 3,
            m: 4,
        }
        const processed: ProcessedImage = {
            ...deBayered,
            type: "normal",
            file: file[1],
            bps: decoded.get_bps(),
            blacks: Array.from(decoded.get_blacklevels()),
            cam_to_xyz,
            wb_coeffs: Array.from(decoded.get_wb_coeffs()),
            //wb_coeffs: [551, 302, 580],
            orientation: decoded.get_orientation(),
            settings: defaultSettings,
            iter: 0,
            filename: file[1].name,
        }

        console.log("WB: ", processed.wb_coeffs)

        postMessage([file[0], processed])
    }
}
