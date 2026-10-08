/**
 * Vercel 빌드 — Build Output API(.vercel/output)로 웹 화면과 API 서버 함수를 직접 만든다.
 *
 * Vercel 의 자동 변환에 맡기면 API(ES 모듈)·공용 패키지(@wnc/shared, TS 원본)를 제대로 읽지 못해
 * 서버 함수가 뜨지 않았다. 그래서 API 전체를 esbuild 로 파일 하나에 미리 묶어 넘긴다.
 * 로컬에서도 `node scripts/vercel-build.mjs` 로 같은 결과물을 만들어 확인할 수 있다.
 *
 *   .vercel/output/static/              웹 빌드 결과(apps/web/dist)
 *   .vercel/output/functions/api.func/  API 서버 함수 — index.mjs 하나 + Prisma 엔진
 *   .vercel/output/config.json          경로 연결 — /api·/uploads 는 함수로, 나머지는 화면(SPA)
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'

const root = path.resolve(import.meta.dirname, '..')
const out = path.join(root, '.vercel/output')
const func = path.join(out, 'functions/api.func')
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' })

rmSync(out, { recursive: true, force: true })

// 1) Prisma 클라이언트 + 웹 빌드
run('npx prisma generate --schema apps/api/prisma/schema.prisma')
run('npm run build:web')
cpSync(path.join(root, 'apps/web/dist'), path.join(out, 'static'), { recursive: true })

// 2) API 를 파일 하나로 묶는다. Prisma 는 엔진 파일이 따로 있어 묶지 않고 함께 복사한다.
//    playwright·esbuild 는 로컬 전용 기능(미리보기 촬영·코드 검사)에서만 필요할 때 불러온다.
mkdirSync(func, { recursive: true })
await build({
  entryPoints: [path.join(root, 'apps/api/src/app.ts')],
  outfile: path.join(func, 'app.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['@prisma/client', '.prisma/client', 'playwright', 'playwright-core', 'esbuild'],
  // 묶인 CommonJS 의존성(express 등)이 require 를 쓸 수 있게 한다.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'warning',
})
writeFileSync(path.join(func, 'index.mjs'), "import app from './app.mjs'\nexport default app\n")
writeFileSync(path.join(func, 'package.json'), JSON.stringify({ type: 'module' }))
for (const dep of ['@prisma/client', '.prisma/client']) {
  const from = path.join(root, 'node_modules', dep)
  if (existsSync(from)) cpSync(from, path.join(func, 'node_modules', dep), { recursive: true, dereference: true })
}
writeFileSync(
  path.join(func, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', maxDuration: 30, shouldAddHelpers: true }, null, 2),
)

// 3) 경로 연결
writeFileSync(
  path.join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '^/(api|uploads)(/.*)?$', dest: '/api' },
        { handle: 'filesystem' },
        { src: '/.*', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
)
console.log('Vercel 빌드 결과물을 만들었습니다 → .vercel/output')
