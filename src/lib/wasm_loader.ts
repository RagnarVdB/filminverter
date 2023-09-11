import type { Image as WasmImage } from "../../rawloader-wasm/pkg/rawloader_wasm.js"
import type { CFA, LoadedImage } from "./RawImage"
import type { Matrix } from "./utils"

export async function read_file(file: File): Promise<Uint8Array> {
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

function getCFA(decoded: WasmImage): CFA {
    let offset: [number, number] = [0, 0]
    switch (decoded.get_model()) {
        case "X-T2":
            offset = [0, 0]
            break
        case "X-E4":
            offset = [-2, 1]
            break
    }
    const cfa: CFA = {
        str: decoded.get_cfastr(),
        width: decoded.get_cfawidth(),
        height: decoded.get_cfaheight(),
        offset: offset,
    }
    return cfa
}

export function loadImage(wasmIm: WasmImage): LoadedImage {
    const cam_to_xyz: Matrix = {
        matrix: Array.from(wasmIm.get_cam_to_xyz()),
        n: 3,
        m: 4,
    }
    let blacks = Array.from(wasmIm.get_blacklevels())
    if (wasmIm.get_model() == "X-E4") {
        blacks = [1016, 1016, 1016, 1016]
    }
    return {
        image: wasmIm.get_data(),
        width: wasmIm.get_width(),
        height: wasmIm.get_height(),
        make: wasmIm.get_make(),
        bps: wasmIm.get_bps(),
        cfa: getCFA(wasmIm),
        cam_to_xyz: cam_to_xyz,
        wb_coeffs: Array.from(wasmIm.get_wb_coeffs()),
        blacks: blacks,
    }
}
