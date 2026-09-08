import {
  findTemplateLinkIssues,
  templateDataSchema,
  type TemplateData,
  type TemplateLinkIssue,
  type TemplateMenuSeed,
} from '@wnc/shared'
import { prisma } from './prisma.js'

/**
 * 템플릿 데모 데이터 — 메뉴·페이지를 DB 와 주고받는다.
 *
 * 담기(dump): 지금 메뉴 트리와 페이지를 템플릿 data.json 형태로 만든다.
 * 적용(apply): data.json 을 검증해 메뉴·페이지 표를 통째로 갈아 끼운다.
 * 대조(check): 메뉴 주소와 실제 화면이 서로 맞는지 본다.
 */

/** 지금 사이트의 메뉴·페이지를 data.json 형태로 담는다. */
export async function dumpSiteData(): Promise<TemplateData> {
  const rows = await prisma.menuItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  const toSeed = (row: (typeof rows)[number]): Omit<TemplateMenuSeed, 'children'> => ({
    label: row.label,
    url: row.url,
    newTab: row.newTab,
    autoChildren: (['none', 'categories', 'boards'] as const).includes(row.autoChildren as never)
      ? (row.autoChildren as TemplateMenuSeed['autoChildren'])
      : 'none',
    published: row.published,
    showInGnb: row.showInGnb,
    showInFooter: row.showInFooter,
    showInSitemap: row.showInSitemap,
  })
  const menus = rows
    .filter((r) => r.parentId === null)
    .map((root) => ({
      ...toSeed(root),
      children: rows.filter((c) => c.parentId === root.id).map(toSeed),
    }))

  const pages = (await prisma.page.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })).map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description ?? '',
    content: p.content,
    published: p.published,
    showInNav: p.showInNav,
    sortOrder: p.sortOrder,
    titleI18n: parseRecord(p.titleI18n),
    contentI18n: parseRecord(p.contentI18n),
    metaTitle: p.metaTitle ?? '',
    metaDescription: p.metaDescription ?? '',
    metaKeywords: p.metaKeywords ?? '',
  }))

  return { menus, pages }
}

function parseRecord(raw: string): Record<string, string> {
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

/**
 * 데모 데이터를 검증해 메뉴·페이지 표를 통째로 갈아 끼운다.
 * 부르는 쪽이 먼저 지금 데이터를 백업해 둬야 한다.
 */
export async function applySiteData(raw: unknown): Promise<{ menus: number; pages: number }> {
  const parsed = templateDataSchema.safeParse(raw)
  if (!parsed.success) {
    throw Object.assign(new Error('템플릿의 데모 데이터(data.json)가 규격에 맞지 않습니다.'), { status: 400 })
  }
  const data = parsed.data

  await prisma.$transaction(async (tx) => {
    await tx.menuItem.deleteMany({})
    for (const [i, root] of data.menus.entries()) {
      const { children, ...fields } = root
      const parent = await tx.menuItem.create({ data: { ...fields, sortOrder: i } })
      for (const [j, child] of children.entries()) {
        await tx.menuItem.create({ data: { ...child, parentId: parent.id, sortOrder: j } })
      }
    }

    // 페이지는 버전 이력까지 함께 지워지고(cascade), 새 페이지는 1버전부터 시작한다.
    await tx.page.deleteMany({})
    for (const page of data.pages) {
      const { titleI18n, contentI18n, metaTitle, metaDescription, metaKeywords, ...fields } = page
      const created = await tx.page.create({
        data: {
          ...fields,
          title: titleI18n.ko?.trim() || page.title,
          content: contentI18n.ko ?? page.content,
          titleI18n: JSON.stringify(titleI18n),
          contentI18n: JSON.stringify(contentI18n),
          publishedAt: page.published ? new Date() : null,
          version: 1,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          metaKeywords: metaKeywords || null,
        },
      })
      await tx.pageVersion.create({
        data: {
          pageId: created.id,
          version: 1,
          title: created.title,
          description: created.description,
          content: created.content,
          published: created.published,
          showInNav: created.showInNav,
          note: '템플릿 데모 데이터 적용',
          authorName: '템플릿',
        },
      })
    }
  })

  return { menus: data.menus.length, pages: data.pages.length }
}

/** 메뉴 주소와 실제 화면을 대조한다 — 적용 직후와 요청 시에 부른다. */
export async function checkSiteLinks(): Promise<TemplateLinkIssue[]> {
  const [menus, pages] = await Promise.all([
    prisma.menuItem.findMany({ select: { label: true, url: true, published: true } }),
    prisma.page.findMany({ select: { slug: true, title: true, published: true } }),
  ])
  return findTemplateLinkIssues(menus, pages)
}
