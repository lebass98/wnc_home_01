import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../lib/auth.js'

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

/**
 * 올릴 수 있는 이미지 형식.
 * SVG 는 받지 않는다 — 안에 스크립트를 담을 수 있고, 같은 도메인에서 열리면
 * 관리자 화면을 노리는 공격에 쓰일 수 있다. 로고처럼 꼭 필요하면 PNG·WEBP 로 올린다.
 */
const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
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
      return cb(new Error('이미지 파일(JPG, PNG, WEBP, GIF)만 업로드할 수 있습니다. SVG 는 보안상 받지 않습니다.'))
    }
    cb(null, true)
  },
})

export const uploadsRouter = Router()

/** 첨부파일 — 이미지 외에 PDF·ZIP 도 받는다. 개당 10MB. (페이지 첨부파일 카드가 쓴다) */
const ALLOWED_FILE = new Map([
  ...ALLOWED,
  ['application/pdf', '.pdf'],
  ['application/zip', '.zip'],
  ['application/x-zip-compressed', '.zip'],
])

const uploadFile = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = ALLOWED_FILE.get(file.mimetype) ?? ''
      cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_FILE.has(file.mimetype)) {
      return cb(new Error('JPG, PNG, WEBP, GIF, PDF, ZIP 파일만 올릴 수 있습니다. SVG 는 보안상 받지 않습니다.'))
    }
    cb(null, true)
  },
})

uploadsRouter.post('/file', requireAuth, (req, res) => {
  uploadFile.single('file')(req, res, (err) => {
    if (err) {
      const message =
        (err as { code?: string }).code === 'LIMIT_FILE_SIZE'
          ? '파일 크기는 10MB 를 넘을 수 없습니다.'
          : (err as Error).message
      return res.status(400).json({ message })
    }
    if (!req.file) return res.status(400).json({ message: '파일이 없습니다.' })

    // multer 는 파일명을 latin1 로 넘겨 한글이 깨진다 — utf8 로 되살린다.
    const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
    res.status(201).json({ url: `/uploads/${req.file.filename}`, name, size: req.file.size })
  })
})

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
