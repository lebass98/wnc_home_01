import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth, requireAdmin } from '../lib/auth.js'
import multer from 'multer'
import { ensureBuiltin, loadActiveTemplate, parseLayouts, toTemplateResponse } from '../lib/templates.js'
import {
  applyToLive,
  collectAssets,
  countFiles,
  describeFiles,
  listLanguages,
  listApplyBackupFiles,
  listApplyBackups,
  restoreApplyBackup,
  hasFiles,
  listFiles,
  packZip,
  readManifest,
  snapshotLive,
  templateDir,
  unpackZip,
  writeManifest,
  type TemplateManifest,
} from '../lib/templateFiles.js'
import { rm, cp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { applySiteData, checkSiteLinks, dumpSiteData } from '../lib/templateData.js'
import {
  hasData,
  readBackupData,
  readTemplateData,
  writeBackupData,
  writeTemplateData,
} from '../lib/templateFiles.js'
import { templateDataSchema } from '@wnc/shared'

/**
 * 템플릿 관리 — 헤더·푸터·화면별 레이아웃 선택을 한 벌(템플릿)로 묶어
 * 목록에서 활성화·복제·수정·가져오기·내보내기 한다. 활성 템플릿은 항상 정확히 하나다.
 */
export const templatesRouter = Router()

/** 레이아웃 키 — 영문·숫자·하이픈. 어떤 키가 유효한지는 web 등록부(src/layouts)가 가진다. */
const layoutKey = z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/i, '레이아웃 키는 영문·숫자·하이픈만 쓸 수 있습니다.')

/** 경로별 서브 레이아웃 매핑 */
const pageLayoutsSchema = z.record(
  z.string().regex(/^\//, '경로는 / 로 시작해야 합니다.').max(200),
  layoutKey,
)

const nameSchema = z.string().trim().min(1, '템플릿 이름을 입력하세요.').max(100)
const descriptionSchema = z.string().trim().max(300)
const versionSchema = z.string().trim().max(30)

/** 요청한 관리자 이름 — 계정 이메일의 @ 앞부분을 쓴다. */
function authorOf(email?: string): string {
  return email ? email.split('@')[0] : ''
}

async function findTemplate(id: string) {
  const num = Number(id)
  if (!Number.isInteger(num)) return null
  return prisma.siteTemplate.findUnique({ where: { id: num } })
}

/** 담긴 데모 데이터의 메뉴·페이지 개수 — 목록·정보 창에 보여 준다. */
async function countData(id: number): Promise<{ dataMenus: number; dataPages: number }> {
  if (!hasData(id)) return { dataMenus: 0, dataPages: 0 }
  const parsed = templateDataSchema.safeParse(await readTemplateData(id))
  if (!parsed.success) return { dataMenus: 0, dataPages: 0 }
  return { dataMenus: parsed.data.menus.length, dataPages: parsed.data.pages.length }
}

async function listAll() {
  await ensureBuiltin()
  const rows = await prisma.siteTemplate.findMany({ orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }] })
  return Promise.all(
    rows.map(async (r) => ({ ...toTemplateResponse(r), files: await countFiles(r.id), ...(await countData(r.id)) })),
  )
}

/** 이 템플릿의 매니페스트 — 파일 묶음에 함께 담긴다. */
function manifestOf(row: {
  name: string
  description: string
  version: string
  author: string
  header: string
  footer: string
  pageLayouts: string
  license?: string
  coreVersion?: string
  requires?: string
  changelog?: string
}): TemplateManifest {
  return {
    type: 'wnc-template',
    name: row.name,
    description: row.description,
    version: row.version,
    author: row.author,
    header: row.header,
    footer: row.footer,
    pageLayouts: parseLayouts(row.pageLayouts),
    // 사람이 적어 두는 값 — 비어 있으면 담지 않는다.
    ...(row.license ? { license: row.license } : {}),
    ...(row.coreVersion ? { coreVersion: row.coreVersion } : {}),
    ...(row.requires && row.requires !== '[]' ? { requires: JSON.parse(row.requires) } : {}),
    ...(row.changelog && row.changelog !== '[]' ? { changelog: JSON.parse(row.changelog) } : {}),
  }
}

templatesRouter.get(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await listAll())
  }),
)

/** 새 템플릿 — 지금 활성 템플릿을 복제해 시작한다. */
templatesRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name, description } = z.object({ name: nameSchema, description: descriptionSchema.optional() }).parse(req.body)
    const base = await loadActiveTemplate()
    const created = await prisma.siteTemplate.create({
      data: {
        name,
        description: description ?? `${base.name} 템플릿을 복제해 만든 템플릿`,
        author: authorOf(req.user?.email),
        version: '1.0.0',
        header: base.header,
        footer: base.footer,
        pageLayouts: base.pageLayouts,
      },
    })
    // 지금 사이트 소스와 메뉴·페이지를 그대로 담아 둔다 — 이 시점의 모습이 이 템플릿의 출발점이다.
    await snapshotLive(created.id, manifestOf(created))
    await writeTemplateData(created.id, await dumpSiteData())
    res.status(201).json({ ...toTemplateResponse(created), files: await countFiles(created.id), ...(await countData(created.id)) })
  }),
)

/** 템플릿 파일(JSON) 가져오기 — 파일 없이 구성만 들여온다. */
templatesRouter.post(
  '/import',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        type: z.literal('wnc-template', { errorMap: () => ({ message: '워드앤코드 템플릿 파일이 아닙니다. 내보내기로 받은 JSON 파일을 올려 주세요.' }) }),
        name: nameSchema,
        description: descriptionSchema.optional(),
        version: versionSchema.optional(),
        header: layoutKey.optional(),
        footer: layoutKey.optional(),
        pageLayouts: pageLayoutsSchema.optional(),
      })
      .parse(req.body)

    const created = await prisma.siteTemplate.create({
      data: {
        name: data.name,
        description: data.description ?? '',
        author: authorOf(req.user?.email),
        version: data.version || '1.0.0',
        header: data.header ?? 'basic',
        footer: data.footer ?? 'basic',
        pageLayouts: JSON.stringify(data.pageLayouts ?? {}),
      },
    })
    res.status(201).json(toTemplateResponse(created))
  }),
)

/** zip 가져오기 — 화면·레이아웃·부품 파일과 매니페스트가 담긴 묶음을 통째로 들여온다. */
const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/\.zip$/i.test(file.originalname)) return cb(new Error('zip 파일만 올릴 수 있습니다.'))
    cb(null, true)
  },
})

templatesRouter.post('/import-zip', requireAuth,
  requireAdmin, (req, res) => {
  uploadZip.single('file')(req, res, async (err) => {
    try {
      if (err) {
        const message =
          (err as { code?: string }).code === 'LIMIT_FILE_SIZE'
            ? '템플릿 zip 은 20MB 를 넘을 수 없습니다.'
            : (err as Error).message
        return res.status(400).json({ message })
      }
      if (!req.file) return res.status(400).json({ message: '파일이 없습니다.' })

      // 먼저 행을 만들어 id 를 받고, 그 id 폴더에 압축을 푼다.
      const placeholder = await prisma.siteTemplate.create({
        data: { name: '가져오는 중', author: authorOf(req.user?.email) },
      })
      try {
        const { manifest, files } = await unpackZip(req.file.buffer, placeholder.id)
        const updated = await prisma.siteTemplate.update({
          where: { id: placeholder.id },
          data: {
            name: manifest.name.trim(),
            description: manifest.description?.trim() ?? '',
            version: manifest.version?.trim() || '1.0.0',
            header: manifest.header ?? 'basic',
            footer: manifest.footer ?? 'basic',
            pageLayouts: JSON.stringify(manifest.pageLayouts ?? {}),
            license: manifest.license ?? '',
            coreVersion: manifest.coreVersion ?? '',
            requires: JSON.stringify(manifest.requires ?? []),
            changelog: JSON.stringify(manifest.changelog ?? []),
          },
        })
        return res.status(201).json({ ...toTemplateResponse(updated), files, ...(await countData(updated.id)) })
      } catch (e) {
        // 압축이 잘못됐으면 만들어 둔 행과 폴더를 되돌린다.
        await prisma.siteTemplate.delete({ where: { id: placeholder.id } }).catch(() => {})
        await rm(templateDir(placeholder.id), { recursive: true, force: true }).catch(() => {})
        return res.status(400).json({ message: (e as Error).message })
      }
    } catch (e) {
      return res.status(500).json({ message: (e as Error).message })
    }
  })
})

/** 메뉴·화면 대조 — 갈 곳 없는 메뉴, 메뉴 없는 페이지를 찾아 준다. */
templatesRouter.get(
  '/link-check',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await checkSiteLinks())
  }),
)

/**
 * 적용 기록 — 템플릿을 켤 때 덮어쓰기 전 남겨 둔 원본 목록.
 * 되돌리면 그 시점의 사이트 파일로 돌아간다.
 */
templatesRouter.get(
  '/apply-backups',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await listApplyBackups())
  }),
)

/** 그 기록에 담긴 파일 목록 */
templatesRouter.get(
  '/apply-backups/:stamp',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    try {
      res.json(await listApplyBackupFiles(req.params.stamp))
    } catch (e) {
      res.status(400).json({ message: (e as Error).message })
    }
  }),
)

/** 되돌리기 — 되돌리기 직전 모습도 새 기록으로 남는다. */
templatesRouter.post(
  '/apply-backups/:stamp/restore',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    try {
      // 되돌리기 직전의 메뉴·페이지를 먼저 담아 둔다 — 파일 백업과 같은 폴더에 남는다.
      const currentData = await dumpSiteData()
      const result = await restoreApplyBackup(req.params.stamp)
      await writeBackupData(result.backup, currentData)
      // 그 백업에 메뉴·페이지가 담겨 있으면 함께 되돌린다.
      const backupData = await readBackupData(req.params.stamp)
      const dataRestored = backupData ? await applySiteData(backupData) : null
      res.json({ ...result, dataRestored, linkIssues: await checkSiteLinks() })
    } catch (e) {
      res.status(400).json({ message: (e as Error).message })
    }
  }),
)

/** 보관된 파일 목록 — 어떤 파일이 담겨 있는지 보여 준다. */
templatesRouter.get(
  '/:id/files',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })
    res.json({ manifest: await readManifest(row.id), folders: await listFiles(row.id) })
  }),
)

/**
 * 템플릿 정보 — 저장해 둔 값과 파일에서 읽어 낸 값을 함께 준다.
 * 화면·레이아웃·부품 설명, 바깥 자원, 쓸 수 있는 언어는 파일을 훑어 그때그때 만든다.
 */
templatesRouter.get(
  '/:id/info',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })

    const [files, assets, languages] = await Promise.all([describeFiles(row.id), collectAssets(row.id), listLanguages()])
    res.json({
      template: { ...toTemplateResponse(row), files: await countFiles(row.id), ...(await countData(row.id)) },
      ...files,
      assets,
      languages,
    })
  }),
)

/** 지금 사이트 모습을 이 템플릿에 담는다 — 고친 내용을 템플릿으로 갈무리할 때. */
templatesRouter.post(
  '/:id/snapshot',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })
    const files = await snapshotLive(row.id, manifestOf(row))
    // 화면 파일과 함께 지금 메뉴·페이지도 담는다 — 이 템플릿을 다시 켤 때 되살릴 수 있다.
    await writeTemplateData(row.id, await dumpSiteData())
    res.json({ ...toTemplateResponse(row), files, ...(await countData(row.id)) })
  }),
)

/** 이름·설명·버전과 구성(헤더·푸터·화면별 레이아웃)을 고친다. */
templatesRouter.put(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })

    const data = z
      .object({
        name: nameSchema.optional(),
        description: descriptionSchema.optional(),
        version: versionSchema.optional(),
        header: layoutKey.optional(),
        footer: layoutKey.optional(),
        pageLayouts: pageLayoutsSchema.optional(),
        // 템플릿 정보 — 비워 둘 수 있다.
        license: z.string().trim().max(60).optional(),
        coreVersion: z.string().trim().max(40).optional(),
        requires: z.array(z.enum(['board', 'product', 'popup', 'faq', 'contact', 'page', 'menu'])).optional(),
        changelog: z
          .array(
            z.object({
              version: z.string().trim().max(30),
              date: z.string().trim().max(20),
              notes: z.string().max(2000),
            }),
          )
          .max(50)
          .optional(),
      })
      .parse(req.body)

    const updated = await prisma.siteTemplate.update({
      where: { id: row.id },
      data: {
        ...data,
        pageLayouts: data.pageLayouts === undefined ? undefined : JSON.stringify(data.pageLayouts),
        requires: data.requires === undefined ? undefined : JSON.stringify(data.requires),
        changelog: data.changelog === undefined ? undefined : JSON.stringify(data.changelog),
      },
    })
    // 보관된 묶음의 매니페스트도 같은 값으로 맞춘다.
    if (hasFiles(updated.id)) await writeManifest(updated.id, manifestOf(updated))
    res.json({ ...toTemplateResponse(updated), files: await countFiles(updated.id) })
  }),
)

/**
 * 활성화 — 이 한 벌만 켜고 나머지는 끈다.
 * 지금 사이트 모습은 켜져 있던 템플릿에 먼저 담아 두고(그동안 고친 내용을 잃지 않는다),
 * 새 템플릿의 파일을 사이트에 덮어쓴다. 덮어쓰기 전 원본도 시각별 백업으로 남는다.
 */
templatesRouter.post(
  '/:id/activate',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })
    const { withData } = z.object({ withData: z.boolean().optional() }).parse(req.body ?? {})
    if (row.active) return res.json({ templates: await listAll(), applied: 0, backup: '', dataApplied: null, linkIssues: await checkSiteLinks() })
    if (!hasFiles(row.id)) {
      return res.status(400).json({ message: '이 템플릿에는 보관된 파일이 없어 적용할 수 없습니다. 파일이 담긴 zip 으로 다시 설치해 주세요.' })
    }
    if (withData && !hasData(row.id)) {
      return res.status(400).json({ message: '이 템플릿에는 메뉴·페이지 데이터(data.json)가 없습니다. 화면만 적용해 주세요.' })
    }

    // 1) 지금 켜져 있는 템플릿에 현재 사이트 모습(파일 + 메뉴·페이지)을 갈무리한다.
    //    나중에 그 템플릿을 다시 켜면 그때의 메뉴·페이지도 함께 되살릴 수 있다.
    const currentData = await dumpSiteData()
    const current = await prisma.siteTemplate.findFirst({ where: { active: true }, orderBy: { id: 'asc' } })
    if (current) {
      await snapshotLive(current.id, manifestOf(current))
      await writeTemplateData(current.id, currentData)
    }

    // 2) 새 템플릿의 파일을 사이트에 적용하고, 백업에 지금 메뉴·페이지도 남긴다.
    const applied = await applyToLive(row.id)
    await writeBackupData(applied.backup, currentData)

    // 3) 함께 적용을 골랐으면 메뉴·페이지를 템플릿 데이터로 갈아 끼운다.
    let dataApplied: { menus: number; pages: number } | null = null
    if (withData) dataApplied = await applySiteData(await readTemplateData(row.id))

    // 4) 켜짐 표시를 옮긴다.
    await prisma.$transaction([
      prisma.siteTemplate.updateMany({ where: { active: true }, data: { active: false } }),
      prisma.siteTemplate.update({ where: { id: row.id }, data: { active: true } }),
    ])

    // 5) 메뉴 주소와 화면이 서로 맞는지 대조해 어긋난 곳을 알려 준다.
    res.json({
      templates: await listAll(),
      applied: applied.applied,
      backup: applied.backup,
      dataApplied,
      linkIssues: await checkSiteLinks(),
    })
  }),
)

/** 복제 */
templatesRouter.post(
  '/:id/duplicate',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })

    const created = await prisma.siteTemplate.create({
      data: {
        name: `${row.name} 복사본`,
        description: row.description,
        author: authorOf(req.user?.email),
        version: row.version,
        header: row.header,
        footer: row.footer,
        pageLayouts: row.pageLayouts,
      },
    })
    // 파일 묶음(데모 데이터 포함)도 그대로 복사한다.
    if (hasFiles(row.id)) {
      await cp(templateDir(row.id), templateDir(created.id), { recursive: true })
      await writeManifest(created.id, manifestOf(created))
    }
    res.status(201).json({ ...toTemplateResponse(created), files: await countFiles(created.id), ...(await countData(created.id)) })
  }),
)

/** 내보내기 — 화면·레이아웃·부품 파일과 매니페스트를 zip 으로 묶어 내려준다. */
templatesRouter.get(
  '/:id/export',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })
    // 아직 파일이 없는 템플릿(예전 방식으로 만든 것)은 지금 사이트 모습을 담아 준다.
    if (!hasFiles(row.id)) await snapshotLive(row.id, manifestOf(row))
    else await writeManifest(row.id, manifestOf(row))

    const zip = await packZip(row.id)
    // 파일명에 쓸 수 없는 글자는 밑줄로 바꾼다. 한글 이름은 그대로 쓰되 헤더에는 인코딩해 담는다.
    const base = `${row.name.replace(/[\\/:*?"<>|]/g, '_')}.wnc-template.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(base)}`)
    res.send(zip)
  }),
)

templatesRouter.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const row = await findTemplate(req.params.id)
    if (!row) return res.status(404).json({ message: '템플릿을 찾을 수 없습니다.' })
    if (row.builtin) return res.status(400).json({ message: '기본 제공 템플릿은 삭제할 수 없습니다.' })
    if (row.active) return res.status(400).json({ message: '사용 중인 템플릿은 삭제할 수 없습니다. 다른 템플릿을 먼저 활성화하세요.' })

    await prisma.siteTemplate.delete({ where: { id: row.id } })
    if (existsSync(templateDir(row.id))) await rm(templateDir(row.id), { recursive: true, force: true })
    res.json({ ok: true })
  }),
)
