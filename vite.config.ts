import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/zustand')) return 'vendor'
          if (id.includes('node_modules/framer-motion')) return 'motion'
          if (id.includes('node_modules/lucide-react')) return 'icons'
          if (id.includes('node_modules/recharts')) return 'charts'
          if (id.includes('node_modules/react-markdown')) return 'markdown'
          if (id.includes('node_modules/react-syntax-highlighter')) return 'syntax-highlight'
          if (id.includes('@dnd-kit')) return 'dnd'
          if (id.includes('@radix-ui')) return 'ui-radix'
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})