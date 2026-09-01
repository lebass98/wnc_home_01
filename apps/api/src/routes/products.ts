import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const productsRouter = Router()

const specSchema = z.object({
  label: z.string().max(60),
  value: z.string().max(300),
})

const productInputSchema = z.object({
  name: z.string().min(1, '제품명을 입력하세요.').max(150),
  model: z.string().max(100).nullable().optional(),
  summary: z.string().max(300).nullable().optional(),
  price: z.number().int().min(0).nullable().optional(),
  thumbnail: z.string().max(2_000_000).nullable().optional(),
  content: z.string().max(500_000).default(''),
  specs: z.array(specSchema).max(50).default([]),
  categoryId: z.number().int('카테고리를 선택하세요.'),
  published: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int().optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  category: z.coerce.number().int().optional(),
  q: z.string().trim().min(1).optional(),
  sort: z.enum(['latest', 'name', 'views']).default('latest'),
})

function parseSpecs(raw: string): { label: string; value: string }[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

type Row = Record<string, any> & { category: { name: string } }

function toListItem(p: Row) {
  return {
    id: p.id,
    name: p.name,
    model: p.model,
    summary: p.summary,
    price: p.price,
    thumbnail: p.thumbnail,
    published: p.published,
    featured: p.featured,
    views: p.views,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    createdAt: p.createdAt.toISOString(),
  }
}

/** 선택한 카테고리와 그 하위 전부의 id 를 모은다 (대분류를 고르면 하위 제품까지 보이도록). */
async function categoryWithDescendants(rootId: number): Promise<number[]> {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } })
  const childrenOf = new Map<number, number[]>()
  for (const c of all) {
    if (c.parentId === null) continue
    const list = childrenOf.get(c.parentId) ?? []
    list.push(c.id)
    childrenOf.set(c.parentId, list)
  }

  const ids: number[] = []
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    ids.push(id)
    stack.push(...(childrenOf.get(id) ?? []))
  }
  return ids
}

productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize, category, q, sort } = listQuerySchema.parse(req.query)
    const includeDrafts = req.query.includeDrafts === '1' && Boolean(req.headers.authorization)

    const categoryIds = category ? await categoryWithDescendants(category) : null

    const where = {
      ...(includeDrafts ? {} : { published: true }),
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { model: { contains: q } },
              { summary: { contains: q } },
            ],
          }
        : {}),
    }

    const orderBy =
      sort === 'name'
        ? [{ name: 'asc' as const }]
        : sort === 'views'
          ? [{ views: 'desc' as const }]
          : [{ sortOrder: 'asc' as const }, { createdAt: 'desc' as const }]

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ])

    res.json({
      items: items.map(toListItem),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  }),
)

productsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: { select: { name: true } } },
    })
    if (!product) return res.status(404).json({ message: '제품을 찾을 수 없습니다.' })
    if (!product.published && !req.headers.authorization) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다.' })
    }

    if (product.published) {
      await prisma.product.update({ where: { id }, data: { views: { increment: 1 } } })
      product.views += 1
    }

    // 대분류 → 소분류 순의 경로를 만든다.
    const path: { id: number; name: string; slug: string }[] = []
    let cursor = await prisma.category.findUnique({ where: { id: product.categoryId } })
    while (cursor) {
      path.unshift({ id: cursor.id, name: cursor.name, slug: cursor.slug })
      cursor = cursor.parentId ? await prisma.category.findUnique({ where: { id: cursor.parentId } }) : null
    }

    res.json({
      ...toListItem(product),
      content: product.content,
      specs: parseSpecs(product.specs),
      sortOrder: product.sortOrder,
      categoryPath: path,
      updatedAt: product.updatedAt.toISOString(),
    })
  }),
)

productsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = productInputSchema.parse(req.body)

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
    if (!category) return res.status(400).json({ message: '카테고리를 찾을 수 없습니다.' })

    const product = await prisma.product.create({
      data: {
        name: data.name,
        model: data.model ?? null,
        summary: data.summary ?? null,
        price: data.price ?? null,
        thumbnail: data.thumbnail ?? null,
        content: data.content,
        specs: JSON.stringify(data.specs),
        categoryId: data.categoryId,
        published: data.published,
        featured: data.featured,
        sortOrder: data.sortOrder ?? 0,
      },
      include: { category: { select: { name: true } } },
    })
    res.status(201).json(toListItem(product))
  }),
)

productsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = productInputSchema.parse(req.body)
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '제품을 찾을 수 없습니다.' })

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
    if (!category) return res.status(400).json({ message: '카테고리를 찾을 수 없습니다.' })

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        model: data.model ?? null,
        summary: data.summary ?? null,
        price: data.price ?? null,
        thumbnail: data.thumbnail ?? null,
        content: data.content,
        specs: JSON.stringify(data.specs),
        categoryId: data.categoryId,
        published: data.published,
        featured: data.featured,
        sortOrder: data.sortOrder ?? existing.sortOrder,
      },
      include: { category: { select: { name: true } } },
    })
    res.json(toListItem(product))
  }),
)

productsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '제품을 찾을 수 없습니다.' })

    await prisma.product.delete({ where: { id } })
    res.status(204).end()
  }),
)
