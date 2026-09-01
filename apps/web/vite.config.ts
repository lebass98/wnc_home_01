import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// GitHub Pages 는 https://<user>.github.io/<repo>/ 하위 경로로 서빙되므로
// 배포 빌드에서만 BASE_PATH 를 지정한다. 로컬 개발에서는 '/' 를 사용한다.
export default defineConfig(() => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
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
