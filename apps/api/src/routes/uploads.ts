import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { saveUpload } from '../lib/storage.js'

/** 올린 파일의 원래 이름을 미디어 정보에 적어 둔다 — [미디어 라이브러리]에서 찾기 쉽게. */
function rememberOriginalName(filename: string, originalname: string) {
  // multer 는 파일명을 latin1 로 넘겨 한글이 깨진다 — utf8 로 되살린다.
  const originalName = Buffer.from(originalname, 'latin1').toString('utf8').slice(0, 200)
  const path = `/uploads/${filename}`
  prisma.mediaAsset
    .upsert({ where: { path }, create: { path, originalName }, update: { originalName } })
    .catch(() => {})
  return originalName
}

// 저장 위치(Blob 또는 로컬 폴더)는 lib/storage.ts 가 정한다. 예전 코드가 쓰던 이름을 그대로 내보낸다.
export { UPLOAD_DIR } from '../lib/storage.js'

/** 저장할 파일 이름 — 원본 파일명은 신뢰하지 않고 확장자만 화이트리스트에서 가져온다. */
const newName = (ext: string) => `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`

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
  // 메모리로 받아 저장소(Blob 또는 로컬 폴더)에 넘긴다 — 배포 서버는 디스크에 쓸 수 없다.
  storage: multer.memoryStorage(),
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
  // 메모리로 받아 저장소(Blob 또는 로컬 폴더)에 넘긴다 — 배포 서버는 디스크에 쓸 수 없다.
  storage: multer.memoryStorage(),
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
    const file = req.file
    if (!file) return res.status(400).json({ message: '파일이 없습니다.' })

    const filename = newName(ALLOWED_FILE.get(file.mimetype) ?? '')
    saveUpload(filename, file.buffer, file.mimetype)
      .then(() => {
        const name = rememberOriginalName(filename, file.originalname)
        res.status(201).json({ url: `/uploads/${filename}`, name, size: file.size })
      })
      .catch((e) => res.status(500).json({ message: `파일을 저장하지 못했습니다. 잠시 뒤 다시 올려 주세요. (${(e as Error).message})` }))
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
    const file = req.file
    if (!file) return res.status(400).json({ message: '파일이 없습니다.' })

    const filename = newName(ALLOWED.get(file.mimetype) ?? '')
    saveUpload(filename, file.buffer, file.mimetype)
      .then(() => {
        rememberOriginalName(filename, file.originalname)
        res.status(201).json({ url: `/uploads/${filename}` })
      })
      .catch((e) => res.status(500).json({ message: `그림을 저장하지 못했습니다. 잠시 뒤 다시 올려 주세요. (${(e as Error).message})` }))
  })
})
