<script lang="ts">
    import FileSelector from './lib/FileSelector.svelte'
    import ImageArea from './lib/ImageArea.svelte'
    import type { ProcessedImage, Settings as SettingType } from './lib/RawImage'
    import logo from './assets/svelte.png'

    import Presets from './lib/Presets.svelte'
    import Settings from './lib/Settings/Settings.svelte'
    import { create_in_transition } from 'svelte/internal';


    let images: ProcessedImage[] = []
    let currentIndex: number = 0
    let showImages = false
    let settings: SettingType = {gamma: [2, 2, 2], offset: [0, 1, 2]}

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

    function changeSettings(settings: SettingType) {
        console.log("Changing settings", currentIndex)
        const current = images[currentIndex]
        if (current) {
            current.settings = settings
            current.iter += 1
            images = images
        } else {
            console.log("No image selected")
        }
    }

    function imageChange(index: number) {
        if (images[index]) {
            settings = images[index].settings
            console.log("index changed", index)
        }
    }

    $: {changeSettings(settings)}
    $: {imageChange(currentIndex)}

</script>

<main>
    {#if showImages}
    <ImageArea images={images} bind:currentIndex={currentIndex}/>
    {:else}
    <FileSelector on:image={receivedImage}/>
    {/if}
    <Settings bind:settings={settings}/>
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
