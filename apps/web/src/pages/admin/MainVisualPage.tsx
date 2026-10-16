import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_COMPONENT_SETTINGS, DEFAULT_MAIN_VISUAL_CAPTIONS, MAX_MAIN_VISUAL_CAPTIONS, componentSettingsSchema, type ComponentSettings, type ComponentSettingsResponse, type MainVisualCaption, type MainVisualCaptionAlign, type MainVisualMode } from '@wnc/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { componentImageUrl, invalidateComponentSettings, loadComponentSettings } from '../../lib/componentSettings'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'
import ThumbnailInput from '../../components/ThumbnailInput'
import VideoInput from '../../components/VideoInput'
import TemplateSectionTabs from '../../components/TemplateSectionTabs'
import MainVisualVideo from '../../components/MainVisualVideo'

type MainVisual = ComponentSettings['mainVisual']
type Slide = MainVisual['slides'][number]

const MAX_SLIDES = 6

const ALIGNS: { value: MainVisualCaptionAlign; label: string }[] = [
  { value: 'left', label: '왼쪽' },
  { value: 'center', label: '가운데' },
  { value: 'right', label: '오른쪽' },
]

/**
 * 예전 저장본(제목·설명 한 장)을 문구 목록으로 옮겨 읽는다 — 저장본과 작성본에 똑같이 적용해
 * 열자마자 '저장하지 않은 변경'으로 보이지 않게 한다.
 */
function normalize(value: MainVisual): MainVisual {
  const video = value.video
  if (video.captions.length || !video.title.trim()) return value
  return { ...value, video: { ...video, captions: [{ eyebrow: '', title: video.title, description: video.description, align: 'left' }] } }
}

/** 실제 홈페이지 부품을 1600×900 으로 그려 상자 폭에 맞춰 줄인다 — 글자 크기·애니메이션이 화면과 같다. */
function ScaledPreview({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const element = box.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1600))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={box} className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
      <div className="absolute left-0 top-0 h-[900px] w-[1600px] origin-top-left" style={{ transform: `scale(${scale})` }}>{children}</div>
    </div>
  )
}

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
  const [captionIndex, setCaptionIndex] = useState(0)
  /** 미리보기에서 고치는 문구만 볼지, 홈페이지처럼 차례로 넘겨 볼지 */
  const [playAll, setPlayAll] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const dirty = !!saved && !!draft && JSON.stringify(saved.value) !== JSON.stringify(draft)

  const apply = (value: ComponentSettingsResponse) => {
    const mainVisual = normalize(value.settings.mainVisual)
    setSaved({ value: mainVisual, revision: value.revisions.mainVisual ?? 0 })
    setDraft(structuredClone(mainVisual))
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
  const captions = draft.video.captions
  const cIndex = Math.min(captionIndex, Math.max(captions.length - 1, 0))
  const caption = captions[cIndex] as MainVisualCaption | undefined
  const changeCaptions = (next: MainVisualCaption[]) => changeVideo({ captions: next })
  const changeCaption = (values: Partial<MainVisualCaption>) => changeCaptions(captions.map((item, i) => i === cIndex ? { ...item, ...values } : item))
  const addCaption = () => {
    // 새 문구는 앞 문구의 반대편에 둔다 — 좌우로 번갈아 나타나도록.
    const last = captions[captions.length - 1]
    changeCaptions([...captions, { eyebrow: '', title: '새 문구', description: '', align: last?.align === 'left' ? 'right' : 'left' }])
    setCaptionIndex(captions.length)
  }
  const moveCaption = (step: -1 | 1) => {
    const next = [...captions]
    const target = cIndex + step
    ;[next[cIndex], next[target]] = [next[target], next[cIndex]]
    changeCaptions(next)
    setCaptionIndex(target)
  }
  const moveSlide = (step: -1 | 1) => {
    const slides = [...draft.slides]
    const target = index + step
    ;[slides[index], slides[target]] = [slides[target], slides[index]]
    update({ slides })
    setSlideIndex(target)
  }

  async function save() {
    if (!draft || !saved) return
    // 문구를 저장하면 예전 칸(제목·설명)에도 첫 장을 담는다 — 문구 목록을 모르는 화면도 같은 제목을 보인다.
    const first = draft.video.captions[0]
    const value = { ...draft, video: { ...draft.video, title: first?.title ?? '', description: first?.description ?? '' } }
    const parsed = componentSettingsSchema.shape.mainVisual.safeParse(value)
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(' ')); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await api<{ value: MainVisual; revision: number }>('/components/mainVisual', {
        method: 'PUT', auth: true, body: { value: parsed.data, revision: saved.revision },
      })
      setSaved({ value: normalize(result.value), revision: result.revision })
      setDraft(structuredClone(normalize(result.value)))
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
          <Field label={`영상 어둡기 ${draft.video.overlayOpacity}%`}><input className="w-full accent-blue-600" type="range" min={0} max={80} value={draft.video.overlayOpacity} onChange={(e) => changeVideo({ overlayOpacity: Number(e.target.value) })} /></Field>
          <Toggle label="방문자가 소리를 켤 수 있는 단추 표시" checked={draft.video.showSoundToggle} onChange={(showSoundToggle) => changeVideo({ showSoundToggle })} />

          {/* 영상 위 문구 — 여러 장을 왼쪽·가운데·오른쪽 자리에 차례로 띄운다. */}
          <div className="space-y-5 rounded-xl border border-slate-200 p-5 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">영상 위 문구 ({captions.length}/{MAX_MAIN_VISUAL_CAPTIONS})</p>
                <p className="mt-1 text-xs text-slate-500">여러 장이면 정한 시간마다 다음 문구로 넘어갑니다. 비워 두면 영상만 보입니다.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => { changeCaptions(DEFAULT_MAIN_VISUAL_CAPTIONS.map((item) => ({ ...item }))); setCaptionIndex(0) }}>추천 문구로 채우기</button>
            </div>
            <Field label="문구 한 장이 머무는 시간 (초)"><input className="input sm:max-w-[200px]" type="number" min={3} max={20} step={1} value={draft.video.captionInterval / 1000} onChange={(e) => changeVideo({ captionInterval: Number(e.target.value) * 1000 })} /></Field>

            <ul className="flex flex-wrap gap-2">
              {captions.map((item, i) => (
                <li key={i}>
                  <button type="button" aria-pressed={cIndex === i} onClick={() => setCaptionIndex(i)}
                    className={`flex max-w-[220px] items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${cIndex === i ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-slate-800' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'}`}>
                    <b>{i + 1}</b>
                    <span className="truncate">{item.title.split('\n')[0] || '제목 없음'}</span>
                    <span className="shrink-0 text-xs text-slate-400">{ALIGNS.find((a) => a.value === item.align)?.label}</span>
                  </button>
                </li>
              ))}
              {captions.length < MAX_MAIN_VISUAL_CAPTIONS && (
                <li><button type="button" className="rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-600" onClick={addCaption}>+ 문구 추가</button></li>
              )}
            </ul>

            {caption && (
              <div className="space-y-5 border-t border-slate-200 pt-5 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">문구 {cIndex + 1} 편집</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" disabled={cIndex === 0} onClick={() => moveCaption(-1)}>앞으로</button>
                    <button type="button" className="btn-secondary" disabled={cIndex === captions.length - 1} onClick={() => moveCaption(1)}>뒤로</button>
                    <button type="button" className="btn-secondary text-red-600" onClick={() => { changeCaptions(captions.filter((_, i) => i !== cIndex)); setCaptionIndex(Math.max(0, cIndex - 1)) }}>삭제</button>
                  </div>
                </div>
                <div>
                  <span className="mb-2 block text-sm font-medium">자리</span>
                  <div role="radiogroup" aria-label="문구 자리" className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                    {ALIGNS.map((a) => (
                      <button key={a.value} type="button" role="radio" aria-checked={caption.align === a.value} onClick={() => changeCaption({ align: a.value })}
                        className={`border-l border-slate-300 px-5 py-2.5 text-sm first:border-l-0 dark:border-slate-600 ${caption.align === a.value ? 'bg-brand-600 font-semibold text-white' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">휴대폰처럼 좁은 화면에서는 읽기 쉽도록 늘 왼쪽에 맞춥니다.</p>
                </div>
                <Field label="소제목 (영문 권장, 선택)"><input className="input" maxLength={60} placeholder="예: WEB DEVELOPMENT" value={caption.eyebrow} onChange={(e) => changeCaption({ eyebrow: e.target.value })} /></Field>
                <Field label="제목 (줄바꿈하면 줄마다 차례로 떠오릅니다)"><textarea className="input" rows={2} maxLength={200} value={caption.title} onChange={(e) => changeCaption({ title: e.target.value })} /></Field>
                <Field label="설명 (줄바꿈 가능)"><textarea className="input" rows={3} maxLength={500} value={caption.description} onChange={(e) => changeCaption({ description: e.target.value })} /></Field>
              </div>
            )}
          </div>

          {/* 실제 홈페이지 부품 그대로의 미리보기 — 고치는 문구에 멈춰 두거나, 홈페이지처럼 차례로 넘겨 본다. */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">작성 중 미리보기</p>
              <div role="radiogroup" aria-label="미리보기 방식" className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs dark:border-slate-600">
                {[{ value: false, label: `문구 ${cIndex + 1} 고정` }, { value: true, label: '전체 재생' }].map((o) => (
                  <button key={String(o.value)} type="button" role="radio" aria-checked={playAll === o.value} onClick={() => setPlayAll(o.value)}
                    className={`border-l border-slate-300 px-3 py-1.5 first:border-l-0 dark:border-slate-600 ${playAll === o.value ? 'bg-slate-900 font-semibold text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {draft.video.src
              ? <ScaledPreview><MainVisualVideo video={draft.video} align="left" className="h-full w-full" pinned={playAll ? undefined : cIndex} /></ScaledPreview>
              : <p className="grid aspect-video place-items-center rounded-xl bg-slate-950 text-sm text-white/60">영상을 올리면 여기에서 미리 볼 수 있습니다.</p>}
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
