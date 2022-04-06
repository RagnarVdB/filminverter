<script lang="ts">
    import { ProcessedImage, showImage } from "./RawImage";
    import { onMount } from "svelte"

    export let image: ProcessedImage
    let canvas: HTMLCanvasElement

    
    async function drawImage() {
        const bitmap = await showImage(image)
        canvas.width = processed.width
        canvas.height = processed.height
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0)
    }

    $: processed = {
        height: image.height,
        width: image.width,
        image: image.image
    }
    onMount(drawImage)

</script>

<div class="view">
    <canvas id="imagecanvas" bind:this={canvas}></canvas>
</div>