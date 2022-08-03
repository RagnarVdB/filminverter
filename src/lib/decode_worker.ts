import init, { decode_image, Image as WasmImage } from '../../rawloader-wasm/pkg/rawloader_wasm.js'
import { deBayer, defaultSettings } from './RawImage'
import type { RawImage, ProcessedImage, CFA, ConversionMatrix } from './RawImage'

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

		// Test
		// const encoded = decoded.encode(decoded.get_data())
		// console.log(encoded == arr)
		//download(arr, "test.RAF", "image")

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
		const deBayered = deBayer(rawImage, cfa)
		const cam_to_xyz: ConversionMatrix = {
			matrix: Array.from(decoded.get_cam_to_xyz()),
			n: 3,
			m: 4
		}
		const processed: ProcessedImage = {
			...deBayered,
			original: arr,
			bps: decoded.get_bps(),
			blacks: Array.from(decoded.get_blacklevels()),
			cam_to_xyz,
			wb_coeffs: Array.from(decoded.get_wb_coeffs()),
			orientation: decoded.get_orientation(),
			settings: defaultSettings,
			iter:0,
			filename: file[1].name,
		}

		postMessage([file[0], processed])
	}
}
