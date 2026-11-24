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
  // dist/ лежить у репозиторії: застосунки ставлять пакет з git без збирання
  sourcemap: false,
  external: ['vue', '@napi-rs/canvas'],
})
