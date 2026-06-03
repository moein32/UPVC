import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
      onwarn(warning, warn) {
        // Suppress specific warnings from 'use client' directives in node_modules
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
          warning.message.includes('"use client"') &&
          warning.id &&
          warning.id.includes('node_modules')
        ) {
          return; // Ignore this warning
        }
        warn(warning); // Otherwise, call the default warn handler
      },
    },
  },
  plugins: [
    react(),
  ]
});