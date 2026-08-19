import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';

// Production bundle for the native (Capacitor) app and any hosted deployment.
//
// The repo root stays directly servable — GitHub Pages, the preview server and
// the test suite all load the raw ES modules with no build step, which keeps
// iteration instant. This config produces `dist/` for shipping.
//
// base:'./' is load-bearing. Capacitor serves from capacitor://localhost and
// GitHub Pages serves from /CityRunner2/, so every asset reference must be
// relative — an absolute /assets/… breaks both.
export default defineConfig({
  base: './',
  // Assets live at the repo root (assets/, privacy.html) rather than in a
  // public/ folder, so that the unbundled root deployment keeps working.
  // They are copied in after the build instead.
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Three.js is large and changes rarely; splitting it lets a repeat
        // visitor re-download only the game code.
        manualChunks(id) {
          if (id.includes('vendor/three')) return 'three';
        },
      },
    },
  },
  plugins: [
    {
      name: 'copy-static-assets',
      closeBundle() {
        for (const entry of ['assets', 'privacy.html', 'manifest.webmanifest']) {
          if (existsSync(entry)) cpSync(entry, `dist/${entry}`, { recursive: true });
        }
      },
    },
  ],
});
