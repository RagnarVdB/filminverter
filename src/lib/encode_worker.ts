import type { ImageData } from "fast-png"
import { encode } from "fast-png"
import {
    invertColor,
    output_types,
    type OutputResolution,
    type OutputType,
} from "./inversion"
import { downSample, read_and_demoisaic_raw, type Image } from "./RawImage"
import { encodeDNG, encodeImage } from "./tiff_encode"

onmessage = async function (e) {
    const images: [Image, OutputType, OutputResolution][] = e.data
    for (const [image, type, resolution] of images) {
        const { filetype, linear, bit_depth, little_endian, channels } =
            output_types[type]

        let raw_image
        if (resolution == 4) {
            raw_image = image.large
        } else if (resolution == 1) {
            raw_image = await read_and_demoisaic_raw(image.file)
        } else {
            const full = await read_and_demoisaic_raw(image.file)
            raw_image = downSample(full, resolution)
        }
        // For faster testing
        const image_buffer = invertColor(
            raw_image,
            image.raw_conv_settings,
            image.settings,
            channels,
            bit_depth,
            linear,
            little_endian
        )

        console.log("Done inverting")
        const filename = image.file.name.split(".")[0] + "." + filetype
        const file_buffer: ArrayBuffer = (() => {
            const data =
                bit_depth == 8
                    ? new Uint8Array(image_buffer)
                    : new Uint16Array(image_buffer)
            if (filetype == "png") {
                if (bit_depth == 32) throw new Error("32-bit PNG doesn't exist")
                const imdata: ImageData = {
                    data,
                    width: raw_image.width,
                    height: raw_image.height,
                    channels: 3,
                    depth: bit_depth,
                }
                const png = encode(imdata)
                return png.buffer as ArrayBuffer
            } else if (filetype == "tiff") {
                return encodeImage(
                    image_buffer,
                    channels,
                    raw_image.width,
                    raw_image.height,
                    {}
                )
            } else if (type == "dng_dem16") {
                return encodeDNG(
                    image_buffer,
                    channels,
                    raw_image.width,
                    raw_image.height,
                    {}
                )
            } else {
                throw new Error("unimplemented " + type)
            }
        })()

        const url = URL.createObjectURL(
            new Blob([file_buffer], { type: "image/tiff" })
        )
        postMessage([filename, url])
    }
}
