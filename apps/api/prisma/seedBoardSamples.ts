import type { PrismaClient } from '@prisma/client'
import samples from '../../../packages/shared/src/boardSamples.json'

/** 기존 게시글을 보존하면서 게시판별 샘플 10건을 추가한다. 재실행해도 중복하지 않는다. */
export async function seedBoardSamples(prisma: PrismaClient, authorId: number) {
  return prisma.$transaction(async (tx) => {
    let created = 0
    for (const [index, sample] of samples.entries()) {
      if (!await tx.board.findUnique({ where: { slug: sample.category } })) continue
      if (await tx.post.findFirst({ where: { category: sample.category, title: sample.title } })) continue
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - index % 10 * 2)
      await tx.post.create({ data: {
        category: sample.category,
        title: sample.title,
        content: sample.content,
        thumbnail: sample.thumbnail,
        published: true,
        views: 20 + index * 13,
        authorId,
        createdAt,
      } })
      created++
    }
    return created
  })
}
