<script lang="ts">
    import { ProcessedImage, showImage } from "./RawImage";
    import { onMount } from "svelte"

    export let image: ProcessedImage
    let canvas: HTMLCanvasElement

    
    async function drawImage() {
        const bitmap = await showImage(image)
        const ctx = canvas.getContext('2d')
        //ctx.translate(canvas.width/4 - 100, 100)
        //ctx.rotate(3*Math.PI/2)
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
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

<style>
    .view {
        width: 100%;
        height: 100%;
    }

    #imagecanvas {
        width: 100%;
        height: 100%;
    }
</style>