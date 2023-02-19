<script lang="ts">
    import FileSelector from "./lib/FileSelector.svelte"
    import ImageArea from "./lib/ImageArea.svelte"
    import type {
        ProcessedImage,
        Settings as SettingType,
    } from "./lib/RawImage"
    import logo from "./assets/svelte.png"

    import { images, index } from "./stores"

    import Presets from "./lib/Presets.svelte"
    import Settings from "./lib/Settings/Settings.svelte"
    import { number_of_workers } from "./lib/utils"

    let showImages = false

    function receivedImage(event) {
        const { index, image }: { index: number; image: ProcessedImage } =
            event.detail
        console.log("received: ", index)
        // if (index > $images.length) {
        //     for (let i=0; i<index; i++) {
        //         $images[i] = null
        //     }
        // }
        $images[index] = image

        showImages = true
    }

    function typedArrayToURL(arr: Uint8Array, mimeType: string): string {
        return URL.createObjectURL(new Blob([arr.buffer], { type: mimeType }))
    }

    function download(url: string, filename: string) {
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        setTimeout(function () {
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        }, 0)
    }

    function save(e: CustomEvent<{ all: boolean }>) {
        if (!e.detail.all) {
            const worker = new Worker(
                new URL("./lib/encode_worker.ts", import.meta.url),
                { type: "module" }
            )
            const image = $images[$index]
            worker.postMessage([image])
            worker.onmessage = (message) => {
                const [filename, url]: [string, string] = message.data
                console.log("received", filename)
                download(url, filename)
            }
        } else {
            const nWorkers = number_of_workers($images.length)
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
                    console.log("received", filename)
                    download(url, filename)
                }
            }
        }
    }

    function applyAll(e: CustomEvent) {
        console.log("Apply all")
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
