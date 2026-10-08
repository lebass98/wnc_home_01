/**
 * Vercel 서버 함수 — /api/* 와 /uploads/* 요청을 Express 앱으로 넘긴다 (vercel.json 의 rewrites).
 * 로컬 개발은 apps/api/src/server.ts 가 같은 앱을 띄운다.
 */
import app from '../apps/api/src/app.js'

export default app
