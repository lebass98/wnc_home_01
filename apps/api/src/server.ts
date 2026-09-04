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
import { popupsRouter } from './routes/popups.js'
import { faqsRouter } from './routes/faqs.js'
import { privacyRevisionsRouter } from './routes/privacyRevisions.js'
import { sitePagesRouter } from './routes/sitePages.js'
import { menusRouter } from './routes/menus.js'
import { designRouter } from './routes/design.js'
import { templatesRouter } from './routes/templates.js'
import { uploadsRouter, UPLOAD_DIR } from './routes/uploads.js'

const app = express()

app.use(cors({ origin: env.corsOrigin }))
// 상세 본문에 이미지가 들어갈 수 있어 한도를 넉넉히 잡는다.
app.use(express.json({ limit: '10mb' }))

// 업로드된 이미지를 정적으로 서빙한다.
// 확장자와 다른 내용이 실행되지 않도록 nosniff 를 붙이고,
// 예전에 올라간 SVG 가 열리더라도 스크립트가 돌지 않도록 가둬 둔다.
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      if (filePath.toLowerCase().endsWith('.svg')) {
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
      }
    },
  }),
)

app.get('/api/health', (_req, res) => res.json({ ok: true }))
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
app.use('/api/popups', popupsRouter)
app.use('/api/faqs', faqsRouter)
app.use('/api/privacy-revisions', privacyRevisionsRouter)
app.use('/api/site-pages', sitePagesRouter)
app.use('/api/menus', menusRouter)
app.use('/api/design', designRouter)
app.use('/api/templates', templatesRouter)
app.use('/api/uploads', uploadsRouter)

app.use((_req, res) => res.status(404).json({ message: '요청한 경로를 찾을 수 없습니다.' }))
app.use(errorHandler)

app.listen(env.port, () => {
  console.log(`API 서버 실행 중 → http://localhost:${env.port}`)
})
