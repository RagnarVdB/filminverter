<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Slider from '@bulatdashiev/svelte-slider'
    import Picker from "./Picker.svelte"
    import type { Settings } from '../RawImage';

    const dispatch = createEventDispatcher();

    let black: [number, number, number] = [1886, 1657, 1135]
    let gamma: [number, number] = [0.5, 0]
    let fade: [number, number] = [0, 0]
    let rotation: number = 0

    export let settings: Settings

    const m=  1/20

    $: {updateSliders(settings)}
    $: {updateSettings(black, gamma, fade, rotation)}

    function updateSettings(black,gamma, fade, rotation) {
        if (settings) {
            settings.bw = {
                black,
                gamma: gamma[0],
                fade: fade[0]
            }
            settings.rotation = rotation
        }
    }

    function updateSliders(sets: Settings) {
        // Sliders change to match settings of selected image
        if (sets && sets.bw != {
            black,
            fade: fade[0],
            gamma: gamma[0],
        } || sets.rotation != rotation) {
            console.log("updating sliders")
            fade[0] = sets.bw.fade
            gamma[0] = sets.bw.gamma
            rotation = sets.rotation
            black = sets.bw.black
        } 
    }
</script>


<div class="advanced">
    Black:
    <Picker bind:color={black}></Picker>
    
    gamma: {Math.round(gamma[0]*100)/100}
    <Slider bind:value={gamma} min=0 max=1 step=0.01/>
    
    black fade: {Math.round((fade[0])*100)/100}
    <Slider bind:value={fade} min=0 max=10 step=0.05/>

    <button on:click={() => {rotation = (rotation + 1) % 4}}>Rotate</button>
    <button on:click={() => dispatch("applyAll")}>Apply all</button>
    <button on:click={() => dispatch("save", {all: false})}>Save</button>
    <button on:click={() => dispatch("save", {all: true})}>Save all</button>

</div>

<style>

</style>