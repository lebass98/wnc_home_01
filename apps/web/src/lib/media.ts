import { useEffect, useState } from 'react'
import { api } from './api'

/**
 * 미디어 라이브러리 공용 도우미 — 파일 올리기와 대체 텍스트.
 */

/** 올릴 수 있는 그림 — 업로드 API(/uploads)와 같은 목록 */
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/** 파일 하나를 올린다 — 그림은 /uploads(5MB), PDF·ZIP 은 /uploads/file(10MB). 올린 주소를 돌려준다. */
export async function uploadMediaFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const token = localStorage.getItem('wnc_admin_token')
  const res = await fetch(IMAGE_TYPES.has(file.type) ? '/api/uploads' : '/api/uploads/file', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${file.name}: ${data.message ?? '업로드에 실패했습니다.'}`)
  return data.url as string
}

/* ---------------- 대체 텍스트 — 홈페이지 본문 그림의 alt 를 채운다 ---------------- */

let altsPromise: Promise<Record<string, string>> | null = null
let altsCache: Record<string, string> = {}

function loadAlts() {
  altsPromise ??= api<Record<string, string>>('/media/alts')
    .then((map) => (altsCache = map))
    .catch(() => {
      altsPromise = null
      return altsCache
    })
  return altsPromise
}

/** 관리자에서 대체 텍스트를 고친 뒤 — 다음 화면부터 새 값을 쓴다. */
export function invalidateMediaAlts() {
  altsPromise = null
}

/** { '/uploads/a.jpg': '대체 텍스트' } — 처음에는 빈 값, 받아 오면 다시 그린다. */
export function useMediaAlts(): Record<string, string> {
  const [alts, setAlts] = useState(altsCache)
  useEffect(() => {
    let alive = true
    loadAlts().then((map) => alive && setAlts(map))
    return () => {
      alive = false
    }
  }, [])
  return alts
}

/** 그림 주소에서 업로드 경로만 — 'https://…/uploads/a.jpg?v=1' → '/uploads/a.jpg' */
export function uploadPathOf(src: string): string | null {
  const m = src.match(/\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]*/)
  return m ? m[0] : null
}
