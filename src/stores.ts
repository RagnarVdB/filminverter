import { type Writable, writable } from "svelte/store"
import type { Image } from "./lib/RawImage"

export const images: Writable<Image[]> = writable([])
export const index: Writable<number> = writable(0)
export const mainCanvas: Writable<HTMLCanvasElement | null> = writable(null)
