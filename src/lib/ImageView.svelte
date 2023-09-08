<script lang="ts">
    import { onMount } from "svelte"
    import { draw } from "./draw"
    import type { ProcessedImage, Trich } from "./RawImage"
    import { images, index } from "../stores"

    export let image: ProcessedImage
    let iter: number = -1
    let rotation = -1
    let zoom = -1
    let canvasRedraw: boolean = true
    let filename: String = ""
    export let canvas: HTMLCanvasElement | null
    let gl: WebGL2RenderingContext
    let wrapper: HTMLDivElement

    function getFileName(image: ProcessedImage): string {
        if (image.kind == "normal" || image.kind == "density") {
            return image.filename
        } else {
            return image.filenames.R
        }
    }

    async function drawImage(image: ProcessedImage) {
        if (image && image.image && canvas) {
            draw(gl, image)
        }
    }

    function setSize(image: ProcessedImage) {
        if (!canvas) return
        let imRatio =
            (image.width * image.settings.zoom[0]) /
            (image.height * image.settings.zoom[1])
        if (image.settings.rotation == 1 || image.settings.rotation == 3) {
            imRatio = 1 / imRatio
        }
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

    function rotateHandle(image: ProcessedImage) {
        if (image && wrapper) {
            if (
                image &&
                (image.settings.rotation != rotation ||
                    image.settings.zoom[0] != zoom)
            ) {
                canvasRedraw = !canvasRedraw
                setTimeout(() => {
                    setSize(image)
                    rotation = image.settings.rotation
                    zoom = image.settings.zoom[0]
                    if (canvas) {
                        const ct = canvas.getContext("webgl2")
                        if (!ct) {
                            throw new Error("WebGL2 not supported")
                        }
                        gl = ct
                    }
                    iter = 0
                }, 50)
            }
        }
    }

    $: rotateHandle(image)

    onMount(() => {
        if (image && image.image) {
            setSize(image)
            if (canvas) {
                const ct = canvas.getContext("webgl2")
                if (!ct) {
                    throw new Error("WebGL2 not supported")
                }
                gl = ct
                drawImage(image)
                iter = 0
            }
        }
    })
    $: {
        if (image && wrapper) {
            if (getFileName(image) != filename) {
                filename = getFileName(image)
                setSize(image)
                if (canvas) {
                    const ct = canvas.getContext("webgl2")
                    if (!ct) {
                        throw new Error("WebGL2 not supported")
                    }
                    gl = ct
                    drawImage(image)
                    iter = image.iter
                }
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
        display: flex;
        justify-content: center;
    }

    #imagecanvas {
        margin: auto;
        padding: none;
        flex-grow: 0;
    }
</style>
