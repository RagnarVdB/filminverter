<script lang="ts">
    import { createEventDispatcher } from "svelte"
    // @ts-ignore
    import Slider from "@bulatdashiev/svelte-slider"
    import type { OutputResolution, OutputType } from "../inversion"
    import { output_types, tc_map } from "../inversion"
    import {
        exp_to_aces_to_sRGB,
        identity,
        single_to_APD,
        single_to_APD_colorsheet,
        single_to_APD_theory,
        single_to_APD_theory_unnorm,
    } from "../matrices"
    import {
        type ColorSettings,
        type Settings,
        type TCName,
    } from "../RawImage"
    import { getRotationMatrix } from "../rotation"
    import { download, type ColorMatrix } from "../utils"
    import Picker from "./Picker.svelte"
    import Zoom from "./Zoom.svelte"

    const dispatch = createEventDispatcher()
    type Triple = [number, number, number]

    let tone_curve: TCName = "Default"
    let matrix1: ColorMatrix = single_to_APD
    let matrix2: ColorMatrix = single_to_APD
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
    let toe_facG: [number, number] = [1, 0]
    let toe_facB: [number, number] = [1, 0]
    let blackpoint_shift: [number, number] = [0.5, 0]


    let show_clipping = false
    let show_negative = false
    let show_value = false
    let shown_value: number = 0

    let rotation: number = 0
    let zoom: [number, number, number, number] = [1, 1, 0, 0]

    let output_type: OutputType = "dng_raw16"
    let output_resolution: OutputResolution = 1

    let copied_settings: ColorSettings | null = null

    export let settings: Settings

    const m = 8

    $: {
        updateSliders(settings)
    }
    $: {
        updateSettings(
            tone_curve,
            matrix1,
            matrix2,
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
            toe_facB,
            toe_facG,
            blackpoint_shift,
            show_clipping,
            show_negative,
            show_value,
            shown_value,
            rotation,
            zoom
        )
    }

    function updateSettings(
        tone_curve: TCName,
        matrix1: ColorMatrix,
        matrix2: ColorMatrix,
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
        toe_facB: [number, number],
        toe_facG: [number, number],
        blackpoint_shift: [number, number],
        show_clipping: boolean,
        show_negative: boolean,
        show_value: boolean,
        shown_value: number,
        rotation: number,
        zoom: [number, number, number, number]
    ) {
        if (settings) {
            settings.color = {
                toe: toe,
                dmin: dmin,
                neutral: neutral,
                exposure: exposure[0] - 5,
                blue: blue[0] - 2,
                green: green[0] - 2,
                gamma: gamma[0],
                facB: 1 + (facB[0] - 5) / m,
                facG: 1 + (facG[0] - 5) / m,
                toe_width: toe_width[0],
                toe_facB: toe_facB[0],
                toe_facG: toe_facG[0],
                blackpoint_shift: blackpoint_shift[0] - 0.2,
            }
            settings.tone_curve = tone_curve
            settings.matrix1 = matrix1
            settings.matrix2 = matrix2
            settings.show_clipping = show_clipping
            settings.show_negative = show_negative
            settings.shown_value = show_value ? shown_value : undefined
            settings.rotation = rotation
            settings.rotationMatrix = getRotationMatrix(rotation)
            settings.zoom = zoom
        }
    }

    function updateSliders(sets: Settings) {
        // Sliders change to match settings of selected image
        tone_curve = sets.tone_curve
        matrix1 = sets.matrix1
        matrix2 = sets.matrix2
        toe = sets.color.toe
        exposure[0] = sets.color.exposure + 5
        blue[0] = sets.color.blue + 2
        green[0] = sets.color.green + 2
        gamma[0] = sets.color.gamma
        facB[0] = (sets.color.facB - 1) * m + 5
        facG[0] = (sets.color.facG - 1) * m + 5
        toe_width[0] = sets.color.toe_width
        toe_facB[0] = sets.color.toe_facB
        toe_facG[0] = sets.color.toe_facG
        blackpoint_shift[0] = sets.color.blackpoint_shift + 0.2
        rotation = sets.rotation
        dmin = sets.color.dmin
        neutral = sets.color.neutral
        show_clipping = sets.show_clipping
        show_negative = sets.show_negative
        zoom = sets.zoom
    }

    async function saveSettings() {
        const settings_json = JSON.stringify(settings.color)
        const blob = new Blob([settings_json], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        download(url, "settings.json")
    }

    function loadSettings() {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = ".json"
        input.addEventListener("change", (e) => {
            const files = input.files
            if (!files || files.length != 1) {
                return
            }
            const file = files[0]
            const reader = new FileReader()
            reader.onload = (e) => {
                const settings_json = reader.result as string
                const loaded_settings = JSON.parse(settings_json)
                settings.color = loaded_settings
                updateSliders(settings)
            }
            reader.readAsText(file)
        })

        input.click()
    }
</script>

<div class="color">
    <Picker name="film border" bind:color={dmin} />

    <Picker name="neutral" bind:color={neutral} />
    <br />
    <label for="Tone Curve">Tone Curve</label>
    <select name="Tone Curve" bind:value={tone_curve}>
        {#each Object.keys(tc_map) as tc}
            <option value={tc}>{tc}</option>
        {/each}
    </select>
    <br />
    <label for="Matrix1">Matrix1</label>
    <select name="Matrix1" bind:value={matrix1}>
        <option value={identity}>Identity</option>
        <option value={single_to_APD_colorsheet}>Colorsheet</option>
        <option value={single_to_APD_theory}>Theory</option>
        <option value={single_to_APD_theory_unnorm}>Theory unnorm</option>
        <option value={single_to_APD}>Matrix 1</option>
    </select>
    <br />
    <label for="Matrix2">Matrix2</label>
    <select name="Matrix2" bind:value={matrix2}>
        <option value={identity}>Identity</option>
        <option value={exp_to_aces_to_sRGB}>aces</option>
    </select>

    <br />
    <br />

    invert toe:
    <input type="checkbox" bind:checked={toe} />
    <br />
    <br />

    exposure: {Math.round((exposure[0] - 5) * 100) / 100}
    <Slider bind:value={exposure} min="0" max="10" step="0.05" />

    blue: {Math.round((blue[0] - 2) * 100) / 100}
    <Slider bind:value={blue} min="0" max="4" step="0.01" />

    green: {Math.round((green[0] - 2) * 100) / 100}
    <Slider bind:value={green} min="0" max="4" step="0.01" />

    gamma: {Math.round(gamma[0] * 100) / 100}
    <Slider bind:value={gamma} min="0" max="1" step="0.01" />

    factor blue: {Math.round((facB[0] - 5) * 100) / 100}
    <Slider bind:value={facB} min="0" max="10" step="0.05" />

    factor green: {Math.round((facG[0] - 5) * 100) / 100}
    <Slider bind:value={facG} min="0" max="10" step="0.05" />

    toe width: {Math.round(toe_width[0] * 100) / 100}
    <Slider bind:value={toe_width} min="0" max="0.3" step="0.01" />

    toe factor blue: {Math.round(toe_facB[0] * 100) / 100}
    <Slider bind:value={toe_facB} min="0" max="3" step="0.01" />

    toe factor green: {Math.round(toe_facG[0] * 100) / 100}
    <Slider bind:value={toe_facG} min="0" max="3" step="0.01" />

    blackpoint shift: {Math.round((blackpoint_shift[0] - 0.2) * 100) / 100}
    <Slider bind:value={blackpoint_shift} min="0" max="0.4" step="0.01" />

    Show clipping:
    <input type="checkbox" bind:checked={show_clipping} />
    <br />
    Show negative:
    <input type="checkbox" bind:checked={show_negative} />
    <br />

    Show limit:
    <input type="checkbox" bind:checked={show_value} />
    <input type="number" bind:value={shown_value} />
    <br />

    Output
    <select name="Output" bind:value={output_type}>
        {#each Object.keys(output_types) as type}
            <option value={type}>{output_types[type].name}</option>
        {/each}
    </select>
    <br />
    Resolution
    <select name="Resolution" bind:value={output_resolution}>
        <option value={1}>Full</option>
        {#each [2, 4] as x}
            <option value={x}>1/{x}</option>
        {/each}
    </select>
    <br />

    <button
        on:click={() => {
            rotation = (rotation + 1) % 4
        }}>Rotate</button
    >
    <button on:click={() => dispatch("applyAll")}>Apply all</button>
    <button on:click={() => dispatch("save_raw")}>Save Raw </button>
    <button
        on:click={() =>
            dispatch("save", {
                all: false,
                type: output_type,
                resolution: output_resolution,
            })}
        >Save
    </button>
    <button
        on:click={() =>
            dispatch("save", {
                all: true,
                type: output_type,
                resolution: output_resolution,
            })}>Save all</button
    >
    <Zoom bind:zoom />
    <button on:click={() => (copied_settings = settings.color)}
        >Copy settings</button
    >
    {#if copied_settings != null}
        <button
            on:click={() => {
                if (!copied_settings) return
                settings.color = JSON.parse(JSON.stringify(copied_settings))
                updateSliders(settings)
            }}>Paste settings</button
        >
    {/if}

    <button on:click={saveSettings}>Save settings</button>
    <button on:click={loadSettings}>Load settings</button>
</div>

<style>
</style>
