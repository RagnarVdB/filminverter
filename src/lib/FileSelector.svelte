<script lang="ts">
    import { createEventDispatcher } from "svelte"
    // @ts-ignore
    import Dropzone from "svelte-file-dropzone"
    import { number_of_workers } from "./utils"
    import {
        TRICHNAMES,
        convertTrichrome,
        trichNotNull,
        TrichNameMap,
        isTrichName,
    } from "./RawImage"
    import type { ProcessedSingle, Trich, TrichName } from "./RawImage"
    const dispatch = createEventDispatcher()

    function decoder(
        files: [Number, File][],
        callback: (n: number, im: ProcessedSingle) => void
    ) {
        const nWorkers = number_of_workers(files.length)
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
                const [n, im] = message.data
                callback(n, im)
            }
        }
    }
    function openFiles(files: [Number, File][]) {
        decoder(files, (index, image) => {
            dispatch("image", {
                index,
                image,
            })
        })
    }

    function openTrichrome(files: [Number, File][]) {
        const trichImages: Trich<ProcessedSingle | null> = {
            R: null,
            G: null,
            B: null,
            BR: null,
            BG: null,
            BB: null,
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
                    image: convertTrichrome(trichImages),
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
        } else {
            console.log("Single")
            openFiles(files)
        }
    }
</script>

<div class="fileSelector">
    <h1>Select File</h1>
    <Dropzone on:drop={handleFilesSelect} accept=".RAF" />
</div>

<style>
    .fileSelector {
        background-color: white;
        box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
        border-radius: 15px;
    }
</style>
