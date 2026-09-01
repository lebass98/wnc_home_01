import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/handler.js'
import { requireAuth } from '../lib/auth.js'

export const boardsRouter = Router()

const boardInputSchema = z.object({
  name: z.string().trim().min(1, '게시판 이름을 입력하세요.').max(60),
  slug: z.string().trim().max(40).optional(),
  description: z.string().max(300).nullable().optional(),
  published: z.boolean(),
  sortOrder: z.number().int().optional(),
})

/** 페이지 slug 와 같은 규칙 — 한글·영문·숫자만 남기고 공백은 하이픈으로 바꾼다. */
function toSlug(source: string): string {
  const base = source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `board-${Date.now().toString(36)}`
}

async function uniqueSlug(desired: string, excludeId?: number): Promise<string> {
  let slug = desired
  for (let i = 2; ; i++) {
    const found = await prisma.board.findUnique({ where: { slug } })
    if (!found || found.id === excludeId) return slug
    slug = `${desired}-${i}`
  }
}

async function toItem(board: Record<string, any>) {
  return {
    id: board.id,
    name: board.name,
    slug: board.slug,
    description: board.description,
    published: board.published,
    sortOrder: board.sortOrder,
    postCount: await prisma.post.count({ where: { category: board.slug } }),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  }
}

/** 목록. 공개 사이트는 노출 중인 게시판만 받고, 관리자는 includeHidden=1 로 전부 본다. */
boardsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeHidden = req.query.includeHidden === '1' && Boolean(req.headers.authorization)
    const boards = await prisma.board.findMany({
      where: includeHidden ? {} : { published: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    res.json(await Promise.all(boards.map(toItem)))
  }),
)

boardsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = boardInputSchema.parse(req.body)
    const slug = await uniqueSlug(toSlug(data.slug?.trim() ? data.slug : data.name))

    const board = await prisma.board.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? null,
        published: data.published,
        sortOrder: data.sortOrder ?? 0,
      },
    })
    res.status(201).json(await toItem(board))
  }),
)

boardsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const data = boardInputSchema.parse(req.body)
    const existing = await prisma.board.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '게시판을 찾을 수 없습니다.' })

    const slug = await uniqueSlug(toSlug(data.slug?.trim() ? data.slug : data.name), id)

    // slug 가 바뀌면 이 게시판에 속한 글의 category 도 함께 옮긴다.
    const board = await prisma.$transaction(async (tx) => {
      if (slug !== existing.slug) {
        await tx.post.updateMany({ where: { category: existing.slug }, data: { category: slug } })
      }
      return tx.board.update({
        where: { id },
        data: {
          name: data.name,
          slug,
          description: data.description ?? null,
          published: data.published,
          sortOrder: data.sortOrder ?? existing.sortOrder,
        },
      })
    })
    res.json(await toItem(board))
  }),
)

boardsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ message: '잘못된 요청입니다.' })

    const existing = await prisma.board.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: '게시판을 찾을 수 없습니다.' })

    const count = await prisma.post.count({ where: { category: existing.slug } })
    if (count > 0) {
      return res
        .status(400)
        .json({ message: `이 게시판에 글이 ${count}개 있어 삭제할 수 없습니다. 글을 먼저 옮기거나 지우세요.` })
    }

    await prisma.board.delete({ where: { id } })
    res.status(204).end()
  }),
)
