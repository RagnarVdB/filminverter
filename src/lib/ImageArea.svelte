<script lang="ts">
    import ImageView from "./ImageView.svelte"
    import type { ProcessedImage } from "./RawImage";

    export let images: ProcessedImage[] = []
    let currentImage: ProcessedImage = images[0]
</script>

<div class="ImageArea">
    <ImageView image={currentImage}/>
    <!-- <div id="strip">
        {#each images as image}
            <ImageView image={image}/>
        {/each}
    </div> -->
</div>

<style>
.ImageArea {
    background-color: white;
    box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

#strip {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100px;
}
</style>