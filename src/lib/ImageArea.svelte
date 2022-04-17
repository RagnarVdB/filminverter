<script lang="ts">
    import ImageView from "./ImageView.svelte"
    import type { ProcessedImage } from "./RawImage";

    export let images: ProcessedImage[] = []
    let currentImage: ProcessedImage = images[0]

    $: images: {console.log("images changed", images.map(x => x ? "ok" : x))}
</script>

<div class="ImageArea">
    <div id="main">
        <ImageView image={images[0]} index={0}/>
    </div>
    <div id="strip">
        {#each images as image, index}
        <div class="preview">
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