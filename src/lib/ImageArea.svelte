<script lang="ts">
    import ImageView from "./ImageView.svelte"

    import { images, index as currentIndex, mainCanvas } from "../stores"

    import type { ProcessedImage } from "./RawImage"
    import ImagePreview from "./ImagePreview.svelte"

    type cvsobj = {
        canvas: HTMLCanvasElement
        width: number
        image: ProcessedImage
        height: number
        iteration: number
    }

    let iterations: number[] = []
</script>

<div class="ImageArea">
    <ImageView image={$images[$currentIndex]} bind:canvas={$mainCanvas} />
    <div id="strip">
        {#each $images as image, index}
            <div
                class="preview"
                on:click={() => {
                    $currentIndex = index
                }}
            >
                <ImagePreview {image} />
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
        grid-template-rows: 8fr 1fr;
        grid-template-columns: 1fr;
        gap: 0px 0px;
        height: 100%;
        width: 100%;
        min-height: 0;
        min-width: 0;
    }

    #strip {
        display: flex;
        flex-direction: row;
        overflow-x: scroll;
        overflow-y: hidden;
        min-height: 0;
        min-width: 0;
        height: 100%;
        padding: 0px;
    }

    .preview {
        height: 100%;
        margin-right: 3px;
        padding: 0px;
    }
</style>
