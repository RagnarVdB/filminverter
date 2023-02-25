<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import Slider from "@bulatdashiev/svelte-slider"
    import Picker from "./Picker.svelte"
    import Zoom from "./Zoom.svelte"
    import type { Settings } from "../RawImage"

    const dispatch = createEventDispatcher()

    let neutral: [number, number, number] = [1886, 1657, 1135]
    let exposure: [number, number] = [5, 0]
    let blue: [number, number] = [5, 0]
    let green: [number, number] = [5, 0]
    let gamma: [number, number] = [0.5, 0]
    let facB: [number, number] = [5, 0]
    let facG: [number, number] = [5, 0]
    let rotation: number = 0
    let zoom: [number, number, number, number] = [1, 1, 0, 0]

    export let settings: Settings

    const m = 1 / 5
    const m2 = 1/3

    $: {
        updateSliders(settings)
    }
    $: {
        updateSettings(
            neutral,
            exposure,
            blue,
            green,
            gamma,
            facB,
            facG,
            rotation,
            zoom
        )
    }

    function updateSettings(
        neutral: [number, number, number],
        exposure: [number, number],
        blue: [number, number],
        green: [number, number],
        gamma: [number, number],
        facB: [number, number],
        facG: [number, number],
        rotation: number,
        zoom: [number, number, number, number]
    ) {
        if (settings) {
            settings.advanced = {
                neutral: neutral,
                exposure: exposure[0] - 5,
                blue: m2 * blue[0] - 5 * m2 + 1,
                green: m2 * green[0] - 5 * m2 + 1,
                gamma: gamma[0],
                facB: m * facB[0] - 5 * m + 1,
                facG: m * facG[0] - 5 * m + 1,
            }
            settings.rotation = rotation
            settings.zoom = zoom
        }
    }

    function updateSliders(sets: Settings) {
        // Sliders change to match settings of selected image
        if (sets || sets.rotation != rotation || sets.zoom != zoom) {
            exposure[0] = sets.advanced.exposure + 5
            blue[0] = (sets.advanced.blue - 1 + 5 * m2) / m2
            green[0] = (sets.advanced.green - 1 + 5 * m2) / m2
            gamma[0] = sets.advanced.gamma
            facG[0] = (sets.advanced.facG - 1 + 5 * m) / m
            facB[0] = (sets.advanced.facB - 1 + 5 * m) / m
            rotation = sets.rotation
            neutral = sets.advanced.neutral
            zoom = sets.zoom
        }
    }
</script>

<div class="advanced">
    Neutral:
    <Picker bind:color={neutral} />

    exposure: {Math.round((exposure[0] - 5) * 100) / 100}
    <Slider bind:value={exposure} min="0" max="10" step="0.05" />

    blue: {Math.round((blue[0] - 5) * 100) / 100}
    <Slider bind:value={blue} min="0" max="10" step="0.05" />

    green: {Math.round((green[0] - 5) * 100) / 100}
    <Slider bind:value={green} min="0" max="10" step="0.05" />

    gamma: {Math.round(gamma[0] * 100) / 100}
    <Slider bind:value={gamma} min="0" max="1" step="0.01" />

    factor blue: {Math.round((facB[0] - 5) * 100) / 100}
    <Slider bind:value={facB} min="0" max="10" step="0.05" />

    factor green: {Math.round((facG[0] - 5) * 100) / 100}
    <Slider bind:value={facG} min="0" max="10" step="0.05" />

    <button
        on:click={() => {
            rotation = (rotation + 1) % 4
        }}>Rotate</button
    >
    <button on:click={() => dispatch("applyAll")}>Apply all</button>
    <button on:click={() => dispatch("save", { all: false })}>Save</button>
    <button on:click={() => dispatch("save", { all: true })}>Save all</button>
    <Zoom bind:zoom={zoom}></Zoom>
</div>

<style>
</style>
