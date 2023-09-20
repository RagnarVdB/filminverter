<script lang="ts">
    import { onMount } from "svelte"
    import type { ProcessedImage } from "./RawImage"
    // @ts-ignore
    import UPNG from "upng-js"
    import {
        getConversionValuesBw,
        getConversionValuesColor,
        invertJSBW8bit,
        invertJSColor8bit,
    } from "./inversion"

    export let image: ProcessedImage
    let url: string = ""
    let iter: number = -1

    function getPreview(image: ProcessedImage): string {
        let inverted: Uint8Array
        if (!image) {
            console.log("No image")
            return ""
        }
        console.log("Rendering preview")
        if (image.settings.mode == "basic") {
            throw new Error("Basic mode not supported")
        } else if (image.settings.mode == "advanced") {
            const conversion_values = getConversionValuesColor(
                image.settings.advanced,
                image.kind
            )
            inverted = invertJSColor8bit(
                image.preview,
                conversion_values,
                image.kind
            )
        } else {
            const conversion_values = getConversionValuesBw(image.settings.bw)
            inverted = invertJSBW8bit(image.preview, conversion_values)
        }
        const png = UPNG.encode(
            [inverted.buffer],
            image.preview_width,
            image.preview_height,
            0
        )
        const blob = new Blob([png], { type: "image/png" })
        const url = URL.createObjectURL(blob)
        return url
    }

    onMount(() => {
        url = getPreview(image)
        iter = 0
    })

    $: {
        if (image && image.iter != iter) {
            const new_iter = image.iter
            setTimeout(() => {
                if (image.iter == new_iter) {
                    url = getPreview(image)
                    iter = image.iter
                }
            }, 100)
        }
    }
</script>

<img src={url} alt="" />

<style>
    img {
        height: 100%;
        width: auto;
        margin: 0px;
    }
</style>
