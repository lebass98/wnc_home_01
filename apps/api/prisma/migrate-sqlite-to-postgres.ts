/**
 * 로컬 SQLite(dev.db) 데이터를 Postgres(Neon)로 한 번 옮긴다.
 *
 *   cd apps/api && npx tsx prisma/migrate-sqlite-to-postgres.ts [SQLite 파일 경로]
 *
 * - 대상 DB 는 .env 의 DATABASE_URL(Postgres). 표는 먼저 `npx prisma db push` 로 만들어 둔다.
 * - 원본은 sqlite3 명령으로 표마다 JSON 으로 읽는다(원본 DB 는 바꾸지 않는다).
 * - SQLite 에 숫자(밀리초)로 저장된 날짜와 0/1 로 저장된 참·거짓을 Prisma 형식으로 바꾼다.
 * - 다른 표를 가리키는 표는 가리키는 쪽보다 나중에 넣고, 자기 자신을 가리키는 표(메뉴 트리 등)는
 *   부모 칸을 비워 넣었다가 다시 채운다. 끝나면 번호(id) 카운터를 가장 큰 id 뒤로 맞춘다.
 * - 대상 표에 이미 데이터가 있으면 멈춘다 — 두 번 돌려 데이터가 겹치지 않게.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { Prisma, PrismaClient } from '@prisma/client'

const sqlitePath = path.resolve(process.argv[2] ?? 'prisma/dev.db')
const prisma = new PrismaClient()
const models = Prisma.dmmf.datamodel.models

/** sqlite3 로 표 하나를 읽는다 */
function readTable(table: string): Record<string, unknown>[] {
  const out = execFileSync('sqlite3', ['-json', sqlitePath, `SELECT * FROM "${table}"`], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 })
  return out.trim() ? (JSON.parse(out) as Record<string, unknown>[]) : []
}

/** 표 이름(모델) → Prisma 클라이언트의 대리자 */
const delegate = (model: string) => (prisma as unknown as Record<string, { createMany: Function; count: Function; update: Function }>)[model[0].toLowerCase() + model.slice(1)]

/** 다른 모델을 가리키는 순서대로 정렬한다 (자기 자신 참조는 제외) */
function insertOrder() {
  const deps = new Map(models.map((m) => [m.name, new Set(m.fields.filter((f) => f.relationFromFields?.length && f.type !== m.name).map((f) => f.type))]))
  const done: string[] = []
  while (done.length < models.length) {
    const ready = models.filter((m) => !done.includes(m.name) && [...deps.get(m.name)!].every((d) => done.includes(d)))
    if (!ready.length) throw new Error('모델 사이의 참조가 돌고 있어 넣을 순서를 정하지 못했습니다.')
    done.push(...ready.map((m) => m.name))
  }
  return done.map((name) => models.find((m) => m.name === name)!)
}

async function main() {
  console.log(`원본: ${sqlitePath}`)
  for (const m of models) {
    if ((await delegate(m.name).count()) > 0) throw new Error(`대상 DB 의 ${m.name} 표에 이미 데이터가 있습니다. 비어 있는 DB 에만 옮깁니다.`)
  }

  for (const model of insertOrder()) {
    const scalar = model.fields.filter((f) => f.kind === 'scalar')
    const selfFks = model.fields.filter((f) => f.type === model.name && f.relationFromFields?.length).flatMap((f) => f.relationFromFields!)
    const rows = readTable(model.dbName ?? model.name).map((row) => {
      const data: Record<string, unknown> = {}
      for (const f of scalar) {
        let v = row[f.dbName ?? f.name]
        if (v === undefined) continue
        if (v !== null && f.type === 'DateTime') v = new Date(typeof v === 'number' ? v : /^\d+$/.test(String(v)) ? Number(v) : String(v))
        if (v !== null && f.type === 'Boolean') v = v === 1 || v === true || v === '1' || v === 'true'
        if (v !== null && f.type === 'BigInt') v = BigInt(v as number)
        data[f.name] = v
      }
      return data
    })
    if (!rows.length) {
      console.log(`  ${model.name}: 0`)
      continue
    }
    // 자기 자신을 가리키는 칸은 비워 넣고 나중에 채운다
    const later = selfFks.length ? rows.map((r) => ({ id: r.id, fks: Object.fromEntries(selfFks.map((k) => [k, r[k]])) })) : []
    const firstPass = selfFks.length ? rows.map((r) => ({ ...r, ...Object.fromEntries(selfFks.map((k) => [k, null])) })) : rows
    for (let i = 0; i < firstPass.length; i += 500) await delegate(model.name).createMany({ data: firstPass.slice(i, i + 500) })
    for (const { id, fks } of later) {
      if (Object.values(fks).some((v) => v !== null)) await delegate(model.name).update({ where: { id }, data: fks })
    }

    // 번호 카운터 — 자동 증가 id 표만
    const idField = model.fields.find((f) => f.isId)
    if (idField?.type === 'Int' && idField.hasDefaultValue) {
      const table = model.dbName ?? model.name
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', '${idField.dbName ?? idField.name}'), (SELECT COALESCE(MAX("${idField.dbName ?? idField.name}"), 1) FROM "${table}"))`,
      )
    }
    console.log(`  ${model.name}: ${rows.length}`)
  }
  console.log('옮기기를 마쳤습니다.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
