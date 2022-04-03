<script lang="ts">
    import type { ProcessedImage } from "./RawImage";

    export let images: ProcessedImage[] = []
</script>

<div class="ImageArea">
    Images Go Here
</div>

<style>
.ImageArea {
    background-color: white;
    box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.25);
    border-radius: 15px;
}
    </style>