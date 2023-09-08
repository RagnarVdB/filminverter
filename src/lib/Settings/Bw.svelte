<script lang="ts">
    import { createEventDispatcher } from "svelte"
    // @ts-ignore
    import Slider from "@bulatdashiev/svelte-slider"
    import Picker from "./Picker.svelte"
    import Zoom from "./Zoom.svelte"
    import type { Settings } from "../RawImage"
    import { getRotationMatrix } from "../rotation"

    const dispatch = createEventDispatcher()
    type Triple = [number, number, number]

    let toe = true
    let blackpoint: Triple = [0, 0, 0]
    let exposure: [number, number] = [5, 0]
    let gamma: [number, number] = [0.5, 0]
    let toe_width: [number, number] = [0.2, 0]
    let blackpoint_shift: [number, number] = [0.5, 0]

    let rotation: number = 0
    let zoom: [number, number, number, number] = [1, 1, 0, 0]

    export let settings: Settings


    $: {
        updateSliders(settings)
    }
    $: {
        updateSettings(toe, blackpoint, exposure, gamma, toe_width, blackpoint_shift, rotation, zoom)
    }

    function updateSettings(
        toe: boolean,
        dmin: Triple,
        exposure: [number, number],
        gamma: [number, number],
        toe_width: [number, number],
        blackpoint_shift: [number, number],
        rotation: number,
        zoom: [number, number, number, number]
    ) {
        if (settings) {
            settings.bw = {
                toe: toe,
                blackpoint: dmin,
                exposure: exposure[0] - 5,
                gamma: gamma[0],
                toe_width: toe_width[0],
                blackpoint_shift: blackpoint_shift[0] - 0.5,
            }
            settings.rotation = rotation
            settings.rotationMatrix = getRotationMatrix(rotation)
            settings.zoom = zoom
        }
    }

    function updateSliders(sets: Settings) {
        // Sliders change to match settings of selected image
        if (sets.rotation != rotation || sets.zoom != zoom) {
            toe = sets.bw.toe
            exposure[0] = sets.bw.exposure + 5
            gamma[0] = sets.bw.gamma
            toe_width[0] = sets.bw.toe_width
            blackpoint_shift[0] = sets.bw.blackpoint_shift + 0.5
            rotation = sets.rotation
            blackpoint = sets.bw.blackpoint
            zoom = sets.zoom
        }
    }
</script>

<div class="bw">
    film border:
    <Picker bind:color={blackpoint} />

    invert toe:
    <input type="checkbox" bind:checked={toe} />
    <br />
    exposure: {Math.round((exposure[0] - 5) * 100) / 100}
    <Slider bind:value={exposure} min="0" max="10" step="0.05" />

    gamma: {Math.round(gamma[0] * 100) / 100}
    <Slider bind:value={gamma} min="0" max="1" step="0.01" />

    toe width: {Math.round(toe_width[0] * 100) / 100}
    <Slider bind:value={toe_width} min="0" max="0.5" step="0.01" />

    blackpoint shift: {Math.round((blackpoint_shift[0]-0.5) * 100) / 100}
    <Slider bind:value={blackpoint_shift} min="0" max="1" step="0.01" />

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
