import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const menusRouter = Router()

/**
 * 홈페이지 메뉴 — GNB·푸터·사이트맵이 모두 같은 표를 읽는다.
 * 1차/2차 두 단계까지만 쓰고, 어디에 보일지는 항목마다 스위치로 정한다.
 */

const AUTO_CHILDREN = ['none', 'categories', 'boards'] as const

/** 사이트 안 경로(/…) 나 외부 주소(http…) 만 받는다. 비워 둘 수도 있다. */
const urlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//.test(v), {
    message: '주소는 / 로 시작하는 사이트 안 경로이거나 http:// 또는 https:// 로 시작하는 외부 주소여야 합니다.',
  })

const inputSchema = z.object({
  parentId: z.number().int().positive().nullable().optional(),
  label: z.string().trim().min(1, '메뉴 이름을 입력하세요.').max(50, '메뉴 이름은 50자까지 쓸 수 있습니다.'),
  url: urlSchema,
  newTab: z.boolean().default(false),
  autoChildren: z.enum(AUTO_CHILDREN).default('none'),
  published: z.boolean().default(true),
  showInGnb: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
  showInSitemap: z.boolean().default(true),
})

const flagsSchema = z
  .object({
    published: z.boolean().optional(),
    showInGnb: z.boolean().optional(),
    showInFooter: z.boolean().optional(),
    showInSitemap: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '바꿀 항목이 없습니다.' })

const reorderSchema = z.object({
  parentId: z.number().int().positive().nullable(),
  ids: z.array(z.number().int().positive()).min(1),
})

type Row = {
  id: number
  parentId: number | null
  label: string
  url: string
  newTab: boolean
  autoChildren: string
  published: boolean
  showInGnb: boolean
  showInFooter: boolean
  showInSitemap: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

type Item = Omit<Row, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string; children: Item[] }

function toItem(row: Row, children: Row[]): Item {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    children: children.map((c) => toItem(c, [])),
  }
}

/** 전체를 한 번에 읽어 1차 아래 2차를 붙인 트리로 만든다. */
async function loadTree(onlyPublished: boolean) {
  const rows = await prisma.menuItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  const visible = onlyPublished ? rows.filter((r) => r.published) : rows
  const roots = visible.filter((r) => r.parentId === null)
  return roots.map((r) =>
    toItem(
      r,
      visible.filter((c) => c.parentId === r.id),
    ),
  )
}

/** 부모는 1차 메뉴여야 한다 — 3차 이상은 만들지 않는다. */
async function assertParent(parentId: number | null | undefined, selfId?: number) {
  if (!parentId) return null
  if (parentId === selfId) throw Object.assign(new Error('자기 자신을 상위 메뉴로 둘 수 없습니다.'), { status: 400 })
  const parent = await prisma.menuItem.findUnique({ where: { id: parentId } })
  if (!parent) throw Object.assign(new Error('상위 메뉴를 찾을 수 없습니다.'), { status: 404 })
  if (parent.parentId !== null) {
    throw Object.assign(new Error('2차 메뉴 아래에는 메뉴를 더 만들 수 없습니다. 1차 메뉴를 상위로 고르세요.'), {
      status: 400,
    })
  }
  return parent.id
}

/** 홈페이지용 — 켜 둔 항목만 */
menusRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await loadTree(true))
  }),
)

/** 관리자용 — 꺼 둔 항목까지 */
menusRouter.get(
  '/admin',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await loadTree(false))
  }),
)

menusRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = inputSchema.parse(req.body)
    const parentId = await assertParent(data.parentId)
    // 2차 메뉴는 자동 채우기를 쓰지 않는다.
    if (parentId) data.autoChildren = 'none'

    const last = await prisma.menuItem.findFirst({ where: { parentId }, orderBy: { sortOrder: 'desc' } })
    await prisma.menuItem.create({
      data: { ...data, parentId, sortOrder: (last?.sortOrder ?? -1) + 1 },
    })
    res.status(201).json(await loadTree(false))
  }),
)

/** 같은 부모 아래의 순서를 통째로 다시 매긴다. */
menusRouter.put(
  '/reorder',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { parentId, ids } = reorderSchema.parse(req.body)
    const siblings = await prisma.menuItem.findMany({ where: { parentId } })
    const known = new Set(siblings.map((s) => s.id))
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      return res.status(400).json({ message: '순서 목록이 현재 메뉴와 맞지 않습니다. 화면을 새로고침한 뒤 다시 시도하세요.' })
    }
    await prisma.$transaction(ids.map((id, i) => prisma.menuItem.update({ where: { id }, data: { sortOrder: i } })))
    res.json(await loadTree(false))
  }),
)

// ':id' 보다 위에 두어야 '/reorder' 가 id 로 잡히지 않는다.
menusRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const found = await prisma.menuItem.findUnique({ where: { id }, include: { children: true } })
    if (!found) return res.status(404).json({ message: '메뉴를 찾을 수 없습니다.' })

    const data = inputSchema.parse(req.body)
    const parentId = await assertParent(data.parentId, id)
    if (parentId && found.children.length > 0) {
      return res.status(400).json({
        message: '2차 메뉴가 달린 1차 메뉴는 다른 메뉴 아래로 옮길 수 없습니다. 먼저 2차 메뉴를 옮기거나 지우세요.',
      })
    }
    if (parentId) data.autoChildren = 'none'

    // 부모가 바뀌면 새 부모의 맨 뒤로 보낸다.
    let sortOrder = found.sortOrder
    if (parentId !== found.parentId) {
      const last = await prisma.menuItem.findFirst({ where: { parentId }, orderBy: { sortOrder: 'desc' } })
      sortOrder = (last?.sortOrder ?? -1) + 1
    }

    await prisma.menuItem.update({ where: { id }, data: { ...data, parentId, sortOrder } })
    res.json(await loadTree(false))
  }),
)

/** 노출 스위치만 바꾼다. */
menusRouter.patch(
  '/:id/flags',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const data = flagsSchema.parse(req.body)
    const found = await prisma.menuItem.findUnique({ where: { id } })
    if (!found) return res.status(404).json({ message: '메뉴를 찾을 수 없습니다.' })
    await prisma.menuItem.update({ where: { id }, data })
    res.json(await loadTree(false))
  }),
)

menusRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const found = await prisma.menuItem.findUnique({ where: { id } })
    if (!found) return res.status(404).json({ message: '메뉴를 찾을 수 없습니다.' })
    // 2차 메뉴는 스키마의 onDelete: Cascade 로 같이 지워진다.
    await prisma.menuItem.delete({ where: { id } })
    res.json(await loadTree(false))
  }),
)
