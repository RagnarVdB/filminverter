<script lang="ts">
    import { onMount } from "svelte"
    export let url: { url: string; width: number; height: number }
    let canvas: HTMLCanvasElement
    let ctx

    let wrapper: HTMLDivElement

    async function drawImage(image: {
        url: string
        width: number
        height: number
    }) {
        if (image && image.url && canvas) {
            console.log("drawing main", image)
            canvas.width = wrapper.clientWidth
            canvas.height = wrapper.clientHeight

            const destinationImage = new Image()
            destinationImage.onload = () => {
                // ctx.drawImage(destinationImage, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
                ctx.drawImage(
                    destinationImage,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                )
            }
            destinationImage.src = image.url
            console.log(
                canvas,
                image.width,
                image.height,
                canvas.width,
                canvas.height
            )
        } else {
            console.log("cannot show yet", image, canvas)
        }
    }

    onMount(() => {
        ctx = canvas.getContext("2d")
        drawImage(url)
    })
    $: {
        drawImage(url)
    }
</script>

<div class="view" bind:this={wrapper}>
    <canvas id="imagecanvas" bind:this={canvas} />
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
