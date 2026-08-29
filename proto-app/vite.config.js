import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const rewriteSlashToIndexHtml = () => {
  return {
    name: 'rewrite-slash-to-index-html',
    apply: 'serve',
    enforce: 'post',
    configureServer(server) {
      // rewrite / as index.html
      server.middlewares.use('/', (req, _, next) => {
        if (req.url === '/') {
          req.url = '/index.html'
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  appType: 'mpa',
  base: "./",
  plugins: [
    vue(),
    vueDevTools(),
    rewriteSlashToIndexHtml(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/mapbox-gl')) return 'mapbox-gl'
          if (id.includes('node_modules/d3')) return 'd3'
          if (id.includes('node_modules/@turf')) return 'turf'
          if (id.includes('node_modules/vue') || id.includes('node_modules/vuex') || id.includes('node_modules/dayjs')) return 'vendor'
        },
      },
    },
  },
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
})

