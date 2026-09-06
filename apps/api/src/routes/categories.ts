import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const categoriesRouter = Router()

const MAX_DEPTH = 3

const reorderSchema = z.object({
  parentId: z.number().int().positive().nullable(),
  ids: z.array(z.number().int().positive()).min(1),
})

const categoryInputSchema = z.object({
  name: z.string().min(1, '카테고리명을 입력하세요.').max(60),
  slug: z.string().max(80).optional(),
  parentId: z.number().int().nullable().optional(),
  sortOrder: z.number().int().optional(),
})

/** 한글 이름도 안전한 slug 로 바꾼다. 변환 결과가 비면 임의 문자열을 붙인다. */
function toSlug(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
  return base || `cat-${Date.now().toString(36)}`
}

/** 이미 쓰이는 slug 면 -2, -3 … 을 붙여 유일하게 만든다. */
async function uniqueSlug(desired: string, excludeId?: number): Promise<string> {
  let slug = desired
  for (let i = 2; ; i++) {
    const found = await prisma.category.findUnique({ where: { slug } })
    if (!found || found.id === excludeId) return slug
    slug = `${desired}-${i}`
  }
}

/** 부모로부터 depth 를 계산하고 최대 깊이를 넘지 않는지 검증한다. */
async function resolveDepth(parentId: number | null | undefined): Promise<number> {
  if (parentId === null || parentId === undefined) return 1
  const parent = await prisma.category.findUnique({ where: { id: parentId } })
  if (!parent) throw Object.assign(new Error('상위 카테고리를 찾을 수 없습니다.'), { status: 400 })
  if (parent.depth >= MAX_DEPTH) {
    throw Object.assign(new Error(`카테고리는 ${MAX_DEPTH}차까지만 만들 수 있습니다.`), { status: 400 })
  }
  return parent.depth + 1
}

/** 전체 카테고리를 트리로 반환한다. */
categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.category.findMany({
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { products: true } } },
    })

    const nodes = rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      depth: c.depth,
      sortOrder: c.sortOrder,
      parentId: c.parentId,
      productCount: c._count.products,
      children: [] as unknown[],
    }))

    const byId = new Map(nodes.map((n) => [n.id, n]))
    const roots: typeof nodes = []
    for (const node of nodes) {
      const parent = node.parentId === null ? null : byId.get(node.parentId)
      if (parent) parent.children.push(node)
      else roots.push(node)
    }

    res.json(roots)
  }),
)

categoriesRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = categoryInputSchema.parse(req.body)
    const depth = await resolveDepth(data.parentId)
    const slug = await uniqueSlug(data.slug ? toSlug(data.slug) : toSlug(data.name))

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        depth,
        parentId: data.parentId ?? null,
        // 순서를 따로 주지 않으면 같은 부모의 맨 뒤에 붙인다 — 목록의 ▲▼ 로 옮긴다.
        sortOrder:
          data.sortOrder ??
          ((await prisma.category.findFirst({ where: { parentId: data.parentId ?? null }, orderBy: { sortOrder: 'desc' } }))
            ?.sortOrder ?? -1) + 1,
      },
    })
    res.status(201).json({ ...category, productCount: 0 })
  }),
)

/** 같은 부모 아래 형제들의 순서를 통째로 다시 매긴다 — 목록의 ▲▼ 가 쓴다. */
categoriesRouter.put(
  '/reorder',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { parentId, ids } = reorderSchema.parse(req.body)
    const siblings = await prisma.category.findMany({ where: { parentId } })
    const known = new Set(siblings.map((c) => c.id))
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      return res
        .status(400)
        .json({ message: '순서 목록이 현재 카테고리와 맞지 않습니다. 화면을 새로고침한 뒤 다시 시도하세요.' })
    }
    await prisma.$transaction(ids.map((id, i) => prisma.category.update({ where: { id }, data: { sortOrder: i } })))
    res.status(204).end()
  }),
)

// ':id' 보다 위에 두어야 '/reorder' 가 id 로 잡히지 않는다.
categoriesRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = categoryInputSchema.parse(req.body)
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '카테고리를 찾을 수 없습니다.' })

    // 자기 자신이나 자손을 부모로 지정하면 트리가 끊어지므로 막는다.
    if (data.parentId) {
      if (data.parentId === id) {
        return res.status(400).json({ message: '자기 자신을 상위 카테고리로 지정할 수 없습니다.' })
      }
      let cursor = await prisma.category.findUnique({ where: { id: data.parentId } })
      while (cursor?.parentId) {
        if (cursor.parentId === id) {
          return res.status(400).json({ message: '하위 카테고리를 상위로 지정할 수 없습니다.' })
        }
        cursor = await prisma.category.findUnique({ where: { id: cursor.parentId } })
      }
    }

    const depth = await resolveDepth(data.parentId)

    // 자식이 있는 카테고리를 더 깊은 곳으로 옮기면 손자가 3차를 넘게 된다.
    const childDepth = await prisma.category.findFirst({
      where: { parentId: id },
      orderBy: { depth: 'desc' },
    })
    if (childDepth && depth + 1 > MAX_DEPTH) {
      return res
        .status(400)
        .json({ message: `하위 카테고리가 있어 ${MAX_DEPTH}차를 넘게 되므로 이동할 수 없습니다.` })
    }

    const slug = await uniqueSlug(data.slug ? toSlug(data.slug) : toSlug(data.name), id)

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        depth,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder ?? existing.sortOrder,
      },
    })

    // 하위 트리의 depth 도 함께 갱신한다.
    await reindexDepth(category.id, category.depth)

    res.json(category)
  }),
)

/** 부모 depth 를 기준으로 자손들의 depth 를 재계산한다. */
async function reindexDepth(parentId: number, parentDepth: number) {
  const children = await prisma.category.findMany({ where: { parentId } })
  for (const child of children) {
    await prisma.category.update({ where: { id: child.id }, data: { depth: parentDepth + 1 } })
    await reindexDepth(child.id, parentDepth + 1)
  }
}

categoriesRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const [childCount, productCount] = await Promise.all([
      prisma.category.count({ where: { parentId: id } }),
      prisma.product.count({ where: { categoryId: id } }),
    ])

    // 하위 항목을 말없이 지우면 데이터가 유실되므로 거부하고 이유를 알린다.
    if (childCount > 0) {
      return res.status(400).json({ message: '하위 카테고리가 있어 삭제할 수 없습니다. 먼저 하위를 삭제하세요.' })
    }
    if (productCount > 0) {
      return res
        .status(400)
        .json({ message: `이 카테고리에 제품 ${productCount}개가 있어 삭제할 수 없습니다.` })
    }

    await prisma.category.delete({ where: { id } })
    res.status(204).end()
  }),
)
