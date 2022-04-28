<script lang="ts">
    import { onMount } from "svelte"
    import { draw } from "./RawImage"
    import type {ProcessedImage} from "./RawImage"
    type cvsobj = {
        canvas: HTMLCanvasElement, 
        width: number,
        image: ProcessedImage,
        height: number,
        iteration: number
    }

    export let image: cvsobj
    let canvas: HTMLCanvasElement
    let ctx

    let wrapper: HTMLDivElement

    function drawImage(image: cvsobj) {
        if (image && image.canvas && canvas && image.image) {
            console.log("drawing main", image)
            //canvas.width = wrapper.clientWidth
            //canvas.height = wrapper.clientHeight
            // ctx.rect(0, 0, 100, 100)
            // ctx.stroke()
            // draw(image.canvas, image.image)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(image.canvas, 0, 0)
            console.log(canvas, image.width, image.height, canvas.width, canvas.height)
        } else {
            console.log("cannot show yet", image, canvas)
        }
    }

    onMount(() => {
        ctx = canvas.getContext("2d")
        drawImage(image);
    })
    $: {drawImage(image)}

</script>

<div class="view" bind:this={wrapper}>
    <button on:click={() => drawImage(image)}></button>
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