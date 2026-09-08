import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { COMPONENT_CATALOG, DEFAULT_COMPONENT_SETTINGS, SUB_VISUAL_PAGES, componentSettingsSchema, type ComponentKey, type ComponentSettings, type ComponentSettingsResponse } from '@wnc/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { componentImageUrl, invalidateComponentSettings, loadComponentSettings } from '../../lib/componentSettings'
import { ErrorMessage, Loading, PageHeader } from '../../components/ui'
import ThumbnailInput from '../../components/ThumbnailInput'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2 text-sm font-medium"><span>{label}</span>{children}</label>
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700"><span>{label}</span><input type="checkbox" className="h-5 w-5 accent-blue-600" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>
}

export default function ComponentsPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const selected: ComponentKey = COMPONENT_CATALOG.find((item) => item.key === params.get('component'))?.key ?? 'header'
  const meta = COMPONENT_CATALOG.find((item) => item.key === selected)!
  const [saved, setSaved] = useState<ComponentSettingsResponse | null>(null)
  const [draft, setDraft] = useState<ComponentSettings | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [pageKey, setPageKey] = useState<string>('about')
  const [slideIndex, setSlideIndex] = useState(0)
  const dirty = !!saved && !!draft && JSON.stringify(saved.settings) !== JSON.stringify(draft)

  useEffect(() => {
    let alive = true
    loadComponentSettings().then((value) => {
      if (alive) { setSaved(value); setDraft(structuredClone(value.settings)) }
    }).catch((e: Error) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (user?.role !== 'ADMIN') return <ErrorMessage message="컴포넌트 관리는 최고관리자만 사용할 수 있습니다." />
  if (!draft || !saved) return <><PageHeader title="컴포넌트 관리" />{error ? <ErrorMessage message={error} /> : <Loading />}</>

  const update = <K extends ComponentKey>(key: K, value: ComponentSettings[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current)
    setMessage('')
  }
  const slide = draft.mainVisual.slides[Math.min(slideIndex, draft.mainVisual.slides.length - 1)]
  const visualPage = SUB_VISUAL_PAGES.find((page) => page.key === pageKey)!
  const page = draft.subVisual.pages[pageKey]
  const changeSlide = (values: Partial<typeof slide>) => update('mainVisual', { ...draft.mainVisual, slides: draft.mainVisual.slides.map((item, i) => i === slideIndex ? { ...item, ...values } : item) })
  const changePage = (values: Partial<typeof page>) => update('subVisual', { ...draft.subVisual, pages: { ...draft.subVisual.pages, [pageKey]: { ...page, ...values } } })
  const sectionDirty = JSON.stringify(draft[selected]) !== JSON.stringify(saved.settings[selected])

  async function save() {
    if (!draft || !saved) return
    const parsed = componentSettingsSchema.shape[selected].safeParse(draft[selected])
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(' ')); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await api<{ key: ComponentKey; value: ComponentSettings[ComponentKey]; revision: number }>(`/components/${selected}`, {
        method: 'PUT', auth: true, body: { value: parsed.data, revision: saved.revisions[selected] },
      })
      setSaved((current) => current ? { settings: { ...current.settings, [result.key]: result.value }, revisions: { ...current.revisions, [result.key]: result.revision } } : current)
      setDraft((current) => current ? { ...current, [result.key]: result.value } : current)
      invalidateComponentSettings()
      setMessage(`${meta.name} 설정을 저장했습니다. 홈페이지에 반영되었습니다.`)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function reloadSection() {
    setBusy(true); setError(''); setMessage('')
    try {
      const value = await api<ComponentSettingsResponse>('/components')
      setSaved((current) => current ? { settings: { ...current.settings, [selected]: value.settings[selected] }, revisions: { ...current.revisions, [selected]: value.revisions[selected] } } : value)
      setDraft((current) => current ? { ...current, [selected]: value.settings[selected] } : value.settings)
      setSlideIndex(0)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  return <>
    <PageHeader title="컴포넌트 관리" description="홈페이지에서 함께 사용하는 영역을 관리합니다. 컴포넌트별로 저장하면 해당 영역을 사용하는 모든 화면에 반영됩니다." />
    <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
      헤더·푸터의 종류는 <Link className="font-semibold underline" to="/admin/templates">템플릿 관리</Link>, 메뉴 구성은 <Link className="font-semibold underline" to="/admin/menus">메뉴 관리</Link>에서 변경합니다. 여기서는 공통 영역의 내용과 표시 방식을 설정합니다.
    </div>
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="관리할 컴포넌트" className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {COMPONENT_CATALOG.map((item) => <button key={item.key} type="button" disabled={busy} onClick={() => { setParams({ component: item.key }); setMessage(''); setError('') }} aria-current={selected === item.key ? 'page' : undefined}
          className={`rounded-xl border p-5 text-left transition ${selected === item.key ? 'border-brand-500 bg-brand-50 dark:bg-slate-800' : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900'}`}>
          <span className="mb-2 block text-xs text-slate-500">{item.scope}</span>
          <span className="block font-semibold">{item.name}{JSON.stringify(draft[item.key]) !== JSON.stringify(saved.settings[item.key]) && <span className="ml-2 text-xs text-amber-600">수정 중</span>}</span>
          <span className="mt-2 block text-xs leading-5 text-slate-500">{item.description}</span>
        </button>)}
      </nav>
      <section className="card min-w-0 p-5 sm:p-7" aria-label={`${meta.name} 설정`}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5 dark:border-slate-700">
          <div><h2 className="text-xl font-bold">{meta.name}</h2><p className="mt-1 text-sm text-slate-500">{meta.scope} · {sectionDirty ? '저장하지 않은 변경사항' : '저장된 설정'}</p></div>
          <Link to={selected === 'subVisual' && pageKey !== 'custom' ? visualPage.path : meta.path} target="_blank" rel="noopener noreferrer" className="btn-secondary">저장된 화면 보기 ↗</Link>
        </div>
        {error && <ErrorMessage message={error} />}
        {message && <p role="status" className="mb-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}
        <fieldset disabled={busy} className="min-w-0 space-y-6 disabled:opacity-60">
          {selected === 'header' && <>
            <Toggle label="비주얼 위에서 헤더 배경을 투명하게 표시" checked={draft.header.transparent} onChange={(transparent) => update('header', { ...draft.header, transparent })} />
            <Field label="로고 문구"><input className="input" maxLength={80} placeholder="비우면 환경설정의 회사명을 사용합니다" value={draft.header.logoText} onChange={(e) => update('header', { ...draft.header, logoText: e.target.value })} /></Field>
            <ThumbnailInput label="헤더 로고 이미지" value={draft.header.logoImage || null} onChange={(logoImage) => update('header', { ...draft.header, logoImage: logoImage ?? '' })} hint="이미지가 있으면 로고 문구 대신 표시합니다. 비우면 환경설정의 타이틀 이미지를 사용합니다." />
            <Link to="/admin/settings" className="inline-block text-sm text-brand-600 underline">회사명·기본 로고 설정</Link>
          </>}
          {selected === 'footer' && <>
            <Toggle label="푸터 메뉴 표시" checked={draft.footer.showMenu} onChange={(showMenu) => update('footer', { ...draft.footer, showMenu })} />
            <Toggle label="SNS 링크 표시" checked={draft.footer.showSocial} onChange={(showSocial) => update('footer', { ...draft.footer, showSocial })} />
            <p className="text-sm leading-6 text-slate-500">회사 주소·연락처·저작권과 SNS 주소는 <Link className="text-brand-600 underline" to="/admin/settings?tab=company">회사 정보</Link>에서 관리합니다. 이용약관과 개인정보처리방침 링크는 계속 표시됩니다.</p>
          </>}
          {selected === 'mainVisual' && <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Toggle label="슬라이드 자동 재생" checked={draft.mainVisual.autoplay} onChange={(autoplay) => update('mainVisual', { ...draft.mainVisual, autoplay })} />
              <Field label="슬라이드 대기 시간 (초)"><input className="input" type="number" min={2} max={30} step={1} value={draft.mainVisual.interval / 1000} onChange={(e) => update('mainVisual', { ...draft.mainVisual, interval: Number(e.target.value) * 1000 })} /></Field>
            </div>
            <div className="flex flex-wrap gap-2">
              {draft.mainVisual.slides.map((_, i) => <button key={i} type="button" aria-pressed={slideIndex === i} className={slideIndex === i ? 'btn-primary' : 'btn-secondary'} onClick={() => setSlideIndex(i)}>슬라이드 {i + 1}</button>)}
              <button type="button" className="btn-secondary" disabled={draft.mainVisual.slides.length >= 6} onClick={() => { update('mainVisual', { ...draft.mainVisual, slides: [...draft.mainVisual.slides, { title: '새 슬라이드', description: '', image: '' }] }); setSlideIndex(draft.mainVisual.slides.length) }}>+ 추가</button>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" disabled={slideIndex === 0} onClick={() => { const slides = [...draft.mainVisual.slides]; [slides[slideIndex - 1], slides[slideIndex]] = [slides[slideIndex], slides[slideIndex - 1]]; update('mainVisual', { ...draft.mainVisual, slides }); setSlideIndex(slideIndex - 1) }}>앞으로 이동</button>
              <button type="button" className="btn-secondary" disabled={draft.mainVisual.slides.length <= 1} onClick={() => { update('mainVisual', { ...draft.mainVisual, slides: draft.mainVisual.slides.filter((_, i) => i !== slideIndex) }); setSlideIndex(0) }}>이 슬라이드 제거</button>
            </div>
            <Field label="슬라이드 제목 (줄바꿈 가능)"><textarea className="input" rows={2} maxLength={200} value={slide.title} onChange={(e) => changeSlide({ title: e.target.value })} /></Field>
            <Field label="슬라이드 설명 (줄바꿈 가능)"><textarea className="input" rows={3} maxLength={500} value={slide.description} onChange={(e) => changeSlide({ description: e.target.value })} /></Field>
            <ThumbnailInput key={`slide-${slideIndex}`} label="슬라이드 배경 이미지" value={componentImageUrl(slide.image) || null} onChange={(image) => changeSlide({ image: image ?? '' })} />
            <div className="relative overflow-hidden rounded-xl bg-slate-950 px-5 py-14 text-center text-white">
              {slide.image && <img src={componentImageUrl(slide.image)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
              <div className="relative"><p className="mb-4 text-xs">작성 중 미리보기</p><p className="whitespace-pre-line text-xl font-bold">{slide.title}</p><p className="mt-3 whitespace-pre-line text-sm">{slide.description}</p></div>
            </div>
          </>}
          {selected === 'subVisual' && <>
            <Toggle label="소제목 표시" checked={draft.subVisual.showEyebrow} onChange={(showEyebrow) => update('subVisual', { ...draft.subVisual, showEyebrow })} />
            <Field label={`추가 배경 어둡기 ${draft.subVisual.overlayOpacity}%`}><input className="w-full accent-blue-600" type="range" min={0} max={80} value={draft.subVisual.overlayOpacity} onChange={(e) => update('subVisual', { ...draft.subVisual, overlayOpacity: Number(e.target.value) })} /></Field>
            <Field label="설정할 페이지"><select className="input" value={pageKey} onChange={(e) => setPageKey(e.target.value)}>{SUB_VISUAL_PAGES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></Field>
            <Field label="소제목 문구"><input className="input" maxLength={100} value={page.eyebrow} onChange={(e) => changePage({ eyebrow: e.target.value })} /></Field>
            <ThumbnailInput key={pageKey} label="서브 비주얼 배경 이미지" value={componentImageUrl(page.image) || null} onChange={(image) => changePage({ image: image ?? '' })} hint="같은 분류의 상세 페이지에도 반영됩니다. 비우면 기본 이미지를 사용합니다." />
            <p className="text-sm text-slate-500">큰 제목은 각 페이지에서, 현재 위치와 이동 항목은 메뉴 관리에서 정합니다.</p>
          </>}
          {selected === 'breadcrumb' && <>
            <Toggle label="브레드크럼 표시" checked={draft.breadcrumb.visible} onChange={(visible) => update('breadcrumb', { ...draft.breadcrumb, visible })} />
            <Toggle label="홈 아이콘 표시" checked={draft.breadcrumb.showHome} onChange={(showHome) => update('breadcrumb', { ...draft.breadcrumb, showHome })} />
            <p className="text-sm leading-6 text-slate-500">페이지 상단에서 현재 위치를 표시하고 다른 페이지로 이동할 수 있는 영역입니다. 이동 항목은 <Link className="text-brand-600 underline" to="/admin/menus">메뉴 관리</Link>의 사이트맵을 따릅니다.</p>
          </>}
        </fieldset>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" disabled={busy} onClick={() => { update(selected, structuredClone(DEFAULT_COMPONENT_SETTINGS[selected])); setSlideIndex(0) }}>기본값으로 되돌리기</button>
            <button className="btn-secondary" type="button" disabled={busy} onClick={reloadSection}>이 컴포넌트 다시 불러오기</button>
          </div>
          <button className="btn-primary" type="button" disabled={busy || !sectionDirty} onClick={save}>{busy ? '처리 중…' : `${meta.name} 저장`}</button>
        </div>
      </section>
    </div>
  </>
}
