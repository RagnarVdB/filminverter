<script lang="ts">
    import { createEventDispatcher } from "svelte"
    // @ts-ignore
    import Slider from "@bulatdashiev/svelte-slider"
    import type { OutputResolution, OutputType } from "../inversion"
    import { output_types, tc_map } from "../inversion"
    import type { BWSettings, Settings, TCName } from "../RawImage"
    import { getRotationMatrix } from "../rotation"
    import { download } from "../utils"
    import Picker from "./Picker.svelte"
    import Zoom from "./Zoom.svelte"

    const dispatch = createEventDispatcher()
    type Triple = [number, number, number]

    let tone_curve: TCName = "Default"
    let toe = true
    let blackpoint: Triple = [0, 0, 0]
    let exposure: [number, number] = [5, 0]
    let gamma: [number, number] = [0.5, 0]
    let toe_width: [number, number] = [0.2, 0]
    let blackpoint_shift: [number, number] = [0.5, 0]

    let show_clipping = false
    let show_negative = false

    let rotation: number = 0
    let zoom: [number, number, number, number] = [1, 1, 0, 0]

    let output_type: OutputType = "dng_raw16"
    let output_resolution: OutputResolution = 1

    let copied_settings: BWSettings | null = null

    export let settings: Settings

    $: {
        updateSliders(settings)
    }
    $: {
        updateSettings(
            tone_curve,
            toe,
            blackpoint,
            exposure,
            gamma,
            toe_width,
            blackpoint_shift,
            show_clipping,
            show_negative,
            rotation,
            zoom,
        )
    }

    function updateSettings(
        tone_curve: TCName,
        toe: boolean,
        dmin: Triple,
        exposure: [number, number],
        gamma: [number, number],
        toe_width: [number, number],
        blackpoint_shift: [number, number],
        show_clipping: boolean,
        show_negative: boolean,
        rotation: number,
        zoom: [number, number, number, number],
    ) {
        if (settings) {
            settings.bw = {
                toe: toe,
                dmin: dmin,
                exposure: exposure[0] - 5,
                gamma: gamma[0],
                toe_width: toe_width[0],
                blackpoint_shift: blackpoint_shift[0] - 0.5,
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
        toe = sets.bw.toe
        exposure[0] = sets.bw.exposure + 5
        gamma[0] = sets.bw.gamma
        toe_width[0] = sets.bw.toe_width
        blackpoint_shift[0] = sets.bw.blackpoint_shift + 0.5
        show_clipping = sets.show_clipping
        show_negative = sets.show_negative
        rotation = sets.rotation
        blackpoint = sets.bw.dmin
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

<div class="bw">
    <Picker name="film border" bind:color={blackpoint} />

    <br />
    <label for="Tone Curve">Tone Curve</label>
    <select name="Tone Curve" bind:value={tone_curve}>
        {#each Object.keys(tc_map) as tc}
            <option value={tc}>{tc}</option>
        {/each}
    </select>

    <br />
    invert toe:
    <input type="checkbox" bind:checked={toe} />
    <br />
    exposure: {Math.round((exposure[0] - 5) * 100) / 100}
    <Slider bind:value={exposure} min="0" max="10" step="0.05" />

    gamma: {Math.round(gamma[0] * 100) / 100}
    <Slider bind:value={gamma} min="0" max="1.3" step="0.01" />

    toe width: {Math.round(toe_width[0] * 100) / 100}
    <Slider bind:value={toe_width} min="0" max="0.5" step="0.01" />

    blackpoint shift: {Math.round((blackpoint_shift[0] - 0.5) * 100) / 100}
    <Slider bind:value={blackpoint_shift} min="0" max="1" step="0.01" />

    Show clipping:
    <input type="checkbox" bind:checked={show_clipping} />
    <br />
    Show negative:
    <input type="checkbox" bind:checked={show_negative} />
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
    <button on:click={() => (copied_settings = settings.bw)}
        >Copy settings</button
    >
    {#if copied_settings != null}
        <button
            on:click={() => {
                if (!copied_settings) return
                settings.bw = JSON.parse(JSON.stringify(copied_settings))
                updateSliders(settings)
            }}>Paste settings</button
        >
    {/if}

    <button on:click={saveSettings}>Save settings</button>
    <button on:click={loadSettings}>Load settings</button>
</div>

<style>
</style>
