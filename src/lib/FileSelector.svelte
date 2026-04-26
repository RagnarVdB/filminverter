<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import Dropzone from "svelte-file-dropzone"
    import type { Image } from "./RawImage"
    import { numberOfWorkers } from "./utils"
    import DecodeWorker from "./decode_worker.ts?worker";

    // @ts-ignore
    import dcp_profile from "/src/assets/Provia_no_huesatmap_no_look.dcp"
    const dispatch = createEventDispatcher()

    let bg_valueR = 18787
    let bg_valueG = 22983
    let bg_valueB = 25953
    let expfac = 30 / 2
    let expfac_trich_R = 30 / 4
    let expfac_trich_G = 30 / 4
    let expfac_trich_B = 13 * 0.6
    let DR: number

    function decoder(files: File[]): Promise<Image>[] {
        let resolvers: ((value: Image) => void)[] = []
        let promises: Promise<Image>[] = []

        files.forEach((_, i) => {
            promises[i] = new Promise((resolve) => {
                resolvers[i] = resolve
            })
        })

        const nWorkers = numberOfWorkers(files.length)
        const filesPerWorker = Math.floor(files.length / nWorkers)
        const remainder = files.length % nWorkers
        const filesWithIndex = files.map((file, i) => [i, file])
        for (let i = 0; i < nWorkers; i++) {
            const worker = new DecodeWorker()
            const workerFiles =
                i < remainder
                    ? [
                          ...filesWithIndex.slice(
                              i * filesPerWorker,
                              (i + 1) * filesPerWorker
                          ),
                          filesWithIndex[nWorkers * filesPerWorker + i],
                      ]
                    : filesWithIndex.slice(
                          i * filesPerWorker,
                          (i + 1) * filesPerWorker
                      )
            worker.postMessage(workerFiles)
            let finishedImages = 0
            worker.onmessage = (message) => {
                finishedImages++
                const [j, image]: [number, Image] = message.data
                resolvers[j](image)
                if (finishedImages == workerFiles.length) {
                    worker.terminate()
                }
            }
        }
        return promises
    }

    function openFiles(files: File[]) {
        decoder(files).forEach((promise, i) => {
            promise.then((image) => {
                dispatch("image", {
                    index: i,
                    image,
                })
            })
        })
    }

    function handleFilesSelect(e: CustomEvent) {
        const {
            acceptedFiles,
            fileRejections,
        }: { acceptedFiles: File[]; fileRejections: File[] } = e.detail
        if (fileRejections.length != 0) {
            console.log("Rejected files: ", fileRejections)
        }
        openFiles(acceptedFiles)
    }
</script>

<div class="fileSelector">
    <h1>Select File</h1>

    <Dropzone on:drop={handleFilesSelect} accept=".rgb,.RAF" inputElement="null" />

    <p>Background value</p>
    <input type="number" bind:value={bg_valueR} />
    <input type="number" bind:value={bg_valueG} />
    <input type="number" bind:value={bg_valueB} />

    <p>Background image exposure compensation:</p>
    <input type="number" bind:value={expfac} />

    <p>Trichrome image exposure compensation:</p>
    <input type="number" bind:value={expfac_trich_R} />
    <input type="number" bind:value={expfac_trich_G} />
    <input type="number" bind:value={expfac_trich_B} />

    <p>Dynamic Range Setting</p>
    <select name="DR" id="DR" bind:value={DR}>
        <option value="1" selected>DR100</option>
        <option value="2">DR200</option>
        <option value="4">DR400</option>
    </select>
    <br />
    <br />
    <a href={dcp_profile} download="Provia_no_huesatmap_no_look.dcp"
        >Download Lightroom Profile</a
    >
</div>

<style>
    .fileSelector {
        background-color: white;
        box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
        border-radius: 15px;
    }
</style>
