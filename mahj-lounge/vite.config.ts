import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed to GitHub Pages under /life-scripts/. Override with VITE_BASE
// when hosting at a different path (e.g. VITE_BASE=/ for a custom domain).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/life-scripts/',
});
