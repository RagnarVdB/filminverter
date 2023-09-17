<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import Dropzone from "svelte-file-dropzone"
    import type { ProcessedSingle, Trich } from "./RawImage"
    import {
        TRICHNAMES,
        TrichNameMap,
        loadTrichrome,
        loadWithBackground,
        isTrichName,
        trichNotNull,
    } from "./RawImage"
    import { numberOfWorkers, partition } from "./utils"
    const dispatch = createEventDispatcher()

    let expfac = 125/15
    let expfac_trich_R = 30 / 4
    let expfac_trich_G = 30 / 4
    let expfac_trich_B = 13 * 0.6
    let DR: number

    function decoder(
        files: [number, File][],
        callback: (n: number, im: ProcessedSingle) => void
    ) {
        const nWorkers = numberOfWorkers(files.length)
        const filesPerWorker = Math.floor(files.length / nWorkers)
        const remainder = files.length % nWorkers
        for (let i = 0; i < nWorkers; i++) {
            const worker = new Worker(
                new URL("./decode_worker.ts", import.meta.url),
                { type: "module" }
            )
            const workerFiles =
                i < remainder
                    ? [
                          ...files.slice(
                              i * filesPerWorker,
                              (i + 1) * filesPerWorker
                          ),
                          files[nWorkers * filesPerWorker + i],
                      ]
                    : files.slice(i * filesPerWorker, (i + 1) * filesPerWorker)
            worker.postMessage(workerFiles)
            worker.onmessage = (message) => {
                const [n, im]: [number, ProcessedSingle] = message.data
                im.DR = DR
                console.log(im)
                callback(n, im)
            }
        }
    }
    function openFiles(files: [number, File][]) {
        decoder(files, (index, image) => {
            dispatch("image", {
                index,
                image,
            })
        })
    }

    function openWithBackground(files: [number, File][]) {
        const [backgroundFiles, imageFiles] = partition(
            files,
            ([_, file]) => file.name.split(".")[0] == "background"
        )
        if (backgroundFiles.length != 1) {
            throw new Error("Too many background files")
        }
        const backgroundFile = backgroundFiles[0]
        const backgroundIndex = backgroundFile[0]
        decoder([backgroundFile], (_, background) => {
            decoder(imageFiles, (i, image) => {
                const densityImage = loadWithBackground({
                    background,
                    image,
                    expfac,
                })
                const index = i < backgroundIndex ? i : i - 1
                dispatch("image", {
                    index,
                    image: densityImage,
                })
            })
        })
    }

    function openTrichrome(files: [number, File][]) {
        const trichImages: Trich<ProcessedSingle | null> = {
            R: null,
            G: null,
            B: null,
            BR: null,
            BG: null,
            BB: null,
            expfac: [expfac_trich_R, expfac_trich_G, expfac_trich_B],
        }
        decoder(files, (_, image) => {
            const name = image.filename.split(".")[0]
            if (!isTrichName(name)) {
                throw new Error(`${name} not in trichrome`)
            }
            const c = TrichNameMap[name]
            trichImages[c] = image
            if (trichNotNull(trichImages)) {
                dispatch("image", {
                    index: 0,
                    image: loadTrichrome(trichImages),
                })
            }
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

        const files = Array.from(acceptedFiles.entries())
        const filenames = files.map((file) => file[1].name.split(".")[0])

        if (
            TRICHNAMES.every((x) => filenames.includes(x)) &&
            filenames.length == 6
        ) {
            console.log("Trichrome")
            openTrichrome(files)
        } else if (filenames.includes("background")) {
            console.log("Background")
            openWithBackground(files)
        } else {
            console.log("Single")
            openFiles(files)
        }
    }
</script>

<div class="fileSelector">
    <h1>Select File</h1>

    <Dropzone on:drop={handleFilesSelect} accept=".RAF" inputElement="null" />

    <p>Background image exposure compensation:</p>
    <input type="number" bind:value={expfac} />

    <p>Trichrome image exposure compensation:</p>
    <input type="number" bind:value={expfac_trich_R}>
    <input type="number" bind:value={expfac_trich_G}>
    <input type="number" bind:value={expfac_trich_B}>

    <p>Dynamic Range Setting</p>
    <select name="DR" id="DR" bind:value={DR}>
        <option value=1>DR100</option>
        <option value=2 selected>DR200</option>
        <option value=4>DR400</option>
    </select>
</div>

<style>
    .fileSelector {
        background-color: white;
        box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
        border-radius: 15px;
    }
</style>
