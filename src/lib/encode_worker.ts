import type { ImageData } from "fast-png"
import { encode } from "fast-png"
import {
    invert,
    invertRaw,
    output_types,
    type OutputResolution,
    type OutputType,
} from "./inversion"
import {
    downSample,
    read_and_demoisaic_raw,
    read_raw,
    type CFA,
    type Image,
    type RawImage,
} from "./RawImage"
import { encodeDNG, encodeImage, encodeRawDNG } from "./tiff_encode"
import luts from "./luts"

function to_be(im: RawImage): ArrayBuffer {
    const out = new ArrayBuffer(im.arr.byteLength)
    const w = im.width
    const h = im.height
    const ox = 0
    const oy = 1
    const view = new DataView(out)
    for (let i = 0; i < w - ox; i++) {
        for (let j = 0; j < h - oy; j++) {
            view.setUint16(
                (j * w + i) * 2,
                im.arr[(j + oy) * w + (i + ox)] * 4,
                false
            )
        }
    }
    return out
}

onmessage = async function (e) {
    const images: [Image, OutputType, OutputResolution][] = e.data
    for (const [image, type, resolution] of images) {
        const {
            filetype,
            cfa_image: cfa_image,
            linear,
            bit_depth,
            little_endian,
            channels,
            apply_tonecurve,
        } = output_types[type]

        let raw_image: RawImage
        let image_buffer
        if (cfa_image) {
            raw_image = await read_raw(image.file)
            const cfa: CFA = {
                str: "RBGBRGGGRGGBGGBGGRBRGRBGGGBGGRGGRGGB",
                width: 6,
                height: 6,
                offset: [-2, 1],
            }
            image_buffer = invertRaw(
                raw_image,
                image.raw_conv_settings,
                image.settings,
                bit_depth,
                linear,
                little_endian,
                apply_tonecurve,
                cfa,
                [0, 1]
            )
        } else {
            if (resolution == 4) {
                raw_image = image.large
            } else if (resolution == 1) {
                raw_image = await read_and_demoisaic_raw(image.file)
            } else {
                const full = await read_and_demoisaic_raw(image.file)
                raw_image = downSample(full, resolution)
            }
            image_buffer = invert(
                raw_image,
                image.raw_conv_settings,
                image.settings,
                channels,
                bit_depth,
                linear,
                little_endian,
                apply_tonecurve
            )
        }
        const date = raw_image.metadata.date

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
                const lut =
                    image.settings.tone_curve == "None"
                        ? [0.0, 1.0]
                        : luts[image.settings.tone_curve]
                const tone_curve: [number, number][] = lut.map((x, i) => [
                    i / (lut.length - 1),
                    x,
                ])
                return encodeDNG(
                    image_buffer,
                    channels,
                    raw_image.width,
                    raw_image.height,
                    tone_curve,
                    false,
                    {}
                )
            } else if (type == "dng_raw16") {
                if (resolution != 1) throw new Error("Raw DNG only full res")
                const lut =
                    image.settings.tone_curve == "None"
                        ? [0.0, 1.0]
                        : luts[image.settings.tone_curve].filter(
                              (_, index) => index % 2 === 0
                          )
                const tone_curve: [number, number][] = lut.map((x, i) => [
                    i / (lut.length - 1),
                    x,
                ])
                return encodeRawDNG(
                    // to_be(raw_image),
                    image_buffer,
                    raw_image.width,
                    raw_image.height,
                    tone_curve,
                    false,
                    date,
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
