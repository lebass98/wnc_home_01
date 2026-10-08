/**
 * DB 를 SQL 로 바로 조회한다 — 예전 `sqlite3 dev.db "..."` 대신 쓴다.
 *
 *   npm run db:query -- "select name, active from \"SiteTemplate\""
 *
 * Postgres 는 대소문자가 섞인 표·열 이름을 큰따옴표로 감싸야 한다 ("SiteTemplate", "createdAt").
 */
import { PrismaClient } from '@prisma/client'

const sql = process.argv.slice(2).join(' ').trim()
if (!sql) {
  console.error('조회할 SQL 을 넣어 주세요. 예) npm run db:query -- "select count(*) from \\"Post\\""')
  process.exit(1)
}
const prisma = new PrismaClient()
try {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql)
  console.table(rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v]))))
} finally {
  await prisma.$disconnect()
}
