import init, { decode_image, Image as WasmImage } from '../../rawloader-wasm/pkg/rawloader_wasm.js'
import { deBayer } from './RawImage'
import type { RawImage, ProcessedImage, CFA } from './RawImage'

async function read_file(file: File): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const arrayBuffer = reader.result
			if (typeof arrayBuffer == 'string') {
				reject("file cannot be read")
			} else {
				const original = new Uint8Array(arrayBuffer)
				resolve(original)
			}
		}
		reader.readAsArrayBuffer(file)
	})
}

onmessage = async function(e) {
	const files: [number, File][]= e.data
	await init()
	for (const file of files) {
		const arr = await read_file(file[1])
		const decoded = decode_image(arr)
		const rawImage: RawImage = {
			image: decoded.get_data(),
			width: decoded.get_width(),
			height: decoded.get_height()
		}

		const cfa: CFA = {
			str: decoded.get_cfastr(),
			width: decoded.get_cfawidth(),
			height: decoded.get_cfaheight()
		}

		const processed = deBayer(rawImage, cfa)

		postMessage([file[0], processed])
	}
}
