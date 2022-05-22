<script lang="ts">
    import Basic from './Basic.svelte'
    import Advanced from './Advanced.svelte'
    import type { Settings } from '../RawImage';

    let mode: "Basic" | "Advanced" = "Basic"

    export let settings: Settings
    let innerSettings: Settings
    let changes: number = 0

    function updateSettings(sets: Settings) {
        changes += 1
        let currentChanges = changes
        setTimeout(() => {
            if (changes == currentChanges) {
                settings = sets
                changes = 0
            }
        }, 200)
    }
    
    function externalChange(sets: Settings) {
        console.log("settings updated")
        if (sets != innerSettings)
            innerSettings = sets
    }

    $: {updateSettings(innerSettings)}
    $: {externalChange(settings)}

</script>


<div class="settings">
    <div class="menu">
        <div class="menuItem" id="left" class:selected="{mode === 'Basic'}" on:click="{() => mode = 'Basic'}">Basic</div>
        <div class="menuItem" id="right" class:selected="{mode === 'Advanced'}" on:click="{() => mode = 'Advanced'}">Advanced</div>
    </div>
    {#if mode === "Basic"}
        <Basic/>
    {:else}
        <Advanced bind:settings={innerSettings}/>
    {/if}
    
</div>

<style>
.settings {
    display: flex;
    flex-direction: column;
    background-color: white;
    box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
    border-radius: 15px;
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
    border-bottom: 2px solid #EAEAEA;
    background-color: #EAEAEA;
    cursor: pointer;
    font-family: 'Roboto Mono' sans-serif;
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