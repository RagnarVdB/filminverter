<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import { images, index } from "../../stores"
    import type { BWSettings, ColorSettings, Settings } from "../RawImage"
    import { defaultSettings } from "../RawImage"
    import Color from "./Color.svelte"
    import Bw from "./Bw.svelte"
    import {
        output_types,
        type OutputResolution,
        type OutputType,
    } from "../inversion"
    import { download } from "../utils"
    import Zoom from "./Zoom.svelte"

    const dispatch = createEventDispatcher()

    // let show_clipping = false
    // let show_negative = false
    // let show_value = false
    // let shown_value: number = 0

    // let rotation: number = 0
    // let zoom: [number, number, number, number] = [1, 1, 0, 0]

    let output_type: OutputType = "dng_raw16"
    let output_resolution: OutputResolution = 1

    let copied_settings: ColorSettings | BWSettings| null = null

    let settings: Settings = defaultSettings
    let changes: number = 0

    const delay = 5 //ms

    function updateSettings(sets: Settings) {
        changes += 1
        let currentChanges = changes
        setTimeout(() => {
            if (changes == currentChanges && $images[$index]) {
                $images[$index].settings = sets
                $images[$index].iter += 1
                changes = 0
            }
        }, delay)
    }

    function updateIndex(i: number) {
        if ($images[i]) settings = $images[i].settings
    }

    $: {
        updateSettings(settings)
    }
    $: {
        updateIndex($index)
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
                updateSettings(settings)
            }
            reader.readAsText(file)
        })

        input.click()
    }
</script>

<div class="settings">
    <div class="menu">
        <div
            class="menuItem"
            id="right"
            class:selected={settings.mode === "color"}
            on:click={() => {
                settings.mode = "color"
                $images[$index].settings.mode = "color"
            }}
        >
            Color
        </div>
        <div
            class="menuItem"
            id="right"
            class:selected={settings.mode === "bw"}
            on:click={() => {
                settings.mode = "bw"
                $images[$index].settings.mode = "bw"
            }}
        >
            B&W
        </div>
    </div>

    {#if settings.mode === "color"}
        <Color
            bind:settings
            on:save={(e) => dispatch("save", e.detail)}
            on:applyAll={(e) => dispatch("applyAll", e.detail)}
            on:save_raw={(e) => dispatch("save_raw", e.detail)}
        />
    {:else}
        <Bw
            bind:settings
            on:save={(e) => dispatch("save", e.detail)}
            on:applyAll={(e) => dispatch("applyAll", e.detail)}
            on:save_raw={(e) => dispatch("save_raw", e.detail)}
        />
    {/if}
    <div>
        Show clipping:
        <input type="checkbox" bind:checked={settings.show_clipping} />
        <br />
        Show negative:
        <input type="checkbox" bind:checked={settings.show_negative} />

        <br />
        <button
            on:click={() => {
                settings.rotation = (settings.rotation + 1) % 4
            }}>Rotate</button
        >
        <Zoom bind:zoom={settings.zoom} />
        <br />
        <button on:click={() => (copied_settings = settings[settings.mode])}
            >Copy settings</button
        >
        {#if copied_settings != null}
            <button
                on:click={() => {
                    if (!copied_settings) return
                    settings[settings.mode] = JSON.parse(JSON.stringify(copied_settings))
                    updateSettings(settings)
                }}>Paste settings</button
            >
        {/if}
        <button on:click={saveSettings}>Save settings</button>
        <button on:click={loadSettings}>Load settings</button>
        <br />
        <button on:click={() => dispatch("applyAll")}>Apply all</button>
        <button on:click={() => dispatch("save_raw")}>Save Raw </button>
        <br />
        <select name="Output" bind:value={output_type}>
            {#each Object.keys(output_types) as type}
                <option value={type}>{output_types[type].name}</option>
            {/each}
        </select>
        <select name="Resolution" bind:value={output_resolution}>
            <option value={1}>Full</option>
            {#each [2, 4] as x}
                <option value={x}>1/{x}</option>
            {/each}
        </select>
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
    </div>
</div>

<style>
    .settings {
        display: flex;
        flex-direction: column;
        background-color: white;
        box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
        border-radius: 15px;
        overflow-y: scroll;
        padding-bottom: 10px;
    }

    .menu {
        display: flex;
        flex-direction: row;
    }

    .menuItem {
        width: 50%;
        height: 50px;
        text-align: center;
        vertical-align: center;
        line-height: 50px;
        border-bottom: 2px solid #eaeaea;
        background-color: #eaeaea;
        cursor: pointer;
        font-family: "Roboto Mono" sans-serif;
        font-style: normal;
        font-weight: 400;
        font-size: 16px;
    }

    #left {
        border-radius: 15px 0px 0px 0px;
    }

    #right {
        border-radius: 0px 15px 0px 0px;
    }

    .selected {
        background-color: white;
    }
</style>
