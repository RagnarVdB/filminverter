<script lang="ts">
    import FileSelector from "./lib/FileSelector.svelte"
    import ImageArea from "./lib/ImageArea.svelte"
    import type { ProcessedImage } from "./lib/RawImage"
    import { images, index } from "./stores"
    import Settings from "./lib/Settings/Settings.svelte"
    import { numberOfWorkers } from "./lib/utils"
    import { download } from "./lib/utils"

    let showImages = false

    function receivedImage(event: CustomEvent) {
        const { index, image }: { index: number; image: ProcessedImage } =
            event.detail
        $images[index] = image

        showImages = true
    }

    function typedArrayToURL(arr: Uint8Array, mimeType: string): string {
        return URL.createObjectURL(new Blob([arr.buffer], { type: mimeType }))
    }

    function save(e: CustomEvent<{ all: boolean }>) {
        if (!e.detail.all) {
            // Only one file
            const worker = new Worker(
                new URL("./lib/encode_worker.ts", import.meta.url),
                { type: "module" }
            )
            const image = $images[$index]
            worker.postMessage([image])
            worker.onmessage = (message) => {
                const [filename, url]: [string, string] = message.data
                download(url, filename)
            }
        } else {
            const nWorkers = numberOfWorkers($images.length)
            const imagesPerWorker = Math.floor($images.length / nWorkers)
            const remainder = $images.length % nWorkers

            for (let i = 0; i < nWorkers; i++) {
                const worker = new Worker(
                    new URL("./lib/encode_worker.ts", import.meta.url),
                    { type: "module" }
                )
                const workerImages =
                    i < remainder
                        ? [
                              ...$images.slice(
                                  i * imagesPerWorker,
                                  (i + 1) * imagesPerWorker
                              ),
                              $images[nWorkers * imagesPerWorker + i],
                          ]
                        : $images.slice(
                              i * imagesPerWorker,
                              (i + 1) * imagesPerWorker
                          )
                worker.postMessage(workerImages)

                worker.onmessage = (message) => {
                    const [filename, url]: [string, string] = message.data
                    download(url, filename)
                }
            }
        }
    }

    function applyAll(e: CustomEvent) {
        const settings = $images[$index].settings
        for (let i = 0; i < $images.length; i++) {
            $images[i].settings = JSON.parse(JSON.stringify(settings))
        }
    }
</script>

<main>
    {#if showImages}
        <ImageArea />
    {:else}
        <FileSelector on:image={receivedImage} />
    {/if}
    <Settings on:save={save} on:applyAll={applyAll} />
    <!-- <Presets/> -->
</main>

<style>
    :root {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    }

    main {
        display: grid;
        /* grid-template-columns: 5fr 2fr 1fr; */
        grid-template-columns: 6fr 2fr;
        column-gap: 15px;
        height: calc(100vh - 30px);
        margin: 15px;
        padding: 0;
    }
</style>
