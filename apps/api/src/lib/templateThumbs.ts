import path from 'node:path'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { prisma } from './prisma.js'
import { UPLOAD_DIR } from '../routes/uploads.js'

/**
 * 템플릿 미리보기(썸네일) — 템플릿을 실제로 적용한 사이트의 메인과 서브페이지 한 장씩.
 *
 * 그림을 흉내 내지 않고, 헤드리스 브라우저로 지금 떠 있는 홈페이지를 그대로 찍는다.
 * 그래서 사이트에 적용된 템플릿(= 켜진 템플릿)만 찍을 수 있다 — 켤 때, 끌 때(그때까지의 모습),
 * [현재 사이트 담기]·[미리보기 새로 찍기] 때 찍어 둔다. 한 번도 켜 본 적 없는 템플릿은 미리보기가 없다.
 *
 * 찍은 그림은 공개 경로(/uploads/template-thumbs)에 둔다 — 홈페이지 화면이라 감출 내용이 없다.
 */

const THUMB_DIR = path.join(UPLOAD_DIR, 'template-thumbs')
/** 찍을 홈페이지 주소 — 개발 서버(Vite) */
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173'
/** 넓은 화면(데스크톱) 기준으로 찍는다. */
const VIEWPORT = { width: 1440, height: 900 }

export interface TemplateThumbs {
  main: string
  sub: string
  /** 서브로 찍은 화면 이름 (예: 회사소개) */
  subLabel: string
  takenAt: string
}

interface ThumbMeta {
  subLabel: string
  subPath: string
  takenAt: string
}

const fileOf = (id: number, which: 'main' | 'sub') => path.join(THUMB_DIR, `${id}-${which}.jpg`)
const metaOf = (id: number) => path.join(THUMB_DIR, `${id}.json`)

/** 이 템플릿의 미리보기 — 없으면 null. 주소에는 찍은 시각을 붙여 옛 그림이 캐시에 남지 않게 한다. */
export async function readThumbs(id: number): Promise<TemplateThumbs | null> {
  if (!existsSync(metaOf(id)) || !existsSync(fileOf(id, 'main')) || !existsSync(fileOf(id, 'sub'))) return null
  try {
    const meta = JSON.parse(await readFile(metaOf(id), 'utf8')) as ThumbMeta
    const v = Math.round((await stat(fileOf(id, 'main'))).mtimeMs)
    return {
      main: `/uploads/template-thumbs/${id}-main.jpg?v=${v}`,
      sub: `/uploads/template-thumbs/${id}-sub.jpg?v=${v}`,
      subLabel: meta.subLabel,
      takenAt: meta.takenAt,
    }
  } catch {
    return null
  }
}

/** 서브페이지로 찍을 화면 — 상단 메뉴(GNB)의 첫 사이트 안 주소. 없으면 회사소개. */
async function pickSubPage(): Promise<{ path: string; label: string }> {
  const first = await prisma.menuItem.findFirst({
    where: { parentId: null, published: true, showInGnb: true, url: { startsWith: '/' }, NOT: { url: '/' } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  return first ? { path: first.url, label: first.label } : { path: '/about', label: '회사소개' }
}

/**
 * 지금 홈페이지(= 켜진 템플릿의 모습)를 찍어 이 템플릿의 미리보기로 남긴다.
 * 찍지 못해도(브라우저 미설치·개발 서버 꺼짐) 템플릿 작업은 계속되도록 예외를 던지지 않고 이유를 돌려준다.
 */
export async function captureThumbs(id: number): Promise<{ ok: true } | { ok: false; reason: string }> {
  let browser: { close: () => Promise<void> } | null = null
  try {
    // 무거운 모듈이라 찍을 때만 불러온다 — 설치돼 있지 않아도 서버는 뜬다.
    const { chromium } = await import('playwright')
    const launched = await chromium.launch()
    browser = launched
    const context = await launched.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, locale: 'ko-KR' })
    // 팝업은 화면을 가리므로 띄우지 않는다 (SitePopups 가 이 표시를 본다).
    await context.addInitScript(() => {
      ;(window as { __WNC_CAPTURE__?: boolean }).__WNC_CAPTURE__ = true
    })
    const page = await context.newPage()
    const sub = await pickSubPage()
    await mkdir(THUMB_DIR, { recursive: true })

    for (const [which, target] of [
      ['main', '/'],
      ['sub', sub.path],
    ] as const) {
      await page.goto(`${WEB_ORIGIN}${target}`, { waitUntil: 'networkidle', timeout: 30_000 })
      // 글꼴·첫 화면 이미지와 등장 효과가 자리 잡을 때까지 잠시 기다린다.
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(1200)
      // 임시 파일에 찍고 옮긴다 — 찍는 도중 목록이 반쯤 그려진 그림을 읽지 않게.
      const tmp = `${fileOf(id, which)}.tmp`
      await page.screenshot({ path: tmp, type: 'jpeg', quality: 72 })
      await copyFile(tmp, fileOf(id, which))
      await rm(tmp, { force: true })
    }

    const meta: ThumbMeta = { subLabel: sub.label, subPath: sub.path, takenAt: new Date().toISOString() }
    await writeFile(metaOf(id), JSON.stringify(meta, null, 2), 'utf8')
    return { ok: true }
  } catch (e) {
    const message = (e as Error).message ?? ''
    const reason = /Executable doesn't exist|browserType\.launch/i.test(message)
      ? '미리보기를 찍을 브라우저가 없습니다. apps/api 에서 `npx playwright install chromium` 을 실행해 주세요.'
      : /ERR_CONNECTION_REFUSED|net::/i.test(message)
        ? `홈페이지(${WEB_ORIGIN})에 접속하지 못해 미리보기를 찍지 못했습니다. 개발 서버가 떠 있는지 확인해 주세요.`
        : /Cannot find (package|module) 'playwright'/i.test(message)
          ? '미리보기를 찍는 도구(playwright)가 설치되지 않았습니다. npm install 을 다시 실행해 주세요.'
          : `미리보기를 찍지 못했습니다: ${message.split('\n')[0]}`
    console.warn(`[template-thumbs] ${id}번 템플릿 촬영 실패 —`, message.split('\n')[0])
    return { ok: false, reason }
  } finally {
    await browser?.close().catch(() => {})
  }
}

/** 복제·새 템플릿 — 원본의 미리보기를 그대로 물려준다(같은 화면에서 출발하므로). */
export async function copyThumbs(fromId: number, toId: number): Promise<void> {
  if (!existsSync(metaOf(fromId))) return
  await mkdir(THUMB_DIR, { recursive: true })
  for (const which of ['main', 'sub'] as const) {
    if (existsSync(fileOf(fromId, which))) await copyFile(fileOf(fromId, which), fileOf(toId, which))
  }
  await copyFile(metaOf(fromId), metaOf(toId))
}

export async function removeThumbs(id: number): Promise<void> {
  for (const file of [fileOf(id, 'main'), fileOf(id, 'sub'), metaOf(id)]) await rm(file, { force: true })
}
