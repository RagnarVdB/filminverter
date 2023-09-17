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
    let dmin: Triple = [7662, 2939, 1711]
    let neutral: Triple = [3300, 730, 320]
    let exposure: [number, number] = [5, 0]
    let blue: [number, number] = [5, 0]
    let green: [number, number] = [5, 0]
    let gamma: [number, number] = [0.5, 0]
    let facB: [number, number] = [5, 0]
    let facG: [number, number] = [5, 0]
    let toe_width: [number, number] = [0.2, 0]

    let show_clipping = false
    let show_negative = false

    let rotation: number = 0
    let zoom: [number, number, number, number] = [1, 1, 0, 0]

    export let settings: Settings

    const m = 1 / 5

    $: {
        updateSliders(settings)
    }
    $: {
        updateSettings(
            toe,
            dmin,
            neutral,
            exposure,
            blue,
            green,
            gamma,
            facB,
            facG,
            toe_width,
            show_clipping,
            show_negative,
            rotation,
            zoom
        )
    }

    function updateSettings(
        toe: boolean,
        dmin: Triple,
        neutral: Triple,
        exposure: [number, number],
        blue: [number, number],
        green: [number, number],
        gamma: [number, number],
        facB: [number, number],
        facG: [number, number],
        toe_width: [number, number],
        show_clipping: boolean,
        show_negative: boolean,
        rotation: number,
        zoom: [number, number, number, number]
    ) {
        if (settings) {
            settings.advanced = {
                toe: toe,
                dmin: dmin,
                neutral: neutral,
                exposure: exposure[0] - 5,
                blue: blue[0] - 2,
                green: green[0] - 2,
                gamma: gamma[0],
                facB: m * facB[0] - 4 * m + 1,
                facG: m * facG[0] - 3 * m + 1,
                toe_width: toe_width[0],
            }
            console.log("settings", settings.advanced)
            settings.show_clipping = show_clipping
            settings.show_negative = show_negative
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
            blue[0] = sets.advanced.blue + 2
            green[0] = sets.advanced.green + 2
            gamma[0] = sets.advanced.gamma
            facB[0] = (sets.advanced.facB - 1 + 4 * m) / m
            facG[0] = (sets.advanced.facG - 1 + 3 * m) / m
            toe_width[0] = sets.advanced.toe_width
            rotation = sets.rotation
            dmin = sets.advanced.dmin
            neutral = sets.advanced.neutral
            show_clipping = sets.show_clipping
            show_negative = sets.show_negative
            zoom = sets.zoom
        }
    }
</script>

<div class="advanced">
    <Picker name="film border" bind:color={dmin} />
    
    <Picker name="neutral" bind:color={neutral} />

    invert toe:
    <input type="checkbox" bind:checked={toe} />
    <br />
    exposure: {Math.round((exposure[0] - 5) * 100) / 100}
    <Slider bind:value={exposure} min="0" max="10" step="0.05" />

    blue: {Math.round((blue[0] - 2) * 100) / 100}
    <Slider bind:value={blue} min="0" max="4" step="0.01" />

    green: {Math.round((green[0] - 2) * 100) / 100}
    <Slider bind:value={green} min="0" max="4" step="0.01" />

    gamma: {Math.round(gamma[0] * 100) / 100}
    <Slider bind:value={gamma} min="0" max="1" step="0.01" />

    factor blue: {Math.round((facB[0] - 4) * 100) / 100}
    <Slider bind:value={facB} min="0" max="10" step="0.05" />

    factor green: {Math.round((facG[0] - 3) * 100) / 100}
    <Slider bind:value={facG} min="0" max="10" step="0.05" />

    toe width: {Math.round(toe_width[0] * 100) / 100}
    <Slider bind:value={toe_width} min="0" max="0.5" step="0.01" />

    Show clipping:
    <input type="checkbox" bind:checked={show_clipping} />
    <br />
    Show negative:
    <input type="checkbox" bind:checked={show_negative} />
    <br />

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
