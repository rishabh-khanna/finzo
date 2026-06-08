import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/finzo/',
  optimizeDeps: { exclude: ['pdfjs-dist'] },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:  ['react','react-dom'],
          charts:  ['recharts'],
          pdfjs:   ['pdfjs-dist'],
          supabase:['@supabase/supabase-js'],
        }
      }
    }
  }
})
