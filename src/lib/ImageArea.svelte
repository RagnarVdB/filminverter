<script lang="ts">
    import ImageView from "./ImageView.svelte"
    import { ProcessedImage, draw } from "./RawImage";

    type cvsobj = {
        canvas: HTMLCanvasElement, 
        width: number,
        image: ProcessedImage,
        height: number,
        iteration: number
    }


    export let images: ProcessedImage[] = []
    let canvases: cvsobj[] = []
    let currentIndex: number = 0
    $: currentCanvas = canvases[currentIndex]

    function updateCanvases(images: ProcessedImage[]) {
        for (let i=0; i<images.length; i++) {
            console.log("updating: images", images)
            console.log("canvases: ", canvases)
            const image = images[i]
            if (!image && !canvases[i]) {
                canvases[i] = {
                        canvas: undefined,
                        width: null,
                        height: null,
                        image: null,
                        iteration: -1
                    }
            } else if (image && !canvases[i]) {
                canvases[i] = {
                        canvas: undefined,
                        width: image.width,
                        height: image.height,
                        image: image,
                        iteration: -1
                    }
                setTimeout(() => {updateCanvases(images); console.log("retrying")}, 20)
            } else if (image && !canvases[i].width) {
                canvases[i].width = image.width
                canvases[i].height = image.height
                canvases[i].image = image
            } else {
                const canvas = canvases[i]
                if (image.iter != canvas.iteration) {
                    draw(canvas.canvas, image)
                    canvases = canvases
                    canvas.iteration = image.iter
                }
            }




            // if (!canvases[i]) {
            //     console.log("setting canvas", i)
            //     canvases[i] = {
            //         canvas: undefined,
            //         width: image.width,
            //         height: image.height,
            //         image: null,
            //         iteration: -1
            //     }
            //     setTimeout(() => {updateCanvases(images); console.log("retrying")}, 20)
            // } else if (image) {
            //     const canvas = canvases[i]
            //     if (image.iter != canvas.iteration) {
            //         draw(canvas.canvas, image)
            //         canvases = canvases
            //         canvas.iteration = image.iter
            //     }
            // }
        }
    }

    $: updateCanvases(images)

</script>

<div class="ImageArea">
    <div id="main">
        <ImageView image={currentCanvas}/>
    </div>
    <div id="strip">
        {#each canvases as canvas, index}
        <div class="preview" on:click={() => {currentIndex = index; console.log("clicked", index)}}>
            <canvas bind:this={canvas.canvas}></canvas>
        </div>
        {/each}
    </div>
    <button on:click={() => {draw(canvases[0].canvas, images[0])}}></button>
</div>

<style>
.ImageArea {
    background-color: white;
    box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
    border-radius: 15px;
    display: grid;
    grid-template-rows: 4fr 1fr;
    gap: 0px 0px;
    height: 100%;
    width: 100%;
}

#main {
    height: auto;
}
#strip {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100px;
}

.preview {
    height: 100%
}
</style>