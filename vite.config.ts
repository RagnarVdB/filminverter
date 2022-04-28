// @ts-nocheck

import glsl from 'vite-plugin-glsl'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { wasmPackPlugin } from './vite-wasm-pack'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), wasmPackPlugin(["./rawloader-wasm/pkg"]), glsl.default()]
})
