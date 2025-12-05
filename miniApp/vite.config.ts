import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Remove console.log in production build (using esbuild minify which supports drop_console)
    minify: 'esbuild',
    // ⚡ PERFORMANCE: Improved code splitting for faster loading
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'react-router';
          }
          // UI Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'ui-icons';
          }
          // Pages (lazy loaded)
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1]?.split('/')[0]?.split('.')[0];
            if (pageName && pageName !== 'Dashboard') {
              return `page-${pageName}`;
            }
          }
        },
      },
      // ⚡ PERFORMANCE: Optimize chunk size
      chunkSizeWarningLimit: 1000,
    },
    // ⚡ PERFORMANCE: Enable source maps only in dev
    sourcemap: false,
    // ⚡ PERFORMANCE: Reduce target for better compatibility and smaller bundles
    target: 'es2020',
  },
  esbuild: {
    // Remove console.log in production
    drop: ['console', 'debugger'],
  },
});
