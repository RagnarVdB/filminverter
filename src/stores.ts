import { type Writable, writable } from "svelte/store"
import type { ProcessedImage } from "./lib/RawImage"

export const images: Writable<ProcessedImage[]> = writable([])
export const index: Writable<number> = writable(0)
export const mainCanvas: Writable<HTMLCanvasElement | null> = writable(null)
