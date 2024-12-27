import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: ['src/index.ts'],
      formats: ['cjs', 'es'],
      fileName: '[name]',
      name: 'CodeInspectorPlugin',
    },
    minify: false,
    emptyOutDir: false,
    rollupOptions: {
      external: [
        'code-inspector-core',
        'vite-code-inspector-plugin',
        'webpack-code-inspector-plugin',
        'chalk',
        'dotenv',
        'fs',
        'path',
      ],
    },
    target: ['node8', 'es2015'],
  },
});
