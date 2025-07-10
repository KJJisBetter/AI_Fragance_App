import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          // Enable React 19 Compiler for automatic optimizations
          ['babel-plugin-react-compiler', {
            compilationMode: 'annotation', // Start with annotation mode for safety
          }],
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and core libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],

          // tRPC and query management
          trpc: ['@trpc/client', '@trpc/react-query', '@tanstack/react-query'],

          // UI components and styling
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'lucide-react',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],

          // Form and validation
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],

          // State management
          store: ['zustand'],

          // Utilities
          utils: ['axios']
        },
        chunkFileNames: (chunkInfo) => {
          // Use content-based naming for better caching
          if (chunkInfo.name === 'vendor') {
            return 'assets/vendor-[hash].js'
          }
          if (chunkInfo.name === 'trpc') {
            return 'assets/trpc-[hash].js'
          }
          if (chunkInfo.name === 'ui') {
            return 'assets/ui-[hash].js'
          }
          return 'assets/[name]-[hash].js'
        },
        entryFileNames: 'assets/main-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Increase chunk size warning limit for better performance
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      '@fragrance-battle/types',
      'react',
      'react-dom',
      '@trpc/client',
      '@trpc/react-query',
      '@tanstack/react-query',
      'zustand',
      'zod'
    ],
    exclude: ['@fragrance-battle/database'] // Exclude server-only packages
  },
  // Enable CSS code splitting
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    devSourcemap: true,
  },
  // Performance optimizations
  esbuild: {
    // Remove console and debugger in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
})
