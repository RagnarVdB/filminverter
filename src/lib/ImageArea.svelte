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
    let canvases: HTMLCanvasElement[] = []
    let iterations: number[] = []
    let urls: {url: string, width: number, height: number}[] = []
    let currentIndex: number = 0

    function updateCanvases(images: ProcessedImage[]) {
        for (let i=0; i<images.length; i++) {
            console.log("updating: images", images)
            console.log("canvases: ", canvases)
            const image = images[i]
            if (!image && !canvases[i]) {
                canvases[i] = undefined
                urls[i] = {url: undefined, width: null, height: null}
            } else if (image && !canvases[i]) {
                canvases[i] = undefined
                urls[i] = {url: undefined, width: image.width, height: image.height}
                setTimeout(() => {updateCanvases(images); console.log("retrying")}, 20)
            } else {
                const canvas = canvases[i]
                if (image.iter != iterations[i]) {
                    draw(canvas, image)
                    urls[i] = {url: canvas.toDataURL("image/png"), width: image.width, height: image.height}
                    urls = urls
                    iterations[i] = image.iter
                }
            }
        }
    }

    $: updateCanvases(images)

</script>

<div class="ImageArea">
    <div id="main">
        <ImageView url={urls[currentIndex]}/>
    </div>
    <div id="strip">
        {#each canvases as canvas, index}
        <div class="preview" on:click={() => {currentIndex = index; console.log("clicked", index)}}>
            <canvas bind:this={canvas}></canvas>
        </div>
        {/each}
    </div>
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