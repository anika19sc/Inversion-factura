import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'postcss', // Forzamos a usar PostCSS en lugar de LightningCSS
    lightningcss: false     // Desactivamos LightningCSS explícitamente
  },
  build: {
    cssMinify: 'esbuild',   // Usamos esbuild que es más tolerante
    minify: 'esbuild'
  }
})