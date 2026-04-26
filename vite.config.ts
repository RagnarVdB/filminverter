import glsl from "vite-plugin-glsl"
import { defineConfig, searchForWorkspaceRoot } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import { wasmPackPlugin } from "./vite-wasm-pack"

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [svelte(), wasmPackPlugin(["./rawloader-wasm/pkg"]), glsl()],
    assetsInclude: ["**/*.dcp"],
    optimizeDeps: {
        exclude: [
            "libraw-wasm", // or whatever package imports the worker
        ],
    },
    build: {
        rollupOptions: {
            external: ["libraw-wasm"], // only if it's loaded at runtime
        },
    },
    worker: {
        format: "es",
        rollupOptions: {
            external: ["libraw-wasm"],
        },
    },
    server: {
        fs: {
            allow: [
                // search up for workspace root
                searchForWorkspaceRoot(process.cwd()),
                // your custom rules
                "/Users/rvandenbroec/codes/LibRaw-Wasm",
                "/Users/rvandenbroec/Documents/LibRaw-Wasm",
            ],
        },
    },
})
