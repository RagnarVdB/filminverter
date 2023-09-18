<script lang="ts">
    import { images, index, mainCanvas as canvas } from "../../stores"
    import { applyRotationAndZoom } from "../rotation"
    import colorPickIcon from "/src/assets/color-picker-svgrepo-com.svg"

    export let name: string = ""
    export let color: [number, number, number] = [0, 0, 0]
    $: image = $images[$index]

    function detectColor(e: MouseEvent) {
        if (!$canvas) return
        $canvas.style.cursor = "default"
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
        $canvas.style.cursor =
            "url(data:image/x-icon;base64,AAABAAEAEBAAAAAAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAAAAAAAAAAAAAAAAAAAAAAAD///8BAAAAfwAAAIH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8BAAAAcQAAAN8AAADTAAAArwAAAE8AAAAJ////Af///wH///8B////Af///wH///8B////Af///wH///8B////AQAAAJEAAADLAAAAEwAAAHsAAADDAAAA3wAAADP///8B////Af///wH///8B////Af///wH///8B////Af///wH///8BAAAAuQAAAHX///8B////AQAAAF0AAADtAAAAOf///wH///8B////Af///wH///8B////Af///wH///8B////AQAAAFMAAAC/////Af///wH///8BAAAAUQAAAO0AAAA5////Af///wH///8B////Af///wH///8B////Af///wEAAAANAAAA5wAAAFH///8B////Af///wEAAABRAAAA7QAAADn///8B////Af///wH///8B////Af///wH///8B////AQAAAD0AAADtAAAARf///wH///8B////AQAAAFEAAADtAAAAOQAAACP///8B////Af///wH///8B////Af///wH///8BAAAARQAAAO0AAABF////Af///wH///8BAAAAUQAAAO0AAADvAAAAmf///wH///8B////Af///wH///8B////Af///wEAAABFAAAA7QAAAEX///8B////AQAAADUAAADxAAAA/wAAAPcAAAAr////Af///wH///8B////Af///wH///8B////AQAAAEUAAADtAAAARQAAADUAAADvAAAA/wAAAPcAAABFAAAALf///wH///8B////Af///wH///8B////Af///wH///8BAAAARQAAAO0AAADvAAAA/wAAAPcAAABFAAAAgwAAAPsAAABX////Af///wH///8B////Af///wH///8B////AQAAACUAAADvAAAA/wAAAPcAAABFAAAAgwAAAP8AAAD/AAAA+wAAAE////8B////Af///wH///8B////Af///wEAAAADAAAAoQAAAPcAAABFAAAAgwAAAP8AAAD/AAAA/wAAAP8AAADf////Af///wH///8B////Af///wH///8B////AQAAAAMAAAAvAAAALQAAAPsAAAD/AAAA/wAAAP8AAAD/AAAA+////wH///8B////Af///wH///8B////Af///wH///8B////Af///wEAAABXAAAA+wAAAP8AAAD/AAAA/wAAALX///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////AQAAAE8AAADfAAAA+wAAALUAAAAXAAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//w==), default"
        $canvas.addEventListener("click", detectColor)
    }
</script>

<div class="picker">
    <div class="title">
        <p>{name}:</p>
        <img src={colorPickIcon} on:click={startPicking} />
    </div>
    <input type="number" bind:value={color[0]} />
    <input type="number" bind:value={color[1]} />
    <input type="number" bind:value={color[2]} />
</div>

<style>
    .picker {
        display: flex;
        flex-direction: column;
        align-items: left;
    }

    .title {
        display: flex;
        flex-direction: row;
        align-items: center;
    }
    .title img {
        width: 25px;
        height: 25px;
        /* border: 1px solid black; */
        margin-bottom: 5px;
        margin-top: 10px;
        margin-left: 10px;
        box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
        border-radius: 10%;
        cursor: pointer;
    }
    .title img:hover {
        background-color: rgb(224, 224, 224);
    }
</style>
