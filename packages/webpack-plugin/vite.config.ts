import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: ['src/index.ts'],
      formats: ['umd', 'es'],
      fileName: '[name]',
      name: 'WebpackCodeInspectorPlugin',
    },
    minify: false,
    emptyOutDir: false,
    rollupOptions: {
      external: ['code-inspector-core', '@vue/compiler-sfc', 'path'],
      output: {
        exports: 'default', // 设置默认导出
      },
    },
    target: ['node8', 'es2015'],
  },
});
