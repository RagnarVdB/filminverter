<script lang="ts">
    import FileSelector from "./lib/FileSelector.svelte"
    import ImageArea from "./lib/ImageArea.svelte"
    import { read_raw, type Image } from "./lib/RawImage"
    import Settings from "./lib/Settings/Settings.svelte"
    import type { OutputType } from "./lib/inversion"
    import { download, numberOfWorkers } from "./lib/utils"
    import { images, index } from "./stores"

    let showImages = false

    function receivedImage(event: CustomEvent) {
        const { index, image }: { index: number; image: Image } = event.detail
        $images[index] = image

        showImages = true
    }

    async function save_raw() {
        console.log("Saving raw")
        const image = $images[$index]
        const raw_image = await read_raw(image.file)
        console.log("Done loading")
        const file_buffer = raw_image.arr.buffer as ArrayBuffer
        const url = URL.createObjectURL(
            new Blob([file_buffer], { type: "image/tiff" })
        )
        download(url, image.file.name.replace("RAF", "rgb"))
    }

    function save(e: CustomEvent<{ all: boolean; type: OutputType }>) {
        const { all, type } = e.detail
        if (!all) {
            // Only one file
            const worker = new Worker(
                new URL("./lib/encode_worker.ts", import.meta.url),
                { type: "module" }
            )
            const image = $images[$index]
            worker.postMessage([[image, type]])
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
            $images[i].iter += 1
        }
    }
</script>

<main>
    {#if showImages}
        <ImageArea />
    {:else}
        <FileSelector on:image={receivedImage} />
    {/if}
    <Settings on:save={save} on:applyAll={applyAll} on:save_raw={save_raw}/>
    <!-- <Presets/> -->
</main>

<style>
    :root {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    }

    main {
        display: grid;
        grid-template-columns: 6fr 2fr;
        column-gap: 15px;
        height: calc(100vh - 30px);
        margin: 15px;
        padding: 0;
    }
</style>
