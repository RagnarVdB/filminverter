<script lang="ts">
    import ImageView from "./ImageView.svelte"

    import { images, index as currentIndex, mainCanvas } from "../stores"

    import type { ProcessedImage } from "./RawImage"
    import Settings from "./Settings/Settings.svelte"

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
    <!-- <button on:click="{updateAll}">update</button> -->
    <div id="main">
        <ImageView image={$images[$currentIndex]} bind:canvas={$mainCanvas} />
    </div>
    <div id="strip">
        {#each $images as image, index}
            <div
                class="preview"
                on:click={() => {
                    $currentIndex = index
                    console.log("clicked", index)
                    console.log(
                        $images.map((im) => im.settings.advanced.exposure)
                    )
                }}
            >
                <ImageView {image} />
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
        width: 100%;
        height: 100%;
    }
    #strip {
        display: flex;
        flex-direction: row;
        overflow-x: scroll;
        overflow-y: hidden;
        width: 100%;
        height: 100px;
    }

    .preview {
        height: 100%;
    }
</style>
