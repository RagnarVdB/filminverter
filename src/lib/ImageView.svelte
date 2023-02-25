<script lang="ts">
    import { onMount } from "svelte"
    import { draw } from "./RawImage"
    import type { ProcessedImage } from "./RawImage"
    import { images, index } from "../stores"

    export let image: ProcessedImage
    let iter: number = -1
    let rotation = -1
    let filename: String = ""
    export let canvas: HTMLCanvasElement = undefined
    let gl: WebGL2RenderingContext
    let wrapper: HTMLDivElement

    async function drawImage(image: ProcessedImage) {
        if (image && image.image && canvas) {
            draw(gl, image, true, 60)
        }
    }

    function setSize(image: ProcessedImage) {
        if (image && image.settings.rotation != rotation) {
            if (image.settings.rotation == 0 || image.settings.rotation == 2) {
                const imRatio = image.width / image.height
                const wrapperRatio = wrapper.clientWidth / wrapper.clientHeight
                console.log(imRatio, wrapperRatio)
                if (imRatio > wrapperRatio) {
                    canvas.width = wrapper.clientWidth
                    canvas.height = wrapper.clientWidth / imRatio
                } else {
                    canvas.height = wrapper.clientHeight
                    canvas.width = wrapper.clientHeight * imRatio
                }
            } else {
                const imRatio = image.height / image.width
                const wrapperRatio = wrapper.clientWidth / wrapper.clientHeight
                console.log(imRatio, wrapperRatio)
                if (imRatio > wrapperRatio) {
                    canvas.width = wrapper.clientWidth
                    canvas.height = wrapper.clientWidth / imRatio
                } else {
                    canvas.height = wrapper.clientHeight
                    canvas.width = wrapper.clientHeight * imRatio
                }
            }
            rotation = image.settings.rotation
        }
    }

    function rotateHandle(image) {
        if (image && wrapper) setSize(image)
    }

    $: rotateHandle(image)

    onMount(() => {
        if (image && image.image) {
            setSize(image)
            gl = canvas.getContext("webgl2")
            drawImage(image)
            iter = 0
        }
    })
    $: {
        if (image && wrapper) {
            if (image.filename != filename) {
                filename = image.filename
                setSize(image)
                gl = canvas.getContext("webgl2")
                drawImage(image)
                iter = image.iter
            } else if (image.iter != iter) {
                drawImage(image)
                iter = image.iter
            } else {
                console.log("not updating")
            }
        } else {
            console.log("Updating nonexisting image", image, wrapper)
            console.log($images.length, $index, $images)
        }
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
        margin: none;
        padding: none;
    }
</style>
