<script lang="ts">
    import Slider from '@bulatdashiev/svelte-slider'
    import type { Settings } from '../RawImage';

    let gr = [1, 0]
    let or = [1, 0]
    let gg = [1, 0]
    let og = [1, 0]
    let gb = [1, 0]
    let ob = [1, 0]

    export let settings: Settings
    $: settings = {
        gamma: [gr[0], gg[0], gb[0]],
        offset: [or[0], og[0], ob[0]]
    }
</script>


<div class="advanced">
    gamma red: {gr[0]}
    <Slider bind:value={gr}/>

    offset red: {or[0]}
    <Slider bind:value={or}/>

    gamma green: {gg[0]}
    <Slider bind:value={gg}/>

    offset green: {og[0]}
    <Slider bind:value={og}/>

    gamma blue: {gb[0]}
    <Slider bind:value={gb}/>

    offset blue: {ob[0]}
    <Slider bind:value={ob}/>

</div>

<style>

</style>