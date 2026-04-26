import glsl from "vite-plugin-glsl"
import { defineConfig, searchForWorkspaceRoot } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [svelte(), glsl()],
    assetsInclude: ["**/*.dcp"],
    optimizeDeps: {
        exclude: [
            "libraw-wasm", // or whatever package imports the worker
        ],
    },
    worker: {
        format: "es",
        plugins: () => [wasm(), topLevelAwait()],
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
