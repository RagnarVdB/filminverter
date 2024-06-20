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
    let rotation = -1
    let img_element: HTMLImageElement

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
                image.settings.matrix,
                image.kind
            )
            inverted = invertJSColor8bit(
                image.preview,
                conversion_values,
                image.settings.tone_curve,
                image.kind
            )
        } else {
            const conversion_values = getConversionValuesBw(image.settings.bw)
            inverted = invertJSBW8bit(image.preview, conversion_values, image.settings.tone_curve)
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

    function rotate(rotation: number) {
        if (!img_element) return
        console.log("Rotating", rotation)
        const strip_height = img_element.parentElement?.clientHeight
        if (!strip_height) return
        const ratio = image.preview_width / image.preview_height
        console.log(strip_height, ratio)
        if (rotation % 2 == 1) {
            img_element.style.width = `${strip_height}px`
            img_element.style.height = `${strip_height / ratio}px`
            if (rotation == 1) {
                img_element.style.transform = `rotate(${-rotation * 90}deg) translate(-17%, 0px)`
            } else {
                img_element.style.transform = `rotate(${-rotation * 90}deg) translate(17%, 0px)`
            }
        } else {
            img_element.style.transform = `rotate(${-rotation * 90}deg)`
            img_element.style.width = `${strip_height * ratio}px`
            img_element.style.height = `${strip_height}px`
        }
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

    $: {
        if (image && image.settings.rotation != rotation) {
            rotation = image.settings.rotation
            rotate(image.settings.rotation)
        }
    }
</script>

<img class="normal" src={url} alt="" bind:this={img_element} />

<style>
    img {
        height: 100%;
        width: auto;
        margin: 0px;
    }
</style>
