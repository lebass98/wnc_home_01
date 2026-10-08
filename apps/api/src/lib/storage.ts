import path from 'node:path'
import { createReadStream, existsSync, mkdirSync } from 'node:fs'
import { readdir, rm, stat, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { del, get, head, list, put } from '@vercel/blob'
import { env } from './env.js'

/**
 * 업로드 파일 저장소 — 관리자가 올린 그림·첨부파일을 둔다.
 *
 * - Vercel Blob(비공개 저장소)을 쓸 수 있으면 Blob 의 `uploads/<파일>` 에 둔다.
 *   로컬과 배포가 같은 DB(Neon)를 쓰므로, 로컬에서 올린 파일도 Blob 에 올려야 배포에서 보인다.
 *   · 배포 서버: Vercel 이 넣어 주는 BLOB_STORE_ID 로 인증한다(OIDC).
 *   · 로컬: apps/api/.env 의 BLOB_READ_WRITE_TOKEN 으로 인증한다.
 * - 둘 다 없으면 예전처럼 apps/api/uploads 폴더에 둔다.
 *
 * 본문·설정에 박히는 공개 주소는 어느 쪽이든 `/uploads/<파일>` 로 같다 — 저장소를 바꿔도 주소가 안 깨진다.
 * 비공개 저장소라 그 주소로 온 요청은 서버가 Blob 에서 꺼내 보내 준다(app.ts).
 */
export const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN || (env.serverless && process.env.BLOB_STORE_ID))

/** 로컬 업로드 폴더 — Blob 을 안 쓸 때의 저장 위치이자, 예전에 올린 파일이 남아 있는 곳 */
export const UPLOAD_DIR = env.serverless ? '/tmp/uploads' : path.resolve(process.cwd(), 'uploads')
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

/** 업로드 파일 이름 — 맨 위 폴더의 파일만, 경로 이동 없이 */
export const UPLOAD_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

const blobKey = (name: string) => `uploads/${name}`
const localFile = (name: string) => path.join(UPLOAD_DIR, name)

export interface StoredFile {
  name: string
  size: number
  uploadedAt: Date
}

/** 파일을 저장한다 */
export async function saveUpload(name: string, body: Buffer, contentType: string): Promise<void> {
  if (blobEnabled) {
    await put(blobKey(name), body, { access: 'private', addRandomSuffix: false, contentType })
    return
  }
  await writeFile(localFile(name), body)
}

/** 맨 위 폴더의 업로드 파일 목록 — 하위 폴더(템플릿 백업 등)와 숨김 파일은 뺀다 */
export async function listUploads(): Promise<StoredFile[]> {
  if (blobEnabled) {
    const out: StoredFile[] = []
    let cursor: string | undefined
    do {
      const page = await list({ prefix: 'uploads/', limit: 1000, cursor })
      for (const b of page.blobs) {
        const name = b.pathname.slice('uploads/'.length)
        if (UPLOAD_NAME.test(name)) out.push({ name, size: b.size, uploadedAt: new Date(b.uploadedAt) })
      }
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
    return out
  }
  const entries = await readdir(UPLOAD_DIR, { withFileTypes: true })
  return Promise.all(
    entries
      .filter((e) => e.isFile() && UPLOAD_NAME.test(e.name))
      .map(async (e) => {
        const st = await stat(localFile(e.name))
        return { name: e.name, size: st.size, uploadedAt: st.mtime }
      }),
  )
}

/** 파일이 있는지 */
export async function uploadExists(name: string): Promise<boolean> {
  if (!UPLOAD_NAME.test(name)) return false
  if (existsSync(localFile(name))) return true
  if (blobEnabled) return head(blobKey(name)).then(() => true, () => false)
  return false
}

/** 파일을 지운다 (없으면 조용히 넘어간다) */
export async function deleteUpload(name: string): Promise<void> {
  if (!UPLOAD_NAME.test(name)) return
  if (blobEnabled) await del(blobKey(name)).catch(() => {})
  await rm(localFile(name), { force: true })
}

/**
 * 파일을 읽는다 — /uploads/<파일> 응답에 쓴다. 로컬 폴더에 남은 예전 파일이 있으면 그것을 먼저 쓴다.
 * 그림 크기 계산처럼 로컬 경로가 필요한 곳은 localPath 를 본다(Blob 파일은 null).
 */
export async function readUpload(
  name: string,
): Promise<{ stream: Readable; contentType: string; size: number; etag?: string; localPath: string | null } | null> {
  if (!UPLOAD_NAME.test(name)) return null
  const file = localFile(name)
  if (existsSync(file)) {
    const st = await stat(file)
    return { stream: createReadStream(file), contentType: '', size: st.size, localPath: file }
  }
  if (!blobEnabled) return null
  const got = await get(blobKey(name), { access: 'private' }).catch(() => null)
  if (!got || got.statusCode !== 200) return null
  return {
    stream: Readable.fromWeb(got.stream as Parameters<typeof Readable.fromWeb>[0]),
    contentType: got.blob.contentType,
    size: got.blob.size,
    etag: got.blob.etag,
    localPath: null,
  }
}

/** 로컬에 있는 파일이면 그 경로 (그림 가로·세로 계산용) */
export function localUploadPath(name: string): string | null {
  const file = localFile(name)
  return UPLOAD_NAME.test(name) && existsSync(file) ? file : null
}
