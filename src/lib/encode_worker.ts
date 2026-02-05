import type { ImageData } from "fast-png"
import { encode } from "fast-png"
import { invertColor, output_types, type OutputType } from "./inversion"
import { read_raw, type Image } from "./RawImage"
import { encodeImage } from "./tiff_encode"

onmessage = async function (e) {
    const images: [Image, OutputType][] = e.data
    for (const [image, type] of images) {
        const { filetype, linear, bit_depth, little_endian, channels } =
            output_types[type]
        const raw_image = await read_raw(image.file)
        // For faster testing
        // const raw_image = image.large
        const image_buffer = invertColor(
            raw_image,
            image.raw_conv_settings,
            image.settings,
            3,
            // 4,
            channels,
            bit_depth,
            linear,
            little_endian
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
                const png = encode(imdata)
                return png.buffer as ArrayBuffer
            } else if (type == "png8") {
                const imdata: ImageData = {
                    data: new Uint8Array(image_buffer),
                    width: raw_image.width,
                    height: raw_image.height,
                    channels: 3,
                    depth: 8,
                }
                return encode(imdata).buffer as ArrayBuffer
            } else if (
                type == "tiff8" ||
                type == "tiff16" ||
                type == "tiff32"
            ) {
                return encodeImage(
                    image_buffer,
                    raw_image.width,
                    raw_image.height,
                    {}
                )
            } else {
                throw new Error("unimplemented")
            }
        })()

        const url = URL.createObjectURL(
            new Blob([file_buffer], { type: "image/tiff" })
        )
        postMessage([filename, url])
    }
}
