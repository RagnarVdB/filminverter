<script lang="ts">
    import Slider from '@bulatdashiev/svelte-slider'
    import type { Settings } from '../RawImage';

    let exposure: [number, number] = [10, 0]
    let temp: [number, number] = [10, 0]
    let tint: [number, number] = [10, 0]
    let gr: [number, number] = [0.5, 0]
    let gg: [number, number] = [0.5, 0]
    let gb: [number, number] = [0.5, 0]

    export let settings: Settings


    $: settings = {
        gamma: [gr[0], gg[0], gb[0]],
        // offset: [exposure[0]*temp[0], exposure[0], exposure[0]*tint[0]],
        offset: [exposure[0], temp[0], tint[0]],
        light: [17543, 13269, 15134]
    }

    function updateSettings(sets: Settings) {
        // Sliders change to match settings of selected image
        if (sets != {
            gamma: [gr[0], gg[0], gb[0]],
            // offset: [exposure[0]*temp[0], exposure[0], exposure[0]*tint[0]],
            offset: [exposure[0], temp[0], tint[0]],
            light: [9694, 9548, 7324]
        }) {
            gr[0] = sets.gamma[0]
            temp[0] = sets.offset[1]
            gg[0] = sets.gamma[1]
            exposure[0] = sets.offset[0]
            gb[0] = sets.gamma[2]
            tint[0] = sets.offset[2]
        } 
    }

    $: {updateSettings(settings)}
</script>


<div class="advanced">
    exposure: {exposure[0]}
    <Slider bind:value={exposure} min=0 max=20 step=0.1/>

    temperature: {temp[0]}
    <Slider bind:value={temp} min=0 max=20 step=0.1/>
    
    tint: {tint[0]}
    <Slider bind:value={tint} min=0 max=20 step=0.1/>
    
    gamma red: {gr[0]}
    <Slider bind:value={gr} min=0 max=3 step=0.05/>
    
    gamma green: {gg[0]}
    <Slider bind:value={gg} min=0 max=3 step=0.05/>

    gamma blue: {gb[0]}
    <Slider bind:value={gb} min=0 max=3 step=0.05/>
</div>

<style>

</style>