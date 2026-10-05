import { useEffect, useState, type FormEvent } from 'react'
import type { RedirectInput, RedirectRule } from '@wnc/shared'
import { api } from '../../lib/api'
import { invalidateRedirects } from '../../lib/redirects'
import { formatStamp } from '../../lib/format'
import { EmptyState, ErrorMessage, Loading, PageHeader, ToggleSwitch } from '../../components/ui'

/**
 * 리디렉션 — 홈페이지 주소를 바꿨을 때 옛 주소로 들어온 방문자를 새 주소로 넘긴다.
 * 검색 엔진에 쌓인 순위와 다른 곳에 걸린 링크를 지킬 수 있다.
 */

const EMPTY: RedirectInput = { fromPath: '', toUrl: '', code: 301, enabled: true, note: '' }

export default function RedirectsPage() {
  const [rows, setRows] = useState<RedirectRule[] | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<RedirectInput>(EMPTY)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    api<RedirectRule[]>('/redirects', { auth: true })
      .then((r) => {
        setRows(r)
        setError('')
      })
      .catch((e: Error) => setError(e.message))
  }
  useEffect(load, [])

  const set = <K extends keyof RedirectInput>(key: K, value: RedirectInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  function startEdit(rule: RedirectRule) {
    setEditingId(rule.id)
    setForm({ fromPath: rule.fromPath, toUrl: rule.toUrl, code: rule.code, enabled: rule.enabled, note: rule.note })
    setFormError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY)
    setFormError('')
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      if (editingId) await api(`/redirects/${editingId}`, { method: 'PUT', body: form, auth: true })
      else await api('/redirects', { method: 'POST', body: form, auth: true })
      invalidateRedirects()
      cancelEdit()
      load()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(rule: RedirectRule) {
    try {
      await api(`/redirects/${rule.id}`, { method: 'PUT', body: { ...rule, enabled: !rule.enabled }, auth: true })
      invalidateRedirects()
      load()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  async function remove(rule: RedirectRule) {
    if (!confirm(`'${rule.fromPath}' 리디렉션을 삭제할까요?\n삭제하면 옛 주소로 들어온 방문자는 홈으로 갑니다.`)) return
    try {
      await api(`/redirects/${rule.id}`, { method: 'DELETE', auth: true })
      invalidateRedirects()
      if (editingId === rule.id) cancelEdit()
      load()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title="리디렉션"
        description="바뀐 주소로 방문자를 넘깁니다. 주소를 바꿔도 검색 순위와 다른 곳에 걸린 링크가 그대로 살아납니다."
      />

      {/* 추가·수정 */}
      <form onSubmit={save} className="card mb-6 p-5">
        <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{editingId ? '리디렉션 수정' : '새 리디렉션'}</p>
        {formError && (
          <div className="mb-4">
            <ErrorMessage message={formError} />
          </div>
        )}
        <div className="grid items-end gap-3 lg:grid-cols-[1fr_auto_1fr_9rem]">
          <div>
            <label htmlFor="fromPath" className="label">
              옛 주소 <span className="text-red-500">*</span>
            </label>
            <input
              id="fromPath"
              value={form.fromPath}
              onChange={(e) => set('fromPath', e.target.value)}
              className="input"
              placeholder="/old-page"
              required
            />
          </div>
          <span className="hidden pb-3 text-slate-400 lg:block" aria-hidden>
            →
          </span>
          <div>
            <label htmlFor="toUrl" className="label">
              새 주소 <span className="text-red-500">*</span>
            </label>
            <input
              id="toUrl"
              value={form.toUrl}
              onChange={(e) => set('toUrl', e.target.value)}
              className="input"
              placeholder="/new-page 또는 https://…"
              required
            />
          </div>
          <div>
            <label htmlFor="code" className="label">
              종류
            </label>
            <select id="code" value={form.code} onChange={(e) => set('code', Number(e.target.value) as 301 | 302)} className="select">
              <option value={301}>301 영구 이동</option>
              <option value={302}>302 임시 이동</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="note" className="label">
              메모
            </label>
            <input id="note" value={form.note} maxLength={200} onChange={(e) => set('note', e.target.value)} className="input" placeholder="예: 2026년 10월 회사소개 주소 변경" />
          </div>
          <div className="flex gap-2">
            {editingId && (
              <button type="button" onClick={cancelEdit} className="btn-secondary">
                취소
              </button>
            )}
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '저장 중…' : editingId ? '수정 저장' : '추가'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          301 은 주소가 완전히 바뀌었을 때 씁니다 — 검색 엔진이 새 주소로 순위를 옮깁니다. 행사 기간처럼 잠시만 넘길 때는 302 를 씁니다.
          주소 끝의 / 와 ?뒤 값은 무시하고 비교합니다.
        </p>
      </form>

      <div className="card overflow-hidden">
        {error && (
          <div className="p-4">
            <ErrorMessage message={error} />
          </div>
        )}
        {!rows ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState label="등록된 리디렉션이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <th className="px-4 py-3">옛 주소</th>
                  <th className="px-4 py-3">새 주소</th>
                  <th className="px-4 py-3">종류</th>
                  <th className="px-4 py-3 text-right">이용</th>
                  <th className="px-4 py-3">마지막 이용</th>
                  <th className="px-4 py-3">사용</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {rows.map((rule) => (
                  <tr key={rule.id} className={`align-middle ${rule.enabled ? '' : 'opacity-60'} hover:bg-slate-50 dark:hover:bg-slate-700/50`}>
                    <td className="max-w-[16rem] px-4 py-3">
                      <a
                        href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}${rule.fromPath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="새 창에서 넘겨지는지 확인"
                        className="block truncate font-mono text-[13px] text-slate-900 hover:text-brand-600 dark:text-slate-100"
                      >
                        {rule.fromPath}
                      </a>
                      {rule.note && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{rule.note}</p>}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-3 font-mono text-[13px] text-slate-600 dark:text-slate-300">{rule.toUrl}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">{rule.code === 301 ? '301 영구' : '302 임시'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{rule.hits}회</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">{rule.lastHitAt ? formatStamp(rule.lastHitAt) : '—'}</td>
                    <td className="px-4 py-3">
                      <ToggleSwitch checked={rule.enabled} onChange={() => toggle(rule)} label={`${rule.fromPath} 사용`} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button type="button" onClick={() => startEdit(rule)} className="btn-secondary px-3 py-1.5 text-xs">
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(rule)}
                        className="ml-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
