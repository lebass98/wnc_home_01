import express from 'express'
import cors from 'cors'
import { env } from './lib/env.js'
import { errorHandler } from './lib/handler.js'
import { authRouter } from './routes/auth.js'
import { postsRouter } from './routes/posts.js'
import { contactsRouter } from './routes/contacts.js'
import { dashboardRouter } from './routes/dashboard.js'

const app = express()

app.use(cors({ origin: env.corsOrigin }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/posts', postsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/dashboard', dashboardRouter)

app.use((_req, res) => res.status(404).json({ message: '요청한 경로를 찾을 수 없습니다.' }))
app.use(errorHandler)

app.listen(env.port, () => {
  console.log(`API 서버 실행 중 → http://localhost:${env.port}`)
})
