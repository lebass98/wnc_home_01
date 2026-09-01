import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../lib/auth.js'

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/svg+xml', '.svg'],
])

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      // 원본 파일명은 신뢰하지 않고 확장자만 화이트리스트에서 가져온다.
      const ext = ALLOWED.get(file.mimetype) ?? ''
      cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new Error('이미지 파일(JPG, PNG, WEBP, GIF, SVG)만 업로드할 수 있습니다.'))
    }
    cb(null, true)
  },
})

export const uploadsRouter = Router()

uploadsRouter.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message =
        (err as { code?: string }).code === 'LIMIT_FILE_SIZE'
          ? '파일 크기는 5MB 를 넘을 수 없습니다.'
          : (err as Error).message
      return res.status(400).json({ message })
    }
    if (!req.file) return res.status(400).json({ message: '파일이 없습니다.' })

    res.status(201).json({ url: `/uploads/${req.file.filename}` })
  })
})
