<script lang="ts">
    import { images, index, mainCanvas as canvas } from "../../stores"
    import {
        applyMatrixVector,
        applyRotation,
        Matrix,
    } from "../RawImage"
    $: image = $images[$index]

    let state: "none" | "first" | "second" = "none"
    let first: [number, number] = [0, 0]
    let second: [number, number] = [0, 0]

    export let zoom: [number, number, number, number] = [1, 1, 0, 0]

    function getZoomPoint(e: MouseEvent): [number, number] {
        if (!$canvas) return [0,0]
        const rect = $canvas.getBoundingClientRect()

        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const x = mouseX / $canvas.width
        const y = mouseY / $canvas.height
        return [x, y]
    }

    function setZoomSetting() {
        const rot = image.settings.rotationMatrix
        const p1 = applyRotation(first[0], first[1], rot)
        const p2 = applyRotation(second[0], second[1], rot)

        const x1 = Math.min(p1[0], p2[0])
        const y1 = Math.min(p1[1], p2[1])
        const x2 = Math.max(p1[0], p2[0])
        const y2 = Math.max(p1[1], p2[1])

        const width = x2 - x1
        const height = y2 - y1

        zoom = [width, height, x1, 1 - y2]
        // zoom = [width, height, 1-x1, y2]
    }

    function handleClick(e: MouseEvent) {
        if (state == "first") {
            first = getZoomPoint(e)
            state = "second"
            console.log("First point set", first)
        } else if (state == "second") {
            second = getZoomPoint(e)
            state = "none"
            console.log("Second point set", second)
            setZoomSetting()
        }
    }

    function buttonClick() {
        if (state == "none") {
            state = "first"
            if ($canvas) $canvas.addEventListener("click", handleClick)
        } else {
            state = "none"
            console.log("Zoom cancelled")
        }
    }

    function reset() {
        state = "none"
        zoom = [1, 1, 0, 0]
    }
</script>

<div class="zoom">
    <button on:click={buttonClick}>Zoom</button>
    <button on:click={reset}>Reset zoom</button>
    {#if state == "first"}
        <p>Click top left corner</p>
    {:else if state == "second"}
        <p>Click bottom right corner</p>
    {/if}
</div>
