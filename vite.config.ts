import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Cross-origin isolation so the GBA emulator (EmulatorJS / mGBA) can use
// SharedArrayBuffer + the threaded core. `require-corp` (not `credentialless`)
// because Safari — including iOS — only supports `require-corp`; with
// `credentialless` every Safari visitor would silently drop to the
// single-threaded core. The one cross-origin subresource on the site is the
// Supabase Storage images, which load via CORS (`crossorigin` attr, Supabase
// sends `Access-Control-Allow-Origin: *`), so `require-corp` is satisfied.
// Anything not isolated still works: GameBoyAdvanceApp only asks for threads
// when `crossOriginIsolated` is true.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
})
