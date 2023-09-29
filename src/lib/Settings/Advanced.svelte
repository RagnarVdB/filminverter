<script lang="ts">
    import { createEventDispatcher } from "svelte"
    // @ts-ignore
    import Slider from "@bulatdashiev/svelte-slider"
    import Picker from "./Picker.svelte"
    import Zoom from "./Zoom.svelte"
    import type { AdvancedSettings, Settings, TCName } from "../RawImage"
    import { getRotationMatrix } from "../rotation"
    import { download } from "../utils"

    const dispatch = createEventDispatcher()
    type Triple = [number, number, number]

    let tone_curve: TCName = "Default"
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

    let show_clipping = false
    let show_negative = false

    let rotation: number = 0
    let zoom: [number, number, number, number] = [1, 1, 0, 0]

    let copied_settings: AdvancedSettings | null = null

    export let settings: Settings

    const m = 1 / 5

    $: {
        updateSliders(settings)
    }
    $: {
        updateSettings(
            tone_curve,
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
            show_clipping,
            show_negative,
            rotation,
            zoom
        )
    }

    function updateSettings(
        tone_curve: TCName,
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
                toe_facB: toe_facB[0],
                toe_facG: toe_facG[0],
            }
            settings.tone_curve = tone_curve
            settings.show_clipping = show_clipping
            settings.show_negative = show_negative
            settings.rotation = rotation
            settings.rotationMatrix = getRotationMatrix(rotation)
            settings.zoom = zoom
        }
    }

    function updateSliders(sets: Settings) {
        // Sliders change to match settings of selected image
        tone_curve = sets.tone_curve
        toe = sets.advanced.toe
        exposure[0] = sets.advanced.exposure + 5
        blue[0] = sets.advanced.blue + 2
        green[0] = sets.advanced.green + 2
        gamma[0] = sets.advanced.gamma
        facB[0] = (sets.advanced.facB - 1 + 4 * m) / m
        facG[0] = (sets.advanced.facG - 1 + 3 * m) / m
        toe_width[0] = sets.advanced.toe_width
        toe_facB[0] = sets.advanced.toe_facB
        toe_facG[0] = sets.advanced.toe_facG
        rotation = sets.rotation
        dmin = sets.advanced.dmin
        neutral = sets.advanced.neutral
        show_clipping = sets.show_clipping
        show_negative = sets.show_negative
        zoom = sets.zoom
    }

    async function saveSettings() {
        const settings_json = JSON.stringify(settings.advanced)
        const blob = new Blob([settings_json], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        download(url, "settings.json")
    }

    function loadSettings() {
        const input = document.createElement("input")
        input.type = "file"
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
                settings.advanced = loaded_settings
                updateSliders(settings)
            }
            reader.readAsText(file)
        })

        input.click()
    }

</script>

<div class="advanced">
    <Picker name="film border" bind:color={dmin} />

    <Picker name="neutral" bind:color={neutral} />
    <br />
    <label for="Tone Curve">Tone Curve</label>
    <select name="Tone Curve" bind:value={tone_curve}>
        <option value="Default" selected>Default</option>
        <option value="Filmic">Filmic</option>
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

    factor blue: {Math.round((facB[0] - 4) * 100) / 100}
    <Slider bind:value={facB} min="0" max="10" step="0.05" />

    factor green: {Math.round((facG[0] - 3) * 100) / 100}
    <Slider bind:value={facG} min="0" max="10" step="0.05" />

    toe width: {Math.round(toe_width[0] * 100) / 100}
    <Slider bind:value={toe_width} min="0" max="0.3" step="0.01" />

    toe factor blue: {Math.round(toe_facB[0] * 100) / 100}
    <Slider bind:value={toe_facB} min="0" max="3" step="0.01" />

    toe factor green: {Math.round(toe_facG[0] * 100) / 100}
    <Slider bind:value={toe_facG} min="0" max="3" step="0.01" />

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
    <button on:click={() => (copied_settings = settings.advanced)}
        >Copy settings</button
    >
    {#if copied_settings != null}
        <button
            on:click={() => {
                if (!copied_settings) return
                settings.advanced = JSON.parse(JSON.stringify(copied_settings))
                updateSliders(settings)
            }}>Paste settings</button
        >
    {/if}

    <button on:click={saveSettings}>Save settings</button>
    <button on:click={loadSettings}>Load settings</button>
</div>

<style>
</style>
