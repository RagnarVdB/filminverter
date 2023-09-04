<script lang="ts">
    import { createEventDispatcher } from "svelte"
    // @ts-ignore
    import Slider from "@bulatdashiev/svelte-slider"
    import Picker from "./Picker.svelte"
    import Zoom from "./Zoom.svelte"
    import type { Settings } from "../RawImage"
    import { getRotationMatrix } from "../RawImage"

    const dispatch = createEventDispatcher()

    type Triple = [number, number, number]

    let toe = true
    let dmin: Triple = [7662, 2939, 1711]
    let exposure: [number, number] = [5, 0]
    let gamma: [number, number] = [0.5, 0]
    let rotation: number = 0
    let zoom: [number, number, number, number] = [1, 1, 0, 0]

    export let settings: Settings


    $: {
        updateSliders(settings)
    }
    $: {
        updateSettings(toe, dmin, exposure, gamma, rotation, zoom)
    }

    function updateSettings(
        toe: boolean,
        dmin: Triple,
        exposure: [number, number],
        gamma: [number, number],
        rotation: number,
        zoom: [number, number, number, number]
    ) {
        if (settings) {
            settings.bw = {
                toe: toe,
                dmin: dmin,
                exposure: exposure[0] - 5,
                gamma: gamma[0],
            }
            settings.rotation = rotation
            settings.rotationMatrix = getRotationMatrix(rotation)
            settings.zoom = zoom
        }
    }

    function updateSliders(sets: Settings) {
        // Sliders change to match settings of selected image
        if (sets.rotation != rotation || sets.zoom != zoom) {
            toe = sets.advanced.toe
            exposure[0] = sets.advanced.exposure + 5
            gamma[0] = sets.advanced.gamma
            rotation = sets.rotation
            dmin = sets.advanced.dmin
            zoom = sets.zoom
        }
    }
</script>

<div class="advanced">
    film border:
    <Picker bind:color={dmin} />

    invert toe:
    <input type="checkbox" bind:checked={toe} />
    <br />
    exposure: {Math.round((exposure[0] - 5) * 100) / 100}
    <Slider bind:value={exposure} min="0" max="10" step="0.05" />

    gamma: {Math.round(gamma[0] * 100) / 100}
    <Slider bind:value={gamma} min="0" max="1" step="0.01" />

    <button
        on:click={() => {
            rotation = (rotation + 1) % 4
        }}>Rotate</button
    >
    <button on:click={() => dispatch("applyAll")}>Apply all</button>
    <button on:click={() => dispatch("save", { all: false })}>Save</button>
    <button on:click={() => dispatch("save", { all: true })}>Save all</button>
    <Zoom bind:zoom />
</div>

<style>
</style>
