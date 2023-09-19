<script lang="ts">
    import { onMount } from "svelte"
    import type { ProcessedImage } from "./RawImage"
    // @ts-ignore
    import UPNG from "upng-js"
    import { getConversionValuesColor, invertJSColor8bit } from "./inversion"

    export let image: ProcessedImage
    let url: string =
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Wiki_Test_Image.jpg/800px-Wiki_Test_Image.jpg"
    let iter: number = -1

    function getPreview(image: ProcessedImage): string {
        if (!image) throw new Error("No image")
        console.log("Rendering preview")
        const conversion_values = getConversionValuesColor(
            image.settings.advanced,
            image.kind
        )
        const inverted = invertJSColor8bit(
            image.preview,
            conversion_values,
            image.kind
        )
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

<img src={url} alt=""/>

<style>
    img {
        height: 100%;
        width: auto;
        margin: 0px;
    }
</style>
