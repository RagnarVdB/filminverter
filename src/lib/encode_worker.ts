import init, { decode_image, Image as WasmImage } from '../../rawloader-wasm/pkg/rawloader_wasm.js'
import { invertRaw } from './RawImage'
import type { RawImage, ProcessedImage, CFA, ConversionMatrix } from './RawImage'

function typedArrayToURL(arr: Uint8Array, mimeType: string): string {
    return URL.createObjectURL(new Blob([arr.buffer], {type: mimeType}))
}

onmessage = async function(e) {
	const images: ProcessedImage[] = e.data
	await init()
	for (const image of images) {
		const decoded: WasmImage = decode_image(image.original)
        const old: RawImage = {
			image: decoded.get_data(),
			width: decoded.get_width(),
			height: decoded.get_height()
		}

        const cfa: CFA = {
			str: decoded.get_cfastr(),
			width: decoded.get_cfawidth(),
			height: decoded.get_cfaheight()
		}

        const newArr = invertRaw(old, cfa, image.settings, image.blacks, image.wb_coeffs)
        const newImage = decoded.encode(newArr)
        const URL = typedArrayToURL(newImage, "RAF: image/x-fuji-raf")
		postMessage([image.filename, URL])
	}
}