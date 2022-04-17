<script lang="ts">
    import { ProcessedImage, showImage } from "./RawImage";
    import { onMount } from "svelte"

    export let image: ProcessedImage
    export let index: number = null
    let prevIter: number = -1
    let canvas: HTMLCanvasElement
    let wrapper: HTMLDivElement

    async function drawImage(image: ProcessedImage) {
        if (!image) {
            console.log(`image ${index} doesn't exist yet`)
        } else if (image.iter == prevIter){
            console.log(`image ${index} didn't change`)
        } else {
            prevIter = image.iter
            console.log(`drawing ${index}`)
            const bitmap = await showImage(image)
            canvas.width = wrapper.clientWidth
            canvas.height = wrapper.clientHeight
    
            const ctx = canvas.getContext('2d')
            const factor = Math.min(canvas.width/image.width, canvas.height, image.height)
            ctx.drawImage(bitmap, 0, 0, image.width, image.height, 0, 0, image.width*factor, image.height*factor)
        }
    }

    onMount(() => drawImage(image))
    $: drawImage(image)

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