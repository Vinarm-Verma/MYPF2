import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// One classic script + one stylesheet, so the portfolio still opens straight from a file or any static host.
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  css: { postcss: { plugins: [] } },
  build: {
    outDir: 'out/assets/hero',
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: { entry: 'src/main.jsx', name: 'VVHero', formats: ['iife'], fileName: () => 'hero.js' },
    rollupOptions: { output: { assetFileNames: 'hero.[ext]' } },
  },
});
