<script lang="ts">
    import logo from './assets/svelte.png'
    import FileSelector from './lib/FileSelector.svelte'
    import ImageArea from './lib/ImageArea.svelte'
    import Presets from './lib/Presets.svelte'
    import Settings from './lib/Settings/Settings.svelte'
    import type { ProcessedImage } from './lib/RawImage'

    let images: ProcessedImage[] = []
    let showImages = false

    setTimeout(() => {
        //images[0].blacks = [0, 0, 0, 0]
        //console.log("changing")
    }, 40000)
    function receivedImage(event) {
        const { index, image }: { index: number, image: ProcessedImage } = event.detail
        console.log("received: ", index) 
        if (index > images.length) {
            for (let i=0; i<index; i++) {
                images[i] = null
            }
        }
        images[index] = image

        showImages = true
    }

</script>

<main>
    {#if showImages}
    <ImageArea images={images}/>
    {:else}
    <FileSelector on:image={receivedImage}/>
    {/if}
    <Settings/>
    <!-- <Presets/> -->
</main>

<style>
:root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

  main {
    display: grid;
    /* grid-template-columns: 5fr 2fr 1fr; */
    grid-template-columns: 6fr 2fr;
    column-gap: 15px;
    height: calc(100vh - 30px);
    margin: 15px;
    padding: 0;
  }
</style>
