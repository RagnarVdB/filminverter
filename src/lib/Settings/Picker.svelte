<script lang="ts">
    import { images, index, mainCanvas as canvas } from "../../stores"
    import { applyRotationAndZoom } from "../rotation"

    export let color: [number, number, number] = [0, 0, 0]
    $: cssColor = ((x) => `rgb(${x[0]}, ${x[1]}, ${x[2]})`)(to8bit(color))
    $: image = $images[$index]

    function detectColor(e: MouseEvent) {
        if (!$canvas) return
        const rect = $canvas.getBoundingClientRect()

        const w = image.width
        const h = image.height

        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        console.log("mouse", mouseX, mouseY)
        const dpr = window.devicePixelRatio || 1
        const x_canvas = mouseX / Math.round($canvas.width / dpr)
        const y_canvas = mouseY / Math.round($canvas.height / dpr)

        const [x_im, y_im] = applyRotationAndZoom(
            x_canvas,
            y_canvas,
            image.settings.rotationMatrix,
            image.settings.zoom
        )

        const x = Math.round(x_im * w)
        const y = Math.round(y_im * h)

        console.log(x_canvas, y_canvas, x_im, y_im, x, y)

        // Average of 25 pixels
        let pickedColor: [number, number, number] = [0, 0, 0]
        for (let i = -2; i < 3; i++) {
            for (let j = -2; j < 3; j++) {
                pickedColor[0] += image.image[((y + j) * w + (x + i)) * 4]
                pickedColor[1] += image.image[((y + j) * w + (x + i)) * 4 + 1]
                pickedColor[2] += image.image[((y + j) * w + (x + i)) * 4 + 2]
            }
        }
        color[0] = Math.round(pickedColor[0] / 25)
        color[1] = Math.round(pickedColor[1] / 25)
        color[2] = Math.round(pickedColor[2] / 25)
        $canvas.removeEventListener("click", detectColor)
    }

    function startPicking() {
        if (!$canvas) return
        $canvas.addEventListener("click", detectColor)
    }

    function to8bit(color: [number, number, number]): [number, number, number] {
        if (image)
            return [
                Math.round(
                    ((color[0] * image.wb_coeffs[0]) /
                        (100 * image.wb_coeffs[1])) *
                        2
                ),
                Math.round(color[1] / 100),
                Math.round(
                    ((color[2] * image.wb_coeffs[2]) /
                        (100 * image.wb_coeffs[1])) *
                        2
                ),
            ]
        else return [0, 0, 0]
    }
</script>

<div class="advanced">
    <div
        id="colorSquare"
        style="--css-color: {cssColor}"
        on:click={startPicking}
    />
    <input type="number" bind:value={color[0]} />
    <input type="number" bind:value={color[1]} />
    <input type="number" bind:value={color[2]} />
</div>

<style>
    #colorSquare {
        width: 20px;
        height: 20px;
        border: 1px solid black;
        background-color: var(--css-color);
    }
</style>
