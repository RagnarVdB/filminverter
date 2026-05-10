<script lang="ts">
    import { createEventDispatcher } from "svelte"
    // @ts-ignore
    import Slider from "@bulatdashiev/svelte-slider"
    import type { OutputResolution, OutputType } from "../inversion"
    import { output_types, tc_map } from "../inversion"
    import type { BWSettings, Settings, TCName } from "../RawImage"
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
        blackpoint = sets.bw.dmin
        zoom = sets.zoom
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

</div>

<style>
</style>
