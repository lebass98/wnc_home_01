import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_COMPONENT_SETTINGS, componentSettingsSchema, type ComponentSettings, type ComponentSettingsResponse, type MainVisualMode } from '@wnc/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { componentImageUrl, invalidateComponentSettings, loadComponentSettings } from '../../lib/componentSettings'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'
import ThumbnailInput from '../../components/ThumbnailInput'
import VideoInput from '../../components/VideoInput'
import TemplateSectionTabs from '../../components/TemplateSectionTabs'

type MainVisual = ComponentSettings['mainVisual']
type Slide = MainVisual['slides'][number]

const MAX_SLIDES = 6

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2 text-sm font-medium"><span>{label}</span>{children}</label>
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700"><span>{label}</span><input type="checkbox" className="h-5 w-5 accent-blue-600" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>
}

/** 표시 방식 고르기 카드 */
const MODES: { value: MainVisualMode; label: string; description: string; icon: string }[] = [
  { value: 'slide', label: '이미지 슬라이드', description: `여러 장의 이미지를 차례로 넘겨 보여 줍니다. 최대 ${MAX_SLIDES}장.`, icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm8-12h.01' },
  { value: 'video', label: '배경 영상', description: '영상 하나를 소리 없이 반복 재생하고 그 위에 문구를 얹습니다.', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
]

/**
 * [템플릿 관리 → 메인 비주얼] — 메인 최상단 배너를 이미지 슬라이드 또는 배경 영상으로 관리한다.
 * 값은 컴포넌트 설정의 mainVisual 한 칸에 담기고, 두 방식의 값을 모두 남겨 두어 오가도 지워지지 않는다.
 */
export default function MainVisualPage() {
  const { user } = useAuth()
  const [saved, setSaved] = useState<{ value: MainVisual; revision: number } | null>(null)
  const [draft, setDraft] = useState<MainVisual | null>(null)
  const [slideIndex, setSlideIndex] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const dirty = !!saved && !!draft && JSON.stringify(saved.value) !== JSON.stringify(draft)

  const apply = (value: ComponentSettingsResponse) => {
    setSaved({ value: value.settings.mainVisual, revision: value.revisions.mainVisual ?? 0 })
    setDraft(structuredClone(value.settings.mainVisual))
  }

  useEffect(() => {
    let alive = true
    loadComponentSettings().then((value) => { if (alive) apply(value) }).catch((e: Error) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (user?.role !== 'ADMIN') return <ErrorMessage message="메인 비주얼 관리는 최고관리자만 사용할 수 있습니다." />
  if (!draft || !saved) return <><TemplateSectionTabs showActive /><PageHeader title="메인 비주얼" />{error ? <ErrorMessage message={error} /> : <Loading />}</>

  const update = (values: Partial<MainVisual>) => {
    setDraft((current) => current ? { ...current, ...values } : current)
    setMessage('')
  }
  const index = Math.min(slideIndex, draft.slides.length - 1)
  const slide = draft.slides[index]
  const changeSlide = (values: Partial<Slide>) => update({ slides: draft.slides.map((item, i) => i === index ? { ...item, ...values } : item) })
  const changeVideo = (values: Partial<MainVisual['video']>) => update({ video: { ...draft.video, ...values } })
  const moveSlide = (step: -1 | 1) => {
    const slides = [...draft.slides]
    const target = index + step
    ;[slides[index], slides[target]] = [slides[target], slides[index]]
    update({ slides })
    setSlideIndex(target)
  }

  async function save() {
    if (!draft || !saved) return
    const parsed = componentSettingsSchema.shape.mainVisual.safeParse(draft)
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(' ')); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await api<{ value: MainVisual; revision: number }>('/components/mainVisual', {
        method: 'PUT', auth: true, body: { value: parsed.data, revision: saved.revision },
      })
      setSaved({ value: result.value, revision: result.revision })
      setDraft(structuredClone(result.value))
      invalidateComponentSettings()
      setMessage(`메인 비주얼을 ${result.value.mode === 'video' ? '배경 영상' : '이미지 슬라이드'}으로 저장했습니다. 홈페이지에 반영되었습니다.`)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function reload() {
    setBusy(true); setError(''); setMessage('')
    try {
      apply(await api<ComponentSettingsResponse>('/components'))
      setSlideIndex(0)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  return <>
    <TemplateSectionTabs showActive />
    <PageHeader
      title="메인 비주얼"
      description="메인 페이지 맨 위 배너를 이미지 슬라이드 또는 배경 영상으로 꾸밉니다. 저장하면 홈페이지에 바로 반영됩니다."
      action={<Link to="/" target="_blank" rel="noopener noreferrer" className="btn-secondary whitespace-nowrap">저장된 화면 보기 ↗</Link>}
    />
    {error && <ErrorMessage message={error} />}
    {message && <p role="status" className="mb-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}

    <fieldset disabled={busy} className="min-w-0 space-y-6 disabled:opacity-60">
      <section className="card p-5 sm:p-7" aria-labelledby="mv-mode">
        <h2 id="mv-mode" className="mb-4 text-lg font-bold">표시 방식</h2>
        <div role="radiogroup" aria-labelledby="mv-mode" className="grid gap-3 sm:grid-cols-2">
          {MODES.map((mode) => {
            const on = draft.mode === mode.value
            return (
              <button key={mode.value} type="button" role="radio" aria-checked={on} onClick={() => update({ mode: mode.value })}
                className={`flex items-start gap-4 rounded-xl border p-5 text-left transition ${on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-slate-800' : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900'}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d={mode.icon} /></svg>
                </span>
                <span>
                  <span className="block font-semibold">{mode.label}{saved.value.mode === mode.value && <span className="ml-2 text-xs font-medium text-emerald-600">현재 홈페이지</span>}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{mode.description}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">두 방식의 설정은 따로 보관됩니다. 방식을 바꿔도 다른 쪽에 넣어 둔 이미지·영상은 지워지지 않습니다.</p>
      </section>

      {draft.mode === 'slide' ? (
        <section className="card space-y-6 p-5 sm:p-7" aria-labelledby="mv-slide">
          <h2 id="mv-slide" className="text-lg font-bold">이미지 슬라이드</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle label="슬라이드 자동 재생" checked={draft.autoplay} onChange={(autoplay) => update({ autoplay })} />
            <Field label="슬라이드 대기 시간 (초)"><input className="input" type="number" min={2} max={30} step={1} value={draft.interval / 1000} onChange={(e) => update({ interval: Number(e.target.value) * 1000 })} /></Field>
          </div>

          {/* 슬라이드 목록 — 썸네일로 보고 골라서 고친다. */}
          <div>
            <p className="mb-2 text-sm font-medium">슬라이드 ({draft.slides.length}/{MAX_SLIDES})</p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {draft.slides.map((item, i) => (
                <li key={i}>
                  <button type="button" aria-pressed={index === i} onClick={() => setSlideIndex(i)}
                    className={`block w-full overflow-hidden rounded-lg border text-left transition ${index === i ? 'border-brand-500 ring-2 ring-brand-500' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'}`}>
                    <span className="block aspect-video bg-slate-100 dark:bg-slate-800">
                      {item.image && <img src={componentImageUrl(item.image)} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <span className="block truncate px-2 py-1.5 text-xs"><b className="mr-1">{i + 1}</b>{item.title.split('\n')[0] || '제목 없음'}</span>
                  </button>
                </li>
              ))}
              {draft.slides.length < MAX_SLIDES && (
                <li>
                  <button type="button" onClick={() => { update({ slides: [...draft.slides, { title: '새 슬라이드', description: '', image: '' }] }); setSlideIndex(draft.slides.length) }}
                    className="grid aspect-video w-full place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600">
                    + 슬라이드 추가
                  </button>
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-5 rounded-xl border border-slate-200 p-5 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">슬라이드 {index + 1} 편집</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" disabled={index === 0} onClick={() => moveSlide(-1)}>앞으로</button>
                <button type="button" className="btn-secondary" disabled={index === draft.slides.length - 1} onClick={() => moveSlide(1)}>뒤로</button>
                <button type="button" className="btn-secondary text-red-600" disabled={draft.slides.length <= 1} onClick={() => { update({ slides: draft.slides.filter((_, i) => i !== index) }); setSlideIndex(Math.max(0, index - 1)) }}>삭제</button>
              </div>
            </div>
            <Field label="제목 (줄바꿈 가능)"><textarea className="input" rows={2} maxLength={200} value={slide.title} onChange={(e) => changeSlide({ title: e.target.value })} /></Field>
            <Field label="설명 (줄바꿈 가능)"><textarea className="input" rows={3} maxLength={500} value={slide.description} onChange={(e) => changeSlide({ description: e.target.value })} /></Field>
            <ThumbnailInput key={`slide-${index}`} label="배경 이미지" hint="가로 1920px 이상, 가로로 긴 이미지를 권장합니다." value={componentImageUrl(slide.image) || null} onChange={(image) => changeSlide({ image: image ?? '' })} />
          </div>

          <div className="relative overflow-hidden rounded-xl bg-slate-950 px-5 py-16 text-center text-white">
            {slide.image && <img src={componentImageUrl(slide.image)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
            <div className="relative"><p className="mb-4 text-xs text-white/70">작성 중 미리보기 · 슬라이드 {index + 1}</p><p className="whitespace-pre-line text-xl font-bold">{slide.title}</p><p className="mt-3 whitespace-pre-line text-sm">{slide.description}</p></div>
          </div>
        </section>
      ) : (
        <section className="card space-y-6 p-5 sm:p-7" aria-labelledby="mv-video">
          <h2 id="mv-video" className="text-lg font-bold">배경 영상</h2>
          <VideoInput label="영상 파일" hint="자동 재생을 위해 늘 소리 없이 반복 재생됩니다. 화면을 꽉 채우도록 가장자리가 잘릴 수 있습니다."
            value={draft.video.src} previewSrc={draft.video.src ? componentImageUrl(draft.video.src) : ''} poster={draft.video.poster ? componentImageUrl(draft.video.poster) : ''}
            onChange={(src) => changeVideo({ src })} />
          <ThumbnailInput label="대표 이미지 (선택)" hint="영상을 불러오는 동안, 또는 움직임 줄이기 설정을 켠 방문자에게 대신 보여 줍니다."
            value={draft.video.poster ? componentImageUrl(draft.video.poster) : null} onChange={(poster) => changeVideo({ poster: poster ?? '' })} />
          <Field label="제목 (줄바꿈 가능, 비우면 영상만 표시)"><textarea className="input" rows={2} maxLength={200} value={draft.video.title} onChange={(e) => changeVideo({ title: e.target.value })} /></Field>
          <Field label="설명 (줄바꿈 가능)"><textarea className="input" rows={3} maxLength={500} value={draft.video.description} onChange={(e) => changeVideo({ description: e.target.value })} /></Field>
          <Field label={`영상 어둡기 ${draft.video.overlayOpacity}%`}><input className="w-full accent-blue-600" type="range" min={0} max={80} value={draft.video.overlayOpacity} onChange={(e) => changeVideo({ overlayOpacity: Number(e.target.value) })} /></Field>
          <Toggle label="방문자가 소리를 켤 수 있는 단추 표시" checked={draft.video.showSoundToggle} onChange={(showSoundToggle) => changeVideo({ showSoundToggle })} />

          <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950 text-center text-white">
            {draft.video.src
              ? <video key={draft.video.src} src={componentImageUrl(draft.video.src)} poster={draft.video.poster ? componentImageUrl(draft.video.poster) : undefined} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
              : <p className="absolute inset-0 grid place-items-center text-sm text-white/60">영상을 올리면 여기에서 미리 볼 수 있습니다.</p>}
            <div className="absolute inset-0 bg-black" style={{ opacity: draft.video.overlayOpacity / 100 }} aria-hidden />
            <div className="relative flex h-full flex-col items-center justify-center px-5">
              <p className="whitespace-pre-line text-xl font-bold">{draft.video.title}</p>
              <p className="mt-3 whitespace-pre-line text-sm">{draft.video.description}</p>
            </div>
            <span className="absolute left-3 top-3 rounded bg-black/50 px-2 py-1 text-[11px]">작성 중 미리보기</span>
          </div>
        </section>
      )}
    </fieldset>

    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" type="button" disabled={busy} onClick={() => { update(structuredClone(DEFAULT_COMPONENT_SETTINGS.mainVisual)); setSlideIndex(0) }}>기본값으로 되돌리기</button>
        <button className="btn-secondary" type="button" disabled={busy} onClick={reload}>다시 불러오기</button>
      </div>
      <div className="flex items-center gap-3">
        {dirty && <span className="text-sm text-amber-600">저장하지 않은 변경사항이 있습니다</span>}
        <button className="btn-primary" type="button" disabled={busy || !dirty} onClick={save}>{busy ? '처리 중…' : '메인 비주얼 저장'}</button>
      </div>
    </div>
  </>
}
