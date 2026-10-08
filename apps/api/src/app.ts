/**
 * Express 앱 — 경로·미들웨어만 꾸린다. 서버를 띄우는 일은 server.ts(로컬)와 api/index.ts(Vercel)가 맡는다.
 */
import { componentsRouter } from './routes/components.js'
import express from 'express'
import cors from 'cors'
import { env } from './lib/env.js'
import { errorHandler } from './lib/handler.js'
import { authRouter } from './routes/auth.js'
import { postsRouter } from './routes/posts.js'
import { boardsRouter } from './routes/boards.js'
import { contactsRouter } from './routes/contacts.js'
import { dashboardRouter } from './routes/dashboard.js'
import { categoriesRouter } from './routes/categories.js'
import { productsRouter } from './routes/products.js'
import { pagesRouter } from './routes/pages.js'
import { settingsRouter } from './routes/settings.js'
import { boardSettingsRouter } from './routes/boardSettings.js'
import { reportsRouter } from './routes/reports.js'
import { statsRouter } from './routes/stats.js'
import { popupsRouter } from './routes/popups.js'
import { faqsRouter } from './routes/faqs.js'
import { privacyRevisionsRouter } from './routes/privacyRevisions.js'
import { sitePagesRouter } from './routes/sitePages.js'
import { menusRouter } from './routes/menus.js'
import { designRouter } from './routes/design.js'
import { templatesRouter } from './routes/templates.js'
import { uploadsRouter } from './routes/uploads.js'
import { readUpload } from './lib/storage.js'
import { asyncHandler } from './lib/handler.js'
import path from 'node:path'
import { trashRouter } from './routes/trash.js'
import { redirectsRouter } from './routes/redirects.js'
import { mediaRouter } from './routes/media.js'
import { activityLogsRouter } from './routes/activityLogs.js'
import { activityLogger } from './lib/activityLog.js'

const app = express()
// 프록시(Vite·nginx) 뒤에 있으므로 X-Forwarded-For 로 실제 접속 주소를 읽는다.
app.set('trust proxy', true)

app.use(cors({ origin: env.corsOrigin }))
// 상세 본문에 이미지가 들어갈 수 있어 한도를 넉넉히 잡는다.
app.use(express.json({ limit: '10mb' }))

// 템플릿 원본 소스와 적용 백업(메뉴·페이지 데이터)도 로컬 uploads 폴더 아래에 있지만 공개 파일이 아니다 —
// 관리자 API(/api/templates)로만 다루고, /uploads 주소로는 내주지 않는다 (아래 /uploads/:name 은 맨 위 파일만 연다).
app.use(['/uploads/templates', '/uploads/template-apply-backups'], (_req, res) => {
  res.status(404).end()
})
// 업로드 파일 — 저장소(Vercel Blob 또는 로컬 폴더)에서 꺼내 보낸다. 주소는 늘 /uploads/<파일> 이다.
// 파일 이름이 매번 새로 만들어지므로 한 번 보낸 파일은 CDN·브라우저가 오래 캐시해도 된다.
app.get(
  '/uploads/:name',
  asyncHandler(async (req, res) => {
    const file = await readUpload(req.params.name)
    if (!file) return res.status(404).end()
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
    res.setHeader('Content-Length', String(file.size))
    if (file.etag) res.setHeader('ETag', file.etag)
    if (file.contentType) res.type(file.contentType)
    else res.type(path.extname(req.params.name))
    // 예전에 올라간 SVG 가 열리더라도 스크립트가 돌지 않도록 가둬 둔다.
    if (req.params.name.toLowerCase().endsWith('.svg')) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
    }
    file.stream.on('error', () => res.destroy()).pipe(res)
  }),
)

app.get('/api/health', (_req, res) => res.json({ ok: true }))
// 관리자 활동 로그 — /api 아래의 모든 변경 요청을 응답이 끝난 뒤 한 곳에서 남긴다.
app.use('/api', activityLogger)
app.use('/api/auth', authRouter)
app.use('/api/boards', boardsRouter)
app.use('/api/posts', postsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/products', productsRouter)
app.use('/api/pages', pagesRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/board-settings', boardSettingsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/stats', statsRouter)
app.use('/api/popups', popupsRouter)
app.use('/api/faqs', faqsRouter)
app.use('/api/privacy-revisions', privacyRevisionsRouter)
app.use('/api/site-pages', sitePagesRouter)
app.use('/api/menus', menusRouter)
app.use('/api/design', designRouter)
app.use('/api/components', componentsRouter)
app.use('/api/templates', templatesRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/trash', trashRouter)
app.use('/api/redirects', redirectsRouter)
app.use('/api/media', mediaRouter)
app.use('/api/activity-logs', activityLogsRouter)

app.use((_req, res) => res.status(404).json({ message: '요청한 경로를 찾을 수 없습니다.' }))
app.use(errorHandler)

export default app
