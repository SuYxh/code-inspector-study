import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: ['src/index.ts'],
      formats: ['es', 'cjs'],
      fileName: '[name]',
      name: 'viteInspectorCore',
    },
    minify: false,
    emptyOutDir: false,
    rollupOptions: {
      external: [
        'os',
        'path',
        'fs',
        'process',
        'crypto',
        'http',
        'https',
        'chalk',
        'dotenv',
        'launch-ide',
        'portfinder',
        'child_process',
        '@vue/compiler-dom',
      ],
    },
    target: ['node8', 'es2015'],
  },
});
