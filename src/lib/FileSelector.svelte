<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import Dropzone from "svelte-file-dropzone"
    import type { Trich, DeBayeredImage } from "./RawImage"
    import {
        TRICHNAMES,
        TrichNameMap,
        isTrichName,
        loadSingle,
        loadTrichrome,
        loadWithBackground,
        trichNotNull,
    } from "./RawImage"
    import { numberOfWorkers } from "./utils"
    // @ts-ignore
    import dcp_profile from "/src/assets/Provia_no_huesatmap_no_look.dcp"
    const dispatch = createEventDispatcher()

    let bg_valueR = 12929
    let bg_valueG = 16247
    let bg_valueB = 18516
    let expfac = 125 / 15
    let expfac_trich_R = 30 / 4
    let expfac_trich_G = 30 / 4
    let expfac_trich_B = 13 * 0.6
    let DR: number

    function decoder(files: File[]): Promise<DeBayeredImage>[] {
        let resolvers: ((value: DeBayeredImage) => void)[] = []
        let promises: Promise<DeBayeredImage>[] = []

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
            const worker = new Worker(
                new URL("./decode_worker.ts", import.meta.url),
                { type: "module" }
            )
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
                const [j, image]: [number, DeBayeredImage] = message.data
                console.log("resolving", j)
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
                    image: loadSingle(
                        image,
                        [bg_valueR, bg_valueG, bg_valueB],
                        DR
                    ),
                })
            })
        })
    }

    async function openWithBackground(files: File[]) {
        let backgroundFile: File | undefined = undefined
        let imageFiles: File[] = []
        for (const file of files) {
            if (file.name.split(".")[0] == "background") {
                if (backgroundFile) {
                    throw new Error("Multiple background files")
                }
                backgroundFile = file
            } else {
                imageFiles.push(file)
            }
        }
        if (!backgroundFile) {
            throw new Error("No background file")
        }
        const background = await decoder([backgroundFile])[0]

        const decodedImages = decoder(imageFiles)
        for (const [index, decodedImage] of decodedImages.entries()) {
            const image = await decodedImage
            const densityImage = loadWithBackground(
                {
                    background,
                    image,
                    expfac,
                },
                DR
            )
            dispatch("image", {
                index,
                image: densityImage,
            })
        }
    }

    async function openTrichrome(files: File[]) {
        const trichImages: Trich<DeBayeredImage | null> = {
            R: null,
            G: null,
            B: null,
            BR: null,
            BG: null,
            BB: null,
            expfac: [expfac_trich_R, expfac_trich_G, expfac_trich_B],
        }

        const images = await Promise.all(decoder(files))
        images.forEach((image) => {
            const name = image.filename.split(".")[0]
            if (!isTrichName(name)) {
                throw new Error(`${name} not in trichrome`)
            }
            const c = TrichNameMap[name]
            trichImages[c] = image
        })
        if (!trichNotNull(trichImages)) {
            throw new Error("Not all trichrome images loaded")
        }
        dispatch("image", {
            index: 0,
            image: loadTrichrome(trichImages, DR),
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

        const filenames = acceptedFiles.map((file) => file.name.split(".")[0])

        if (
            TRICHNAMES.every((x) => filenames.includes(x)) &&
            filenames.length == 6
        ) {
            console.log("Trichrome")
            openTrichrome(acceptedFiles)
        } else if (filenames.includes("background")) {
            console.log("Background")
            openWithBackground(acceptedFiles)
        } else {
            console.log("Single")
            openFiles(acceptedFiles)
        }
    }
</script>

<div class="fileSelector">
    <h1>Select File</h1>

    <Dropzone on:drop={handleFilesSelect} accept=".RAF" inputElement="null" />

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
        <option value="1">DR100</option>
        <option value="2" selected>DR200</option>
        <option value="4">DR400</option>
    </select>
    <br />
    <br />
    <a href={dcp_profile} download="Provia_no_huesatmap_no_look.dcp">Download Lightroom Profile</a>
</div>

<style>
    .fileSelector {
        background-color: white;
        box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
        border-radius: 15px;
    }
</style>
