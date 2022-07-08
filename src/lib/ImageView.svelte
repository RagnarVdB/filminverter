<script lang="ts">
    import { onMount } from "svelte"
    import { draw } from "./RawImage";
    import type { ProcessedImage } from "./RawImage";


    export let image: ProcessedImage
    let iter: number = -1
    let filename: String = ""
    let canvas: HTMLCanvasElement
    let gl: WebGL2RenderingContext
    let program: WebGLProgram
    let wrapper: HTMLDivElement

    async function drawImage(image: ProcessedImage) {
        if (image && image.image && canvas) {
            draw(gl, image, true)
        }
    }
    
    function setSize(image: ProcessedImage) {
        const imRatio = image.width/image.height
        const wrapperRatio = wrapper.clientWidth/wrapper.clientHeight

        if (imRatio > wrapperRatio) {
            canvas.width = wrapper.clientWidth
            canvas.height = wrapper.clientWidth/imRatio
        } else {
            canvas.height = wrapper.clientHeight
            canvas.width = wrapper.clientHeight*imRatio
        }
    }
    
    onMount(() => {
        if (image && image.image) {
            setSize(image)
            gl = canvas.getContext("webgl2")
            // setUpShaders(gl)
            //     .then(pg=> {
            //         program = pg
            //         drawImage(image);
            //         iter = 0
            //     })
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
                // setUpShaders(gl)
                //     .then(pg=> {
                //         program = pg
                //         drawImage(image);
                //         iter = image.iter
                //     })
                drawImage(image);
                iter = image.iter
            } else if (image.iter != iter) {
                drawImage(image)
                iter = image.iter
            } else {
                console.log("Not updating")
            }
        } else {
            console.log("Updating nonexisting image")
        }
    }

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
        margin: none;
        padding: none;
    }

</style>