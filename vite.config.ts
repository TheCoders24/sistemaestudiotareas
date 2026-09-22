import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function removeCrossoriginPlugin() {
  return {
    name: 'remove-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/crossorigin\s*/g, '')
        .replace(/<link rel="modulepreload" href="\.\/assets\/js\/(?:charts|markdown)-[^"]*">\s*/g, '')
    },
  }
}

export default defineConfig({
  plugins: [react(), removeCrossoriginPlugin()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'oxc',
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'react-dom'
          if (id.includes('node_modules/react/') || id.includes('node_modules/zustand') || id.includes('node_modules/scheduler')) return 'vendor'
          if (id.includes('node_modules/framer-motion')) return 'motion'
          if (id.includes('node_modules/lucide-react')) return 'icons'
          if (id.includes('node_modules/recharts')) return 'charts'
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-') || id.includes('node_modules/unified') || id.includes('node_modules/mdast') || id.includes('node_modules/micromark') || id.includes('node_modules/unist') || id.includes('node_modules/vfile') || id.includes('node_modules/hast') || id.includes('node_modules/devlop') || id.includes('node_modules/trim-lines') || id.includes('node_modules/property-information') || id.includes('node_modules/space-separated-tokens') || id.includes('node_modules/comma-separated-tokens') || id.includes('node_modules/html-void-elements') || id.includes('node_modules/zwitch') || id.includes('node_modules/ccount') || id.includes('node_modules/longest-streak') || id.includes('node_modules/decode-named-character-reference') || id.includes('node_modules/parse-entities') || id.includes('node_modules/character-entities')) return 'markdown'
          if (id.includes('node_modules/react-syntax-highlighter') || id.includes('node_modules/highlight.js') || id.includes('node_modules/prismjs') || id.includes('node_modules/refractor') || id.includes('node_modules/hastscript') || id.includes('node_modules/hast-util-parse-selector') || id.includes('node_modules/web-namespaces') || id.includes('node_modules/lowlight') || id.includes('node_modules/fault')) return 'syntax-highlight'
          if (id.includes('@dnd-kit')) return 'dnd'
          if (id.includes('@radix-ui')) return 'ui-radix'
          if (id.includes('node_modules/canvas-confetti') || id.includes('node_modules/class-variance-authority') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge') || id.includes('node_modules/tailwindcss-animate')) return 'utils'
          if (id.includes('node_modules/better-sqlite3')) return 'sqlite'
          if (id.includes('node_modules/@tanstack/')) return 'tanstack'
          if (id.includes('node_modules/zod')) return 'zod'
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (info) => {
          const ext = info.name.split('.').pop()
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(info.name)) return `assets/img/[name]-[hash].${ext}`
          if (/\.(woff2?|eot|ttf|otf)$/.test(info.name)) return `assets/fonts/[name]-[hash].${ext}`
          if (/\.css$/.test(info.name)) return `assets/css/[name]-[hash].${ext}`
          return `assets/[ext]/[name]-[hash].${ext}`
        },
      },
    },
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})