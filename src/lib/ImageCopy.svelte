<script lang="ts">
    import { onMount } from "svelte"
    import type { ProcessedImage } from "./RawImage"
    // @ts-ignore
    import UPNG from "upng-js"
    import { getConversionValuesColor, invertJSColor8bit } from "./inversion"
    
    export let image: ProcessedImage
    let url: string = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Wiki_Test_Image.jpg/800px-Wiki_Test_Image.jpg"

    function getPreview(image: ProcessedImage): string {
        if (!image) throw new Error("No image")
        const conversion_values = getConversionValuesColor(image.settings.advanced, image.kind)
        const inverted = invertJSColor8bit(image.preview, conversion_values, image.kind)
        const png = UPNG.encode([inverted.buffer], image.preview_width, image.preview_height, 0)
        const blob = new Blob([png], { type: "image/png" })
        const url = URL.createObjectURL(blob)
        return url
        
    }

    $: url = getPreview(image)
    onMount(() => {
        url = getPreview(image)
    })



</script>

<div class="view">
    <img
        src={url}
        alt=""
    />
</div>

<style>
    .view {
        width: 100%;
        height: 100%;
        padding: none;
    }

    .view img {
        width: 100%;
        height: 100%;
        margin: none;
        padding: none;
    }
</style>
