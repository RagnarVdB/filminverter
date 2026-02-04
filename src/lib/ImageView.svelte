<script lang="ts">
    import { onMount } from "svelte"
    import { draw } from "./draw"
    import type { Image } from "./RawImage"

    export let image: Image
    let iter: number = -1
    let rotation = -1
    let zoom = -1
    let canvasRedraw: boolean = true
    let filename: String = ""
    export let canvas: HTMLCanvasElement | null
    let gl: WebGL2RenderingContext
    let wrapper: HTMLDivElement

    async function drawImage(image: Image) {
        if (image && image.large.arr && canvas) {
            draw(gl, image)
        }
    }

    function setSize(image: Image) {
        if (!canvas) return
        const dpr = window.devicePixelRatio || 1
        let imRatio =
            (image.large.width * image.settings.zoom[0]) /
            (image.large.height * image.settings.zoom[1])
        if (image.settings.rotation == 1 || image.settings.rotation == 3) {
            imRatio = 1 / imRatio
        }
        const { width, height } = wrapper.getBoundingClientRect()
        const wrapperRatio = width / height
        if (imRatio > wrapperRatio) {
            canvas.width = Math.round(width * dpr)
            canvas.style.width = width + "px"
            canvas.height = Math.round((width / imRatio) * dpr)
            canvas.style.height = width / imRatio + "px"
        } else {
            canvas.height = Math.round(height * dpr)
            canvas.style.height = height + "px"
            canvas.width = Math.round(height * imRatio * dpr)
            canvas.style.width = height * imRatio + "px"
        }
        // const ct = canvas.getContext("webgl2")
        // if (!ct) throw new Error("WebGL2 not supported")
        // ct.scale()
    }

    function rotateHandle(image: Image) {
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
        if (image && image.large.arr) {
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
            if (image.file.name != filename) {
                filename = image.file.name
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
        }
    }

    canvas?.addEventListener("webglcontextlost", (e) => {
        e.preventDefault()
        console.log("WebGL context lost")
    })
</script>

<div class="view" bind:this={wrapper}>
    {#key canvasRedraw}
        <canvas id="imagecanvas" bind:this={canvas} />
    {/key}
</div>

<style>
    .view {
        /* width: 100%;
        height: 100%; */
        padding: none;
        display: flex;
        justify-content: center;
    }

    #imagecanvas {
        margin: auto;
        padding: none;
        flex-grow: 0;
        /* width: 100%;
        height: 100%; */
    }
</style>
