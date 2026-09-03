import { prisma } from './prisma.js'

/**
 * 디자인 템플릿 공용 도우미.
 * 사이트에 적용되는 헤더·푸터·화면별 레이아웃은 전부 '활성 템플릿' 한 벌에서 나온다.
 * (/api/design 과 /api/site-pages/layouts 도 활성 템플릿을 읽고 쓴다)
 */

type TemplateRow = {
  id: number
  name: string
  description: string
  author: string
  version: string
  builtin: boolean
  active: boolean
  header: string
  footer: string
  pageLayouts: string
  createdAt: Date
  updatedAt: Date
}

export function parseLayouts(raw: string): Record<string, string> {
  try {
    const map = JSON.parse(raw)
    return map && typeof map === 'object' && !Array.isArray(map) ? (map as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function toTemplateResponse(row: TemplateRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    author: row.author,
    version: row.version,
    builtin: row.builtin,
    active: row.active,
    header: row.header,
    footer: row.footer,
    pageLayouts: parseLayouts(row.pageLayouts),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * 기본 제공 'Basic' 템플릿이 없으면 만든다.
 * 처음 상태는 이 프로젝트가 배포될 때의 모습 그대로 —
 * 기본 헤더·푸터에, 약관·개인정보 화면만 좌측 메뉴 서브를 쓴다.
 */
export async function ensureBuiltin(): Promise<TemplateRow> {
  const found = await prisma.siteTemplate.findFirst({ where: { builtin: true }, orderBy: { id: 'asc' } })
  if (found) return found
  return prisma.siteTemplate.create({
    data: {
      name: 'Basic',
      description: '워드앤코드 기본 템플릿',
      author: 'wordncode',
      builtin: true,
      active: true,
      pageLayouts: JSON.stringify({ '/terms': 'left', '/privacy': 'left' }),
    },
  })
}

/** 활성 템플릿을 돌려준다. 없으면 기본 템플릿을 만들어 켠다. */
export async function loadActiveTemplate(): Promise<TemplateRow> {
  const active = await prisma.siteTemplate.findFirst({ where: { active: true }, orderBy: { id: 'asc' } })
  if (active) return active
  const builtin = await ensureBuiltin()
  if (builtin.active) return builtin
  return prisma.siteTemplate.update({ where: { id: builtin.id }, data: { active: true } })
}
