<script lang="ts">
    import Slider from '@bulatdashiev/svelte-slider'
    import Picker from "./Picker.svelte"
    import type { Settings } from '../RawImage';

    let neutral: [number, number, number] = [1886, 1657, 1135]
    let exposure: [number, number] = [5, 0]
    let gamma: [number, number] = [0.5, 0]
    let facG: [number, number] = [5, 0]
    let facB: [number, number] = [5, 0]

    export let settings: Settings

    const m=  1/20

    $: { if (settings)
            settings.advanced = {
            neutral: neutral,
            exposure: exposure[0] - 5,
            gamma: gamma[0],
            facG: m*facG[0]-5*m+1,
            facB: m*facB[0]-5*m+1
        }}

    function updateSettings(sets: Settings) {
        // Sliders change to match settings of selected image
        if (sets && sets.advanced != {
            neutral: neutral,
            exposure: exposure[0] - 5,
            gamma: gamma[0],
            facG: m*facG[0]-5*m+1,
            facB: m*facB[0]-5*m+1
        }) {
            exposure[0] = sets.advanced.exposure + 5
            gamma[0] = sets.advanced.gamma
            facG[0] = (sets.advanced.facG-1+5*m)/m
            facB[0] = (sets.advanced.facB-1+5*m)/m
        } 
    }

    $: {updateSettings(settings)}
</script>


<div class="advanced">
    Neutral:
    <Picker bind:color={neutral}></Picker>

    exposure: {Math.round((exposure[0]-5)*100)/100}
    <Slider bind:value={exposure} min=0 max=10 step=0.05/>
    
    gamma: {Math.round(gamma[0]*100)/100}
    <Slider bind:value={gamma} min=0 max=1 step=0.05/>
    
    factor blue: {Math.round((facB[0]-5)*100)/100}
    <Slider bind:value={facB} min=0 max=10 step=0.05/>

    factor green: {Math.round((facG[0]-5)*100)/100}
    <Slider bind:value={facG} min=0 max=10 step=0.05/>
</div>

<style>

</style>