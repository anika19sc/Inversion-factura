import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    cssMinify: false,
    minify: false // Desactivamos todo el minificado para asegurar el éxito
  }
})