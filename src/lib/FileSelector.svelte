<script lang="ts">
    import Dropzone from "svelte-file-dropzone";
    import { number_of_workers } from "./utils"

    function handleFilesSelect(e) {
        const { acceptedFiles, fileRejections }: { acceptedFiles: File[], fileRejections: File[] } = e.detail;
        if (fileRejections.length != 0) {
            console.log(fileRejections)
        }
        const files = Array.from(acceptedFiles.entries())
        
        const nWorkers = number_of_workers(files.length)
        const filesPerWorker = Math.floor(files.length / nWorkers)
        const remainder = files.length % nWorkers
        // console.log(nWorkers, filesPerWorker)
        for (let i = 0; i < nWorkers; i++) {
            const worker = new Worker(new URL("./decode_worker.ts", import.meta.url), { type: "module" })
            const workerFiles = (i < remainder) ?
                [...files.slice(i*filesPerWorker, (i+1)*filesPerWorker), files[nWorkers*filesPerWorker + i]] : 
                files.slice(i*filesPerWorker, (i+1)*filesPerWorker)
            // console.log(workerFiles.map(x => x[0]))
            worker.postMessage(workerFiles)
            worker.onmessage = message => console.log(message.data)
        }

    }
</script>

<div class="fileSelector">
    <h1>Select File</h1>
    <Dropzone on:drop={handleFilesSelect} accept=".RAF"/>
</div>

<style>
.fileSelector {
    background-color: white;
    box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
    border-radius: 15px;
}
</style>