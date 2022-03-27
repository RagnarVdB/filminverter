<script lang="ts">
    import logo from './assets/svelte.png'
    import FileSelector from './lib/FileSelector.svelte'
    import Presets from './lib/Presets.svelte'
    import Settings from './lib/Settings/Settings.svelte'
</script>

<main>
    <FileSelector/>
    <Settings/>
    <Presets/>
</main>

<style>
:root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

  main {
    display: grid;
    grid-template-columns: 5fr 2fr 1fr;
    column-gap: 15px;
    height: calc(100vh - 30px);
    margin: 15px;
    padding: 0;
  }
</style>
