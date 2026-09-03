import path from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import AdmZip from 'adm-zip'

/**
 * 템플릿 파일 묶음.
 *
 * 템플릿 하나는 사이트 화면·레이아웃·부품 파일과 매니페스트(template.json)를 묶은 것이다.
 * 서버는 uploads/templates/<id> 아래에 풀어 두고, 내보낼 때 zip 으로 압축한다.
 *
 *   template.json      이름·버전·헤더·푸터·화면별 레이아웃
 *   pages/*.tsx        홈페이지 화면 (apps/web/src/pages/site)
 *   layouts/*          레이아웃과 등록부 (apps/web/src/layouts)
 *   components/*.tsx   화면·레이아웃이 가져다 쓰는 부품 (apps/web/src/components)
 */

/** 실제 사이트 소스 — 서버는 apps/api 에서 도므로 형제 폴더를 가리킨다. */
const WEB_SRC = path.resolve(process.cwd(), '../web/src')
const LIVE = {
  pages: path.join(WEB_SRC, 'pages/site'),
  layouts: path.join(WEB_SRC, 'layouts'),
  components: path.join(WEB_SRC, 'components'),
}

/** 템플릿 보관함 — git 에 올라가지 않는다. */
const TEMPLATES_DIR = path.resolve(process.cwd(), 'uploads/templates')
/** 템플릿을 적용하기 전 원본을 남겨 두는 곳 */
const APPLY_BACKUP_DIR = path.resolve(process.cwd(), 'uploads/template-apply-backups')

/** 묶음 안의 폴더 이름 → 실제 사이트 폴더 */
const FOLDERS = ['pages', 'layouts', 'components'] as const
type Folder = (typeof FOLDERS)[number]

export interface TemplateManifest {
  type: 'wnc-template'
  name: string
  description?: string
  version?: string
  author?: string
  header?: string
  footer?: string
  pageLayouts?: Record<string, string>
}

export function templateDir(id: number): string {
  return path.join(TEMPLATES_DIR, String(id))
}

/** 이 템플릿의 파일이 보관되어 있는지 */
export function hasFiles(id: number): boolean {
  return existsSync(path.join(templateDir(id), 'template.json'))
}

/** 다룰 수 있는 파일인지 — 소스와 스타일만 담는다. */
function isSourceName(name: string): boolean {
  return /\.(tsx|ts|css)$/.test(name) && !name.startsWith('.')
}

async function listSources(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  return (await readdir(dir)).filter(isSourceName).sort()
}

/**
 * 파일들이 가져다 쓰는 부품 이름을 모은다.
 * 부품이 또 다른 부품을 쓰는 경우까지 따라가 빠짐없이 담는다.
 */
async function collectComponents(seeds: string[]): Promise<Set<string>> {
  const found = new Set<string>()
  const queue: string[] = []

  const scan = (text: string) => {
    for (const m of text.matchAll(/from\s+'(?:\.\.\/)*(?:\.\/)?components\/([A-Za-z0-9_]+)'/g)) {
      if (!found.has(m[1])) {
        found.add(m[1])
        queue.push(m[1])
      }
    }
  }

  for (const file of seeds) scan(await readFile(file, 'utf8'))
  while (queue.length > 0) {
    const name = queue.shift() as string
    const file = path.join(LIVE.components, `${name}.tsx`)
    if (existsSync(file)) scan(await readFile(file, 'utf8'))
  }
  return found
}

/**
 * 지금 사이트 소스를 템플릿 파일로 담는다.
 * 기본 제공 템플릿을 처음 만들 때와, 사이트를 고친 내용을 템플릿에 담을 때 쓴다.
 */
export async function snapshotLive(id: number, manifest: TemplateManifest): Promise<number> {
  const dir = templateDir(id)
  await rm(dir, { recursive: true, force: true })
  for (const folder of FOLDERS) await mkdir(path.join(dir, folder), { recursive: true })

  const pageNames = await listSources(LIVE.pages)
  const layoutNames = await listSources(LIVE.layouts)

  for (const name of pageNames) await copyFile(path.join(LIVE.pages, name), path.join(dir, 'pages', name))
  for (const name of layoutNames) await copyFile(path.join(LIVE.layouts, name), path.join(dir, 'layouts', name))

  // 화면·레이아웃이 쓰는 부품만 담는다 — 관리자 전용 부품은 들어가지 않는다.
  const seeds = [
    ...pageNames.map((n) => path.join(LIVE.pages, n)),
    ...layoutNames.map((n) => path.join(LIVE.layouts, n)),
  ]
  const components = await collectComponents(seeds)
  let count = pageNames.length + layoutNames.length
  for (const name of components) {
    const src = path.join(LIVE.components, `${name}.tsx`)
    if (!existsSync(src)) continue
    await copyFile(src, path.join(dir, 'components', `${name}.tsx`))
    count += 1
  }

  await writeFile(path.join(dir, 'template.json'), JSON.stringify(manifest, null, 2), 'utf8')
  return count
}

/** 보관된 파일 수 — 목록에 '파일 n개'로 보여 준다. */
export async function countFiles(id: number): Promise<number> {
  const dir = templateDir(id)
  if (!existsSync(dir)) return 0
  let count = 0
  for (const folder of FOLDERS) count += (await listSources(path.join(dir, folder))).length
  return count
}

/** 보관된 파일 목록 — 폴더별 파일 이름 */
export async function listFiles(id: number): Promise<{ folder: Folder; files: string[] }[]> {
  const dir = templateDir(id)
  return Promise.all(FOLDERS.map(async (folder) => ({ folder, files: await listSources(path.join(dir, folder)) })))
}

export async function readManifest(id: number): Promise<TemplateManifest | null> {
  const file = path.join(templateDir(id), 'template.json')
  if (!existsSync(file)) return null
  try {
    return JSON.parse(await readFile(file, 'utf8')) as TemplateManifest
  } catch {
    return null
  }
}

/** 매니페스트만 새로 쓴다 — 이름·버전을 고치거나 활성 구성이 바뀌었을 때. */
export async function writeManifest(id: number, manifest: TemplateManifest): Promise<void> {
  const dir = templateDir(id)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  await writeFile(path.join(dir, 'template.json'), JSON.stringify(manifest, null, 2), 'utf8')
}

/** 보관된 파일을 zip 으로 묶는다 — 내보내기가 이 결과를 그대로 내려준다. */
export async function packZip(id: number): Promise<Buffer> {
  const dir = templateDir(id)
  const zip = new AdmZip()
  const manifest = path.join(dir, 'template.json')
  if (existsSync(manifest)) zip.addLocalFile(manifest)
  for (const folder of FOLDERS) {
    for (const name of await listSources(path.join(dir, folder))) {
      zip.addLocalFile(path.join(dir, folder, name), folder)
    }
  }
  return zip.toBuffer()
}

/**
 * 올린 zip 을 풀어 템플릿 파일로 저장한다.
 * 묶음 밖으로 새는 경로(../ 등)와 다룰 수 없는 파일은 버린다.
 */
export async function unpackZip(buffer: Buffer, id: number): Promise<{ manifest: TemplateManifest; files: number }> {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  const manifestEntry = entries.find((e) => !e.isDirectory && path.basename(e.entryName) === 'template.json')
  if (!manifestEntry) {
    throw new Error('template.json 이 없습니다. 내보내기로 받은 템플릿 zip 인지 확인해 주세요.')
  }
  let manifest: TemplateManifest
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf8')) as TemplateManifest
  } catch {
    throw new Error('template.json 을 읽을 수 없습니다. 파일이 손상되지 않았는지 확인해 주세요.')
  }
  if (manifest?.type !== 'wnc-template' || !manifest.name?.trim()) {
    throw new Error('워드앤코드 템플릿 형식이 아닙니다. template.json 의 type 과 name 을 확인해 주세요.')
  }

  const dir = templateDir(id)
  await rm(dir, { recursive: true, force: true })
  for (const folder of FOLDERS) await mkdir(path.join(dir, folder), { recursive: true })

  let files = 0
  for (const entry of entries) {
    if (entry.isDirectory) continue
    const parts = entry.entryName.split('/').filter((p) => p && p !== '.')
    // 압축을 풀면 폴더가 한 겹 더 있을 수 있어(templates/pages/..) 뒤에서부터 본다.
    const name = parts[parts.length - 1]
    const folder = parts[parts.length - 2] as Folder | undefined
    if (!folder || !FOLDERS.includes(folder)) continue
    if (!isSourceName(name) || name.includes('..')) continue
    await writeFile(path.join(dir, folder, name), entry.getData())
    files += 1
  }

  await writeFile(path.join(dir, 'template.json'), JSON.stringify(manifest, null, 2), 'utf8')
  return { manifest, files }
}

/**
 * 템플릿 파일을 실제 사이트에 덮어쓴다 — 이 템플릿을 켤 때 부른다.
 * 덮어쓰기 전 원본은 시각별 폴더에 남겨, 잘못되면 되돌릴 수 있다.
 */
export async function applyToLive(id: number): Promise<{ applied: number; backup: string }> {
  const dir = templateDir(id)
  if (!hasFiles(id)) throw new Error('이 템플릿에는 보관된 파일이 없습니다.')

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupRoot = path.join(APPLY_BACKUP_DIR, stamp)
  let applied = 0

  for (const folder of FOLDERS) {
    const from = path.join(dir, folder)
    const to = LIVE[folder]
    const names = await listSources(from)
    if (names.length === 0) continue
    await mkdir(path.join(backupRoot, folder), { recursive: true })
    if (!existsSync(to)) await mkdir(to, { recursive: true })

    for (const name of names) {
      const target = path.join(to, name)
      // 지금 파일을 먼저 백업한다. (새로 생기는 파일은 백업할 것이 없다)
      if (existsSync(target)) await copyFile(target, path.join(backupRoot, folder, name))
      await copyFile(path.join(from, name), target)
      applied += 1
    }
  }
  return { applied, backup: stamp }
}

/** 적용 백업 이름인지 — 시각 형식만 다룬다. 바깥 경로로 새지 않게 한다. */
function isStamp(name: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T[\d-]+Z$/.test(name)
}

export interface ApplyBackup {
  /** 폴더 이름이자 식별자 — 되돌릴 때 그대로 보낸다. */
  stamp: string
  createdAt: string
  files: number
}

/**
 * 템플릿을 적용하기 전 남겨 둔 원본 목록 — 최근 것이 위다.
 * 되돌리면 그 시점의 사이트 파일로 되돌아간다.
 */
export async function listApplyBackups(): Promise<ApplyBackup[]> {
  if (!existsSync(APPLY_BACKUP_DIR)) return []
  const names = (await readdir(APPLY_BACKUP_DIR)).filter(isStamp).sort().reverse()
  return Promise.all(
    names.map(async (stamp) => {
      const dir = path.join(APPLY_BACKUP_DIR, stamp)
      let files = 0
      for (const folder of FOLDERS) files += (await listSources(path.join(dir, folder))).length
      // 폴더 이름이 곧 시각이다. '2026-09-03T09-52-46-792Z' → ISO 로 되돌린다.
      const iso = stamp.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z')
      return { stamp, createdAt: iso, files }
    }),
  )
}

/** 이 백업에 담긴 파일 목록 — 되돌리기 전에 무엇이 바뀌는지 보여 준다. */
export async function listApplyBackupFiles(stamp: string): Promise<{ folder: Folder; files: string[] }[]> {
  if (!isStamp(stamp)) throw new Error('잘못된 백업 이름입니다.')
  const dir = path.join(APPLY_BACKUP_DIR, stamp)
  return Promise.all(FOLDERS.map(async (folder) => ({ folder, files: await listSources(path.join(dir, folder)) })))
}

/**
 * 백업 시점의 파일로 사이트를 되돌린다.
 * 되돌리기 직전 모습도 새 백업으로 남겨, 되돌린 것을 다시 되돌릴 수 있다.
 */
export async function restoreApplyBackup(stamp: string): Promise<{ restored: number; backup: string }> {
  if (!isStamp(stamp)) throw new Error('잘못된 백업 이름입니다.')
  const dir = path.join(APPLY_BACKUP_DIR, stamp)
  if (!existsSync(dir)) throw new Error('백업을 찾을 수 없습니다.')

  const newStamp = new Date().toISOString().replace(/[:.]/g, '-')
  const newBackup = path.join(APPLY_BACKUP_DIR, newStamp)
  let restored = 0

  for (const folder of FOLDERS) {
    const names = await listSources(path.join(dir, folder))
    if (names.length === 0) continue
    await mkdir(path.join(newBackup, folder), { recursive: true })
    for (const name of names) {
      const target = path.join(LIVE[folder], name)
      if (existsSync(target)) await copyFile(target, path.join(newBackup, folder, name))
      await copyFile(path.join(dir, folder, name), target)
      restored += 1
    }
  }
  return { restored, backup: newStamp }
}
