<script lang="ts">
    import { ProcessedImage, showImage } from "./RawImage";
    import { onMount } from "svelte"

    export let image: {bitmap: ImageBitmap; width: number; height: number}
    export let index: number = null
    let prevIter: number = -1
    let canvas: HTMLCanvasElement
    let wrapper: HTMLDivElement

    function drawImage(image: {bitmap: ImageBitmap; width: number; height: number}) {
        if (image && wrapper && canvas) {
            console.log(`drawing ${index}`)
            console.log(wrapper.clientWidth, wrapper.clientHeight)
            console.log(wrapper.offsetWidth, wrapper.offsetHeight)
            console.log(wrapper.style.height)
            console.log(canvas.width, canvas.height)
            canvas.width = wrapper.clientWidth
            canvas.height = wrapper.clientHeight - 4
            console.log(wrapper.clientWidth, wrapper.clientHeight)
            console.log(canvas.width, canvas.height)
    
            const ctx = canvas.getContext('2d')
            const factor = Math.min(canvas.width/image.width, canvas.height, image.height)
            ctx.drawImage(image.bitmap, 0, 0, image.width, image.height, 0, 0, image.width*factor, image.height*factor)
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
        padding: none;
    }

    #imagecanvas {
        width: 100%;
        height: 100%;
        margin: none;
        padding: none;
    }
</style>