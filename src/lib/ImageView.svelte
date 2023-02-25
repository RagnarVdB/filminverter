<script lang="ts">
    import { onMount } from "svelte"
    import { draw } from "./RawImage"
    import type { ProcessedImage } from "./RawImage"
    import { images, index } from "../stores"

    export let image: ProcessedImage
    let iter: number = -1
    let rotation = -1
    let zoom = -1
    let canvasRedraw: boolean = true
    let filename: String = ""
    export let canvas: HTMLCanvasElement = undefined
    let gl: WebGL2RenderingContext
    let wrapper: HTMLDivElement

    async function drawImage(image: ProcessedImage) {
        console.log("drawImage")
        if (image && image.image && canvas) {
            console.log("draw")
            draw(gl, image, true)
        }
    }

    function setSize(image: ProcessedImage) {
        if (image.settings.rotation == 0 || image.settings.rotation == 2) {
            const imRatio = (image.width/image.settings.zoom[0]) / (image.height/image.settings.zoom[1])
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
    }

    function rotateHandle(image) {
        if (image && wrapper) {
            if (image && (image.settings.rotation != rotation || image.settings.zoom[0] != zoom)) {
                canvasRedraw = !canvasRedraw
                setTimeout(() => {
                    setSize(image)
                    rotation = image.settings.rotation
                    zoom = image.settings.zoom[0]
                    gl = canvas.getContext("webgl2")
                    drawImage(image)
                    iter = 0
                }, 50)
            }
            
            // } else if (image && image.settings.zoom[0] != zoom) {
            //     zoom = image.settings.zoom
            //     drawImage(image)
            //     iter = image.iter
            // }
        }
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
    {#key canvasRedraw}
        <canvas id="imagecanvas" bind:this={canvas} />
    {/key}
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
