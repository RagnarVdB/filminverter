import type { ImageData } from "fast-png";
import { encode } from "fast-png";
import { invertColorRGB, outputTypes, type OutputType } from "./inversion";
import { read_raw, type Image } from "./RawImage";


function image_to_png(arr: Float32Array): Uint8Array {
    throw new Error("unimplemented")
}


onmessage = async function (e) {
    const images: [Image, OutputType][] = e.data
    for (const [image, type] of images) {
        const { filetype, linear, bit_depth, little_endian } = outputTypes[type]
        const raw_image = await read_raw(image.file)
        const image_buffer = invertColorRGB(raw_image, image.raw_conv_settings,
            image.settings, bit_depth, linear, little_endian
        )
        console.log("Done inverting")
        const filename = image.file.name.replace("rgb", filetype)
        const file_buffer: ArrayBuffer = (() => {
            if (type == "png16") {
                const imdata: ImageData = {
                    data: new Uint16Array(image_buffer),
                    width: raw_image.width,
                    height: raw_image.height,
                    channels: 3,
                    depth: 16,
                }
                const png = encode(
                    imdata
                )
                return png.buffer as ArrayBuffer
            } else if (type == "png8") {
                const imdata: ImageData = {
                    data: new Uint8Array(image_buffer),
                    width: raw_image.width,
                    height: raw_image.height,
                    channels: 3,
                    depth: 8,
                }
                const png = encode(
                    imdata
                )
                return png.buffer as ArrayBuffer
            } else {
                throw new Error("unimplemented")
            }
        })()


        const url = URL.createObjectURL(new Blob([file_buffer], { type: "image/tiff" }))
        postMessage([filename, url])
    }
}
