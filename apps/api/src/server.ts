import express from 'express'
import cors from 'cors'
import { env } from './lib/env.js'
import { errorHandler } from './lib/handler.js'
import { authRouter } from './routes/auth.js'
import { postsRouter } from './routes/posts.js'
import { contactsRouter } from './routes/contacts.js'
import { dashboardRouter } from './routes/dashboard.js'
import { categoriesRouter } from './routes/categories.js'
import { productsRouter } from './routes/products.js'
import { pagesRouter } from './routes/pages.js'
import { uploadsRouter, UPLOAD_DIR } from './routes/uploads.js'

const app = express()

app.use(cors({ origin: env.corsOrigin }))
// 상세 본문에 이미지가 들어갈 수 있어 한도를 넉넉히 잡는다.
app.use(express.json({ limit: '10mb' }))

// 업로드된 이미지를 정적으로 서빙한다.
app.use('/uploads', express.static(UPLOAD_DIR))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/posts', postsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/products', productsRouter)
app.use('/api/pages', pagesRouter)
app.use('/api/uploads', uploadsRouter)

app.use((_req, res) => res.status(404).json({ message: '요청한 경로를 찾을 수 없습니다.' }))
app.use(errorHandler)

app.listen(env.port, () => {
  console.log(`API 서버 실행 중 → http://localhost:${env.port}`)
})
