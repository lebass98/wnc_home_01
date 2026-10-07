import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { existsSync } from 'node:fs'

// GitHub Pages 는 https://<user>.github.io/<repo>/ 하위 경로로 서빙되므로
// 배포 빌드에서만 BASE_PATH 를 지정한다. 로컬 개발에서는 '/' 를 사용한다.
export default defineConfig(() => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    {
      name: 'template-preview-dependencies',
      enforce: 'pre',
      transform(code, id) {
        if (!id.includes('/templates/') || !code.includes('import.meta.env.BASE_URL')) return
        const helper = JSON.stringify(path.resolve(__dirname, 'src/lib/preview.ts'))
        return { code: `import { previewAssetBase as __templateAssetBase } from ${helper};\n` + code.split('import.meta.env.BASE_URL').join('__templateAssetBase()'), map: null }
      },
      resolveId(source, importer) {
        if (!importer?.includes('/templates/') || !source.startsWith('.')) return
        // 보관된 pages/는 적용 후 src/pages/site/에 위치한다. 같은 기준으로 공통 lib를 찾는다.
        const match = importer.match(/^(.*\/templates\/[^/]+)\/(pages|layouts|components)\/(.*)$/)
        if (!match) return
        const local = path.resolve(path.dirname(importer), source)
        if (['', '.ts', '.tsx', '/index.ts', '/index.tsx'].some((ext) => existsSync(local + ext))) return
        const folder = match[2] === 'pages' ? 'pages/site' : match[2]
        const live = path.resolve(__dirname, 'src', folder, path.dirname(match[3]), source)
        return this.resolve(live, importer, { skipSelf: true })
      },
    },
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@wnc/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      // 업로드된 이미지도 API 서버가 서빙하므로 함께 프록시한다.
      '/uploads': 'http://localhost:4000',
    },
  },
}))
