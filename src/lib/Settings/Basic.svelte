<script lang="ts">
    import Slider from "@bulatdashiev/svelte-slider"
    import type { Settings } from "../RawImage"

    let exposure = [1, 0]
    let contrast = [1, 0]
    let temperature = [1, 0]
    let tint = [1, 0]

    const mask = [1000, 1000, 1000]
</script>

<div class="basic">
    exposure: {exposure[0]}
    <Slider bind:value={exposure} />

    contrast: {contrast[0]}
    <Slider bind:value={contrast} />

    temperature: {temperature[0]}
    <Slider bind:value={temperature} />

    tint: {tint[0]}
    <Slider bind:value={tint} />
</div>

<style>
</style>
