import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:9898',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    host: true,          // 👈 VERY IMPORTANT for cloudflared
    allowedHosts: [
      '.trycloudflare.com',
      'color-maintains-gentleman-reserve.trycloudflare.com',
    ],
    proxy: apiProxy,
  },

  // `vite preview` needs the same forwarding rule when the Cloudflare tunnel
  // exposes a production-like local build.
  preview: {
    host: true,
    proxy: apiProxy,
  },
})
