<script lang="ts">
    import { ProcessedImage, showImage } from "./RawImage";
    import { onMount } from "svelte"

    export let image: ProcessedImage
    let canvas: HTMLCanvasElement
    let wrapper: HTMLDivElement

    async function drawImage() {
        const bitmap = await showImage(image)
        canvas.width = wrapper.clientWidth
        canvas.height = wrapper.clientHeight

        const ctx = canvas.getContext('2d')
        const factor = Math.min(canvas.width/image.width, canvas.height, image.height)
        ctx.drawImage(bitmap, 0, 0, image.width, image.height, 0, 0, image.width*factor, image.height*factor)
    }

    $: processed = {
        height: image.height,
        width: image.width,
        image: image.image
    }
    onMount(drawImage)

</script>

<div class="view" bind:this={wrapper}>
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