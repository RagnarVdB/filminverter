<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import Basic from "./Basic.svelte"
    import Advanced from "./Advanced.svelte"
    import Bw from "./Bw.svelte"
    import type { Settings } from "../RawImage"
    import { defaultSettings } from "../RawImage"
    import { images, index } from "../../stores"

    const dispatch = createEventDispatcher()

    //let mode: "basic" | "advanced" | "bw" = "advanced"

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
</script>

<div class="settings">
    <div class="menu">
        <div
            class="menuItem"
            id="left"
            class:selected={settings.mode === "basic"}
            on:click={() => {
                settings.mode = "basic"
                $images[$index].settings.mode = "basic"
            }}
        >
            Basic
        </div>
        <div
            class="menuItem"
            id="right"
            class:selected={settings.mode === "advanced"}
            on:click={() => {
                settings.mode = "advanced"
                $images[$index].settings.mode = "advanced"
            }}
        >
            Advanced
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
    {#if settings.mode === "basic"}
        <Basic />
    {:else if settings.mode === "advanced"}
        <Advanced
            bind:settings
            on:save={(e) => dispatch("save", e.detail)}
            on:applyAll={(e) => dispatch("applyAll", e.detail)}
        />
    {:else}
        <Bw
            bind:settings
            on:save={(e) => dispatch("save", e.detail)}
            on:applyAll={(e) => dispatch("applyAll", e.detail)}
        />
    {/if}
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
