<script lang="ts">
    import ImageView from "./ImageView.svelte"
    import { ProcessedImage, showImage } from "./RawImage";
    import { number_of_workers } from "./utils";

    export let images: ProcessedImage[] = []
    let bitmaps: {bitmap: ImageBitmap; width: number; height: number}[] = []
    let iterations: number[] = []

    let currentIndex: number = 0

    $: {
        for (let i=0; i<images.length; i++) {
            console.log("updating", iterations)
            const image = images[i]
            if (image) {
                if (image.iter != iterations[i]) {
                    // update bitmap
                    showImage(image)
                        .then(bitmap => {
                            bitmaps[i] = {bitmap, width: image.width, height: image.height}
                            iterations[i] = image.iter
                        })
                }
            }
        }
    }

</script>

<div class="ImageArea">
    <div id="main">
        <ImageView image={bitmaps[currentIndex]} index={currentIndex}/>
    </div>
    <div id="strip">
        {#each bitmaps as image, index}
        <div class="preview" on:click={() => {currentIndex = index; console.log("clicked")}}>
            <ImageView image={image} index={index}/>
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