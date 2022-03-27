import App from './App.svelte'
import init from '../rawloader-wasm/pkg/rawloader_wasm'

await init()
const app = new App({
    target: document.getElementById('app')
})

export default app
