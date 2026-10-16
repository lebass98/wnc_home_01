import { useRef, useState } from 'react'
import { IS_DEMO } from '../lib/api'
import MediaPicker from './MediaPicker'

/**
 * 영상 지정 — 파일 업로드, 미디어 라이브러리에서 고르기, 영상 주소 입력을 지원한다.
 * ThumbnailInput 의 영상판이다. 데모에는 업로드 서버가 없어 주소 입력만 쓴다.
 */
export default function VideoInput({
  value,
  onChange,
  label = '영상',
  hint,
  previewSrc,
  poster,
}: {
  value: string
  onChange: (url: string) => void
  label?: string
  hint?: string
  /** 미리보기에 쓸 실제 주소 — 템플릿 프리뷰처럼 저장값과 보여 줄 주소가 다를 때 넘긴다. */
  previewSrc?: string
  /** 미리보기 영상의 대표 이미지 */
  poster?: string
}) {
  const modes = IS_DEMO ? (['url'] as const) : (['upload', 'library', 'url'] as const)
  const [mode, setMode] = useState<'upload' | 'library' | 'url'>(modes[0])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('wnc_admin_token')
      const res = await fetch('/api/uploads/video', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 413) throw new Error('영상이 너무 커서 서버가 받지 않았습니다. 배포 서버는 4.5MB 까지만 받으니 큰 영상은 로컬 관리자에서 올려 주세요.')
      if (!res.ok) throw new Error(data.message ?? '영상 업로드에 실패했습니다. 잠시 뒤 다시 시도해 주세요.')
      onChange(data.url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const src = previewSrc ?? value

  return (
    <div>
      <span className="label">{label}</span>
      {hint && <p className="-mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* 미리보기 — 소리 없이 반복 재생해 실제 화면과 같은 느낌을 준다. */}
        <div className="aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-slate-900 sm:w-56 dark:border-slate-600">
          {src ? (
            <video key={src} src={src} poster={poster || undefined} muted loop autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-slate-500">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-1">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  mode === m ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {m === 'upload' ? '파일 업로드' : m === 'library' ? '라이브러리' : '주소 입력'}
              </button>
            ))}
          </div>

          {mode === 'upload' ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
              />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary">
                {uploading ? '업로드 중...' : '영상 선택'}
              </button>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">MP4, WEBM · 최대 50MB · 배경용은 10~20초, 10MB 안팎을 권장합니다</p>
            </div>
          ) : mode === 'library' ? (
            <div>
              <button type="button" onClick={() => setPickerOpen(true)} className="btn-secondary">
                라이브러리 열기
              </button>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">이미 올린 영상 중에서 고릅니다.</p>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="https://example.com/video.mp4"
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
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">유튜브 공유 주소가 아닌 MP4·WEBM 파일 주소를 넣어 주세요.</p>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          {pickerOpen && <MediaPicker kind="video" onPick={(url) => onChange(url)} onClose={() => setPickerOpen(false)} />}

          {value && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="min-w-0 truncate text-slate-500">{value}</span>
              <button type="button" onClick={() => onChange('')} className="font-medium text-red-600 hover:text-red-700">
                영상 제거
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
