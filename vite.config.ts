import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // The bundle report is only useful on demand (`ANALYZE=1 npm run build`); generating it
    // - including gzip + brotli size passes - on every build just slowed normal builds down.
    ...(process.env.ANALYZE
      ? [visualizer({
          filename: 'stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        })]
      : [])
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['framer-motion'],
          'db': ['@supabase/supabase-js']
        }
      }
    }
  }
})
