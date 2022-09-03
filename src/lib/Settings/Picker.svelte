<script lang="ts">
import { current_component } from "svelte/internal";

    import { images, index, mainCanvas as canvas } from "../../stores";

    export let color: [number, number, number] = [0, 0, 0]
    $: cssColor = (x => `rgb(${x[0]}, ${x[1]}, ${x[2]})`)(to8bit(color))
    $: image = $images[$index]
    //console.log("Main Width: ", $canvas.width)

    function detectColor(e: MouseEvent) {
        const rect = $canvas.getBoundingClientRect();

        const w = image.width
        const h = image.height

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const x = Math.round(mouseX * w / $canvas.width)
        const y = Math.round(mouseY * h / $canvas.height)

        console.log(x, y)
        // Average of 9 pixels
        let pickedColor: [number, number, number] = [0, 0, 0]
        for (let i of [x-1, x, x+1]) {
            for (let j of [y-1, y, y+1]) {
                pickedColor[0] += image.image[(y*w+x)*4] 
                pickedColor[1] += image.image[(y*w+x)*4 + 1] 
                pickedColor[2] += image.image[(y*w+x)*4 + 2] 
            }
        }
        color = pickedColor
        color[0] /= 9
        color[1] /= 9
        color[2] /= 9
        console.log()
        console.log("picked: ", pickedColor)
        $canvas.removeEventListener("click", detectColor)
    }

    function startPicking() {
        $canvas.addEventListener("click", detectColor)
    }

    function to8bit(color: [number, number, number]): [number, number, number] {
        if (image)
            return [Math.round((color[0]-1024)*image.wb_coeffs[0]/(100*image.wb_coeffs[1])*2),
                    Math.round((color[1]-1024)/100),
                    Math.round((color[2]-1024)*image.wb_coeffs[2]/(100*image.wb_coeffs[1])*2)]
        else
            return [0, 0, 0]
    }

</script>

<div class="advanced">
    <div id=colorSquare style="--css-color: {cssColor}" on:click="{startPicking}"></div>
    <input type="number" bind:value={color[0]}>
    <input type="number" bind:value={color[1]}>
    <input type="number" bind:value={color[2]}>
</div>

<style>
    #colorSquare {
        width: 20px;
        height: 20px;
        border: 1px solid black;
        background-color: var(--css-color);
    }
</style>