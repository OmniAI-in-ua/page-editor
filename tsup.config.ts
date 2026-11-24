import { defineConfig } from 'tsup'

// ESM для сайту й адмінки (Vite), CommonJS для бекенду (NestJS)
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    browser: 'src/browser.ts',
    node: 'src/node.ts',
    vue: 'src/vue/useEditor.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['vue', '@napi-rs/canvas'],
})
