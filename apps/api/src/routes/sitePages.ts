import { Router } from 'express'
import { z } from 'zod'
import path from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { readFile, readdir, stat, writeFile, copyFile } from 'node:fs/promises'
import { transform } from 'esbuild'
import { asyncHandler } from '../lib/handler.js'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../lib/auth.js'
import { loadActiveTemplate, parseLayouts } from '../lib/templates.js'

export const sitePagesRouter = Router()

/**
 * 관리할 수 있는 화면 등록부 — packages/shared 의 SITE_PAGES 와 같은 목록이다.
 * 서버는 실행 시점에 공용 패키지를 읽을 수 없어 여기에 따로 둔다. 화면을 추가하면 두 곳을 같이 고친다.
 */
const SITE_PAGES = [
  { key: 'home', label: '메인', path: '/', file: 'HomePage.tsx', description: '메인 비주얼과 소개 구역' },
  { key: 'about', label: '회사소개', path: '/about', file: 'AboutPage.tsx', description: '회사 소개 · 개발 철학' },
  { key: 'services', label: '사업분야', path: '/services', file: 'ServicesPage.tsx', description: '사업 인프라 카드' },
  { key: 'directions', label: '찾아오시는 길', path: '/about/directions', file: 'DirectionsPage.tsx', description: '지도 · 본사 · 지점' },
  { key: 'products', label: '제품소개', path: '/products', file: 'ProductsPage.tsx', description: '대분류 탭과 제품 목록' },
  { key: 'productDetail', label: '제품 상세', path: '/products/:id', file: 'ProductDetailPage.tsx', description: '제품 한 건의 상세' },
  { key: 'board', label: '소식', path: '/board', file: 'BoardPage.tsx', description: '게시판 탭과 유형별 목록' },
  { key: 'postDetail', label: '소식 상세', path: '/board/:id', file: 'PostDetailPage.tsx', description: '글 한 건의 상세' },
  { key: 'contact', label: '문의하기', path: '/contact', file: 'ContactPage.tsx', description: '문의 절차 · 연락처 · 양식' },
  { key: 'faq', label: '자주 묻는 질문', path: '/contact/faq', file: 'FaqPage.tsx', description: '분류 탭과 아코디언' },
  { key: 'custom', label: '관리자 페이지 틀', path: '/page/:slug', file: 'CustomPage.tsx', description: '페이지 관리에서 만든 페이지를 보여 주는 틀' },
  // 서브 레이아웃 — 파일은 apps/web/src/layouts 에 있다. 목록은 web 의 등록부(index.ts)가 갖는다.
  { key: 'layoutBasic', label: '레이아웃: 기본 서브', path: '', file: '../../layouts/BasicSubLayout.tsx', description: '전체 폭 본문 서브 틀', kind: 'layout' },
  { key: 'layoutLeft', label: '레이아웃: 좌측 메뉴 서브', path: '', file: '../../layouts/LeftMenuSubLayout.tsx', description: '좌측 메뉴 + 본문 서브 틀', kind: 'layout' },
  { key: 'layoutHeaderBasic', label: '레이아웃: 기본 헤더', path: '', file: '../../layouts/BasicHeader.tsx', description: '로고 왼쪽 · 펼침 2차 메뉴 헤더', kind: 'layout' },
  { key: 'layoutHeaderCenter', label: '레이아웃: 센터 헤더', path: '', file: '../../layouts/CenterHeader.tsx', description: '로고 가운데 · 드롭다운 메뉴 헤더', kind: 'layout' },
  { key: 'layoutFooterBasic', label: '레이아웃: 기본 푸터', path: '', file: '../../layouts/BasicFooter.tsx', description: '베이지 바탕 가운데 정렬 푸터', kind: 'layout' },
  { key: 'layoutFooterSimple', label: '레이아웃: 심플 푸터', path: '', file: '../../layouts/SimpleFooter.tsx', description: '어두운 바탕 한 단 푸터', kind: 'layout' },
]

/**
 * 코드로 만들어진 실제 화면의 소스를 관리자에서 보고 고친다.
 * 서버는 apps/api 에서 실행되므로 형제 폴더의 apps/web 소스를 가리킨다.
 * 고치기 전 원본은 uploads/site-page-backups 아래에 시각 이름으로 남긴다. (git 에는 올라가지 않는다)
 */
const PAGES_DIR = path.resolve(process.cwd(), '../web/src/pages/site')
const BACKUP_DIR = path.resolve(process.cwd(), 'uploads/site-page-backups')

/** 최근 몇 개까지 남길지 */
const MAX_BACKUPS = 20

/**
 * 저장하기 전에 코드가 말이 되는지 확인한다.
 * esbuild 로 한 번 변환해 보고, 문법이 깨졌으면 몇 번째 줄이 잘못됐는지 알려 준다.
 * (타입 오류까지는 보지 않는다 — 문법만 본다.)
 */
async function checkSyntax(content: string, file: string) {
  if (!/export\s+default\s+function/.test(content)) {
    return {
      ok: false as const,
      message: "'export default function' 이 없습니다. 화면 컴포넌트의 기본 내보내기를 지우면 페이지가 열리지 않습니다.",
      line: null as number | null,
      column: null as number | null,
      excerpt: null as string | null,
    }
  }
  try {
    await transform(content, { loader: 'tsx', jsx: 'automatic', sourcefile: file })
    return { ok: true as const, message: '문법에 문제가 없습니다.', line: null, column: null, excerpt: null }
  } catch (e) {
    const err = e as { errors?: { text: string; location?: { line: number; column: number; lineText: string } }[] }
    const first = err.errors?.[0]
    const loc = first?.location
    return {
      ok: false as const,
      message: first?.text ?? '코드를 해석할 수 없습니다.',
      line: loc?.line ?? null,
      column: loc ? loc.column + 1 : null,
      excerpt: loc?.lineText?.trim() ?? null,
    }
  }
}

function findDef(key: string) {
  return SITE_PAGES.find((p) => p.key === key) ?? null
}

/** 등록부에 있는 파일만 다룬다 — 주소로 아무 파일이나 읽지 못하게 한다. */
function filePathOf(key: string): string | null {
  const def = findDef(key)
  return def ? path.join(PAGES_DIR, def.file) : null
}

function backupDirOf(key: string): string {
  const dir = path.join(BACKUP_DIR, key)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * 백업 파일로 볼 이름인지 확인한다.
 * macOS 가 외장 디스크에 남기는 '._이름.tsx' 같은 곁다리 파일을 백업으로 세지 않는다.
 * (그 파일을 되돌리면 소스가 깨진 내용으로 덮인다.)
 */
function isBackupName(name: string): boolean {
  return name.endsWith('.tsx') && !name.startsWith('._') && !name.startsWith('.')
}

/** 백업 파일 이름 — 정렬하면 시간순이 되도록 시각을 앞에 둔다. */
function backupName(): string {
  return `${new Date().toISOString().replace(/[:.]/g, '-')}.tsx`
}

async function listBackups(key: string) {
  const dir = backupDirOf(key)
  const names = (await readdir(dir)).filter(isBackupName).sort().reverse()
  return Promise.all(
    names.map(async (name) => {
      const info = await stat(path.join(dir, name))
      return { name, createdAt: info.mtime.toISOString(), size: info.size }
    }),
  )
}

/** 화면별 레이아웃 매핑 — 활성 템플릿의 값이다. 홈페이지가 처음 뜰 때 읽어 가므로 공개로 둔다. */
sitePagesRouter.get(
  '/layouts',
  asyncHandler(async (_req, res) => {
    const active = await loadActiveTemplate()
    res.json(parseLayouts(active.pageLayouts))
  }),
)

/** 레이아웃 저장 — 활성 템플릿에 담는다. basic 이면 항목을 지워 기본값으로 되돌린다. */
sitePagesRouter.put(
  '/layouts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { path: pagePath, layout } = z
      .object({
        path: z.string().trim().min(1).max(200).regex(/^\//, '경로는 / 로 시작해야 합니다.'),
        // 레이아웃 목록은 web 등록부가 가지므로 여기서는 키 형식만 본다. basic 은 기본값이라 항목을 지운다.
        layout: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/i, '레이아웃 키는 영문·숫자·하이픈만 쓸 수 있습니다.'),
      })
      .parse(req.body)

    const active = await loadActiveTemplate()
    const map = parseLayouts(active.pageLayouts)
    if (layout === 'basic') delete map[pagePath]
    else map[pagePath] = layout
    await prisma.siteTemplate.update({ where: { id: active.id }, data: { pageLayouts: JSON.stringify(map) } })
    res.json(map)
  }),
)

sitePagesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const items = await Promise.all(
      SITE_PAGES.map(async (def) => {
        const file = path.join(PAGES_DIR, def.file)
        if (!existsSync(file)) {
          return { ...def, available: false, size: 0, lines: 0, updatedAt: null, backups: 0 }
        }
        const [info, text, backups] = await Promise.all([stat(file), readFile(file, 'utf8'), listBackups(def.key)])
        return {
          ...def,
          available: true,
          size: info.size,
          lines: text.split('\n').length,
          updatedAt: info.mtime.toISOString(),
          backups: backups.length,
        }
      }),
    )
    res.json(items)
  }),
)

/** 소스 보기 */
sitePagesRouter.get(
  '/:key/source',
  requireAuth,
  asyncHandler(async (req, res) => {
    const def = findDef(req.params.key)
    const file = filePathOf(req.params.key)
    if (!def || !file) return res.status(404).json({ message: '등록되지 않은 화면입니다.' })
    if (!existsSync(file)) return res.status(404).json({ message: `소스 파일이 없습니다. (${def.file})` })

    const [text, info] = await Promise.all([readFile(file, 'utf8'), stat(file)])
    res.json({ ...def, content: text, updatedAt: info.mtime.toISOString() })
  }),
)

/** 소스 저장 — 저장 전 원본을 백업하고, 개발 서버가 바로 반영한다. */
sitePagesRouter.put(
  '/:key/source',
  requireAuth,
  asyncHandler(async (req, res) => {
    const def = findDef(req.params.key)
    const file = filePathOf(req.params.key)
    if (!def || !file) return res.status(404).json({ message: '등록되지 않은 화면입니다.' })
    if (!existsSync(file)) return res.status(404).json({ message: `소스 파일이 없습니다. (${def.file})` })

    const { content } = z
      .object({ content: z.string().min(1, '내용이 비어 있습니다. 화면 코드를 모두 지울 수는 없습니다.') })
      .parse(req.body)

    // 문법이 깨진 코드를 저장하면 그 화면이 열리지 않는다. 저장 전에 막는다.
    const check = await checkSyntax(content, def.file)
    if (!check.ok) {
      const where = check.line ? ` (${check.line}번째 줄${check.column ? `, ${check.column}번째 글자` : ''})` : ''
      const excerpt = check.excerpt ? `\n${check.excerpt}` : ''
      return res.status(400).json({ message: `문법 오류로 저장하지 않았습니다.${where} ${check.message}${excerpt}`, check })
    }

    const before = await readFile(file, 'utf8')
    if (before === content) return res.json({ saved: false, message: '바뀐 내용이 없습니다.' })

    // 백업 — 오래된 것은 지운다.
    const dir = backupDirOf(def.key)
    await copyFile(file, path.join(dir, backupName()))
    const backups = await listBackups(def.key)
    for (const b of backups.slice(MAX_BACKUPS)) {
      await import('node:fs/promises').then((fs) => fs.unlink(path.join(dir, b.name)))
    }

    await writeFile(file, content, 'utf8')
    const info = await stat(file)
    res.json({ saved: true, updatedAt: info.mtime.toISOString(), backups: Math.min(backups.length, MAX_BACKUPS) })
  }),
)

/** 문법 검사만 — 저장하지 않는다. 편집 중에 '문법 검사' 버튼으로 부른다. */
sitePagesRouter.post(
  '/:key/check',
  requireAuth,
  asyncHandler(async (req, res) => {
    const def = findDef(req.params.key)
    if (!def) return res.status(404).json({ message: '등록되지 않은 화면입니다.' })
    const { content } = z.object({ content: z.string() }).parse(req.body)
    res.json(await checkSyntax(content, def.file))
  }),
)

/** 백업 목록 */
sitePagesRouter.get(
  '/:key/backups',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!findDef(req.params.key)) return res.status(404).json({ message: '등록되지 않은 화면입니다.' })
    res.json(await listBackups(req.params.key))
  }),
)

/** 백업 내용 보기 */
sitePagesRouter.get(
  '/:key/backups/:name',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!findDef(req.params.key)) return res.status(404).json({ message: '등록되지 않은 화면입니다.' })
    const name = path.basename(req.params.name)
    const target = path.join(backupDirOf(req.params.key), name)
    if (!isBackupName(name) || !existsSync(target)) return res.status(404).json({ message: '백업을 찾을 수 없습니다.' })
    res.json({ name, content: await readFile(target, 'utf8') })
  }),
)

/** 백업으로 되돌리기 — 지금 내용도 백업으로 남겨 다시 되돌릴 수 있다. */
sitePagesRouter.post(
  '/:key/backups/:name/restore',
  requireAuth,
  asyncHandler(async (req, res) => {
    const def = findDef(req.params.key)
    const file = filePathOf(req.params.key)
    if (!def || !file) return res.status(404).json({ message: '등록되지 않은 화면입니다.' })
    const name = path.basename(req.params.name)
    const dir = backupDirOf(def.key)
    const target = path.join(dir, name)
    if (!isBackupName(name) || !existsSync(target)) return res.status(404).json({ message: '백업을 찾을 수 없습니다.' })

    await copyFile(file, path.join(dir, backupName()))
    await copyFile(target, file)
    const info = await stat(file)
    res.json({ restored: name, updatedAt: info.mtime.toISOString() })
  }),
)
