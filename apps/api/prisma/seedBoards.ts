import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { seedBoardSamples } from './seedBoardSamples'

const prisma = new PrismaClient()
try {
  const author = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { id: 'asc' } })
  if (!author) throw new Error('관리자 계정이 없습니다. 기본 시드를 먼저 실행해 주세요.')
  console.log(`게시판 목데이터 ${await seedBoardSamples(prisma, author.id)}건 추가`)
} finally {
  await prisma.$disconnect()
}
