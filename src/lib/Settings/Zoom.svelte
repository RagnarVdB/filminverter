<script lang="ts">
    import { images, index, mainCanvas as canvas } from "../../stores"
    $: image = $images[$index]

    let state: "none" | "first" | "second" = "none"
    let first: [number, number] = [0, 0]
    let second: [number, number] = [0, 0]

    export let zoom: [number, number, number] = [1, 0, 0]

    function getZoomPoint(e: MouseEvent): [number, number] {
        const rect = $canvas.getBoundingClientRect()

        const w = image.width
        const h = image.height

        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const x = Math.round((mouseX * w) / $canvas.width)
        const y = Math.round((mouseY * h) / $canvas.height)
        return [x, y]
    }

    function setZoomSetting() {
        console.log("points: ", first, second)
        const w = image.width
        const h = image.height

        const x1 = Math.min(first[0], second[0])
        const y1 = Math.min(first[1], second[1])
        const x2 = Math.max(first[0], second[0])
        const y2 = Math.max(first[1], second[1])

        const width = x2 - x1
        const height = y2 - y1

        const z = Math.min(w / width, h / height)
        const x = x1 - (w / z - width) / 2
        const y = y1 - (h / z - height) / 2
        const ax = 2*x1/w - 1
        const ay = 1 - 2*y1/h
        zoom = [z, 2*x1*z/w, 2*z * (1 - y2/h)]
        
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
            $canvas.addEventListener("click", handleClick)
        } else {
            state = "none"
            console.log("Zoom cancelled")
        }
    }

    function reset() {
        state = "none"
        zoom = [1, 0, 0]
    }

</script>

<div class=zoom>
    <button on:click={buttonClick}>Zoom</button>
    <button on:click={reset}>Reset zoom</button>
    {#if state == "first"}
        <p>Click top left corner</p>
    {:else if state == "second"}
        <p>Click bottom right corner</p>
    {/if}
</div>
