import { prisma } from './prisma.js'

/**
 * 휴지통 — 글·페이지를 지우면 바로 없애지 않고, 원래 행과 딸린 행(페이지 버전 이력·글 신고)을
 * 통째로 TrashItem 에 담아 둔다. 원래 표에서는 빠지므로 공개 화면·목록 조회는 손대지 않아도 된다.
 * 복원하면 같은 번호로 되살리고, 30일이 지난 것은 자동으로 비운다.
 */

export const TRASH_KEEP_DAYS = 30
export type TrashType = 'post' | 'page'

/** JSON 으로 담았던 날짜를 Date 로 되돌린다. */
const DATE_KEYS = ['createdAt', 'updatedAt', 'publishedAt', 'publishAt']
function reviveDates<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row }
  for (const key of DATE_KEYS) {
    if (typeof out[key] === 'string') out[key] = new Date(out[key] as string)
  }
  return out as T
}

/** 글을 휴지통으로 — 신고 내역도 함께 담는다. */
export async function trashPost(id: number, by: string): Promise<boolean> {
  const post = await prisma.post.findUnique({ where: { id }, include: { reports: true } })
  if (!post) return false
  const { reports, ...row } = post
  const board = await prisma.board.findUnique({ where: { slug: post.category } })
  await prisma.$transaction([
    prisma.trashItem.create({
      data: {
        type: 'post',
        originalId: id,
        title: post.title,
        summary: board?.name ?? post.category,
        payload: JSON.stringify({ row, reports }),
        deletedBy: by,
      },
    }),
    prisma.post.delete({ where: { id } }),
  ])
  return true
}

/** 페이지를 휴지통으로 — 버전 이력도 함께 담는다. */
export async function trashPage(id: number, by: string): Promise<boolean> {
  const page = await prisma.page.findUnique({ where: { id }, include: { versions: true } })
  if (!page) return false
  const { versions, ...row } = page
  await prisma.$transaction([
    prisma.trashItem.create({
      data: {
        type: 'page',
        originalId: id,
        title: page.title,
        summary: `/page/${page.slug}`,
        payload: JSON.stringify({ row, versions }),
        deletedBy: by,
      },
    }),
    prisma.page.delete({ where: { id } }),
  ])
  return true
}

class TrashError extends Error {
  status = 409
}

/**
 * 되살린다. 원래 번호가 비어 있으면 그 번호로, 이미 쓰이면 새 번호로 만든다.
 * 글쓴이 계정이 지워졌으면 되살리는 사람을 글쓴이로 둔다. 같은 주소의 페이지가 이미 있으면 알린다.
 */
export async function restoreTrash(itemId: number, restorerId: number): Promise<{ type: TrashType; id: number }> {
  const item = await prisma.trashItem.findUnique({ where: { id: itemId } })
  if (!item) throw Object.assign(new Error('휴지통에서 항목을 찾을 수 없습니다.'), { status: 404 })
  const payload = JSON.parse(item.payload) as { row: Record<string, unknown>; versions?: Record<string, unknown>[]; reports?: Record<string, unknown>[] }

  if (item.type === 'post') {
    const { id: _id, ...row } = reviveDates(payload.row) as Record<string, unknown> & { id: number; authorId: number; category: string }
    const idFree = !(await prisma.post.findUnique({ where: { id: item.originalId } }))
    const authorOk = await prisma.user.findUnique({ where: { id: row.authorId } })
    const created = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: { ...row, ...(idFree ? { id: item.originalId } : {}), authorId: authorOk ? row.authorId : restorerId } as never,
      })
      for (const report of payload.reports ?? []) {
        const { id: _rid, postId: _pid, ...r } = reviveDates(report)
        await tx.postReport.create({ data: { ...r, postId: post.id } as never })
      }
      await tx.trashItem.delete({ where: { id: itemId } })
      return post
    })
    return { type: 'post', id: created.id }
  }

  const { id: _id, ...row } = reviveDates(payload.row) as Record<string, unknown> & { id: number; slug: string }
  if (await prisma.page.findUnique({ where: { slug: row.slug } })) {
    throw new TrashError(`같은 주소(/page/${row.slug})의 페이지가 이미 있어 되살릴 수 없습니다. 그 페이지의 주소를 바꾼 뒤 다시 시도하세요.`)
  }
  const idFree = !(await prisma.page.findUnique({ where: { id: item.originalId } }))
  const created = await prisma.$transaction(async (tx) => {
    const page = await tx.page.create({ data: { ...row, ...(idFree ? { id: item.originalId } : {}) } as never })
    for (const version of payload.versions ?? []) {
      const { id: _vid, pageId: _pid, ...v } = reviveDates(version)
      await tx.pageVersion.create({ data: { ...v, pageId: page.id } as never })
    }
    await tx.trashItem.delete({ where: { id: itemId } })
    return page
  })
  return { type: 'page', id: created.id }
}

/** 보관 기간이 지난 항목을 비운다. 목록을 읽을 때와 서버가 뜰 때 부른다. */
export async function purgeExpiredTrash(): Promise<number> {
  const before = new Date(Date.now() - TRASH_KEEP_DAYS * 24 * 60 * 60 * 1000)
  const { count } = await prisma.trashItem.deleteMany({ where: { deletedAt: { lt: before } } })
  return count
}
