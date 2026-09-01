import { useRef, useState } from 'react'
import { IS_DEMO } from '../lib/api'

/** 썸네일 지정 — 파일 업로드와 외부 URL 입력을 모두 지원한다. */
export default function ThumbnailInput({
  value,
  onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [urlDraft, setUrlDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError('')
    try {
      if (IS_DEMO) {
        // 데모 모드에는 서버가 없으므로 base64 로 저장한다.
        if (file.size > 1.5 * 1024 * 1024) {
          throw new Error('데모 모드에서는 1.5MB 이하 이미지만 사용할 수 있습니다.')
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
          reader.readAsDataURL(file)
        })
        onChange(dataUrl)
        return
      }

      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('wnc_admin_token')
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? '업로드에 실패했습니다.')
      onChange(data.url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <span className="label">썸네일 이미지</span>

      <div className="flex gap-4">
        {/* 미리보기 */}
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/50">
          {value ? (
            <img src={value} alt="썸네일 미리보기" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-slate-300">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="mb-2 flex gap-1">
            {(['upload', 'url'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  mode === m ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {m === 'upload' ? '파일 업로드' : 'URL 입력'}
              </button>
            ))}
          </div>

          {mode === 'upload' ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-secondary"
              >
                {uploading ? '업로드 중...' : '이미지 선택'}
              </button>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                JPG, PNG, WEBP, GIF · 최대 5MB
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="input"
              />
              <button
                type="button"
                onClick={() => {
                  if (urlDraft.trim()) {
                    onChange(urlDraft.trim())
                    setUrlDraft('')
                  }
                }}
                className="btn-secondary shrink-0"
              >
                적용
              </button>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
            >
              이미지 제거
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
