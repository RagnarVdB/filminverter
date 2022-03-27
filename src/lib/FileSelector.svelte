<script lang="ts">
    import Dropzone from "svelte-file-dropzone";

    let files: File[] = []

    function handleFilesSelect(e) {
      const { acceptedFiles, fileRejections } = e.detail;
      files = [...files, ...acceptedFiles];
      if (fileRejections.length != 0) {
          console.log(fileRejections)
      }
      console.log(files)
    }
</script>

<div class="fileSelector">
    <h1>Select File</h1>
    <Dropzone on:drop={handleFilesSelect}/>
</div>

<style>
.fileSelector {
    background-color: white;
    box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
    border-radius: 15px;
}
</style>