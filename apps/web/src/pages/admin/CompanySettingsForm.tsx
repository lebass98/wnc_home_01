import { useState, type FormEvent, type ReactNode } from 'react'
import type { Branch, CompanySettingInput, SiteSetting } from '@wnc/shared'
import { api } from '../../lib/api'
import { invalidateSiteSetting } from '../../lib/seo'
import { ErrorMessage } from '../../components/ui'

/**
 * 환경설정 > 회사 정보.
 * 여기서 저장한 값은 홈페이지 푸터 · 문의하기 연락처 · 찾아오시는 길(지도·본사·지점)에 바로 반영된다.
 * 코드를 고치지 않고 주소·전화·SNS 를 바꿀 수 있도록 한 곳에 모아 둔다.
 */

const EMPTY_BRANCH: Branch = { name: '', phone: '', email: '', address: '' }

/** 라벨 + 설명 + 입력을 한 줄로. 다른 관리 화면과 같은 형태다. */
function Row({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-start dark:border-slate-700">
      <div className="sm:w-56 sm:shrink-0 sm:pt-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

/** 카드 제목 — 어느 화면에 보이는 값인지 함께 적어 둔다. */
function CardTitle({ title, where }: { title: string; where: string }) {
  return (
    <div className="border-b border-slate-100 pb-4 dark:border-slate-700">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{where}</p>
    </div>
  )
}

function toInput(s: SiteSetting): CompanySettingInput {
  return {
    companyName: s.companyName,
    companyNameEn: s.companyNameEn,
    ceo: s.ceo,
    bizNo: s.bizNo,
    zipCode: s.zipCode,
    address: s.address,
    tel: s.tel,
    fax: s.fax,
    email: s.email,
    hours: s.hours,
    since: s.since,
    copyright: s.copyright,
    mapQuery: s.mapQuery,
    directionsGuide: s.directionsGuide,
    snsFacebook: s.snsFacebook,
    snsYoutube: s.snsYoutube,
    snsBlog: s.snsBlog,
    snsInstagram: s.snsInstagram,
    branches: s.branches.map((b) => ({ ...b })),
  }
}

export default function CompanySettingsForm({ setting }: { setting: SiteSetting }) {
  const [form, setForm] = useState<CompanySettingInput>(() => toInput(setting))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function set<K extends keyof CompanySettingInput>(key: K, value: CompanySettingInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setNotice('')
  }

  function setBranch(index: number, key: keyof Branch, value: string) {
    setForm((prev) => ({
      ...prev,
      branches: prev.branches.map((b, i) => (i === index ? { ...b, [key]: value } : b)),
    }))
    setNotice('')
  }

  function addBranch() {
    set('branches', [...form.branches, { ...EMPTY_BRANCH }])
  }

  function removeBranch(index: number) {
    const b = form.branches[index]
    if ((b.name || b.address) && !confirm(`'${b.name || '이름 없는 지점'}' 을(를) 목록에서 뺄까요?\n저장을 눌러야 실제로 반영됩니다.`)) return
    set(
      'branches',
      form.branches.filter((_, i) => i !== index),
    )
  }

  function moveBranch(index: number, dir: -1 | 1) {
    const next = [...form.branches]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    set('branches', next)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.companyName.trim()) {
      setError('회사명을 입력하세요. 찾아오시는 길 제목에 그대로 보입니다.')
      return
    }
    const emptyBranch = form.branches.findIndex((b) => !b.name.trim())
    if (emptyBranch >= 0) {
      setError(`${emptyBranch + 1}번째 지점의 이름이 비어 있습니다. 이름을 넣거나 지점을 삭제하세요.`)
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await api<SiteSetting>('/settings/company', {
        method: 'PUT',
        body: { ...form, branches: form.branches.map((b) => ({ ...b })) },
        auth: true,
      })
      setForm(toInput(saved))
      invalidateSiteSetting()
      setNotice('회사 정보를 저장했습니다. 홈페이지 푸터·문의하기·찾아오시는 길에 반영됩니다.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const year = new Date().getFullYear()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorMessage message={error} />}
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>
      )}

      {/* 기본 정보 */}
      <div className="card px-6 py-5">
        <CardTitle title="기본 정보" where="푸터 회사 정보 · 찾아오시는 길 제목" />
        <div className="mt-2">
          <Row label="회사명" description="찾아오시는 길의 '○○ 본사' 같은 제목에 쓰입니다.">
            <input
              value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              className="input max-w-md"
              maxLength={100}
              required
            />
          </Row>
          <Row label="영문 회사명" description="푸터 맨 위 로고 글자입니다.">
            <input
              value={form.companyNameEn}
              onChange={(e) => set('companyNameEn', e.target.value)}
              className="input max-w-md"
              maxLength={100}
              placeholder="WORDNCODE"
            />
          </Row>
          <Row label="대표자" description="비우면 푸터에 보이지 않습니다.">
            <input value={form.ceo} onChange={(e) => set('ceo', e.target.value)} className="input max-w-xs" maxLength={100} />
          </Row>
          <Row label="사업자등록번호" description="비우면 푸터에 보이지 않습니다.">
            <input
              value={form.bizNo}
              onChange={(e) => set('bizNo', e.target.value)}
              className="input max-w-xs tabular-nums"
              maxLength={50}
              placeholder="000-00-00000"
            />
          </Row>
        </div>
      </div>

      {/* 연락처 */}
      <div className="card px-6 py-5">
        <CardTitle title="주소 · 연락처" where="푸터 · 문의하기 연락처 · 찾아오시는 길 본사" />
        <div className="mt-2">
          <Row label="주소" description="우편번호는 대괄호로 묶여 주소 앞에 붙습니다.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={form.zipCode}
                onChange={(e) => set('zipCode', e.target.value)}
                className="input tabular-nums sm:w-28"
                maxLength={20}
                placeholder="우편번호"
                aria-label="우편번호"
              />
              <input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                className="input flex-1"
                maxLength={300}
                placeholder="도로명 주소와 상세 주소"
                aria-label="주소"
              />
            </div>
          </Row>
          <Row label="전화" description="찾아오시는 길에는 크게 보입니다.">
            <input
              value={form.tel}
              onChange={(e) => set('tel', e.target.value)}
              className="input max-w-xs tabular-nums"
              maxLength={50}
              placeholder="02-0000-0000"
            />
          </Row>
          <Row label="팩스">
            <input
              value={form.fax}
              onChange={(e) => set('fax', e.target.value)}
              className="input max-w-xs tabular-nums"
              maxLength={50}
            />
          </Row>
          <Row label="대표 이메일" description="푸터와 문의하기 연락처에 보입니다.">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="input max-w-md"
              maxLength={200}
            />
          </Row>
          <Row label="업무시간" description="문의하기 연락처의 HOURS 항목입니다. 줄바꿈하면 여러 줄로 보입니다.">
            <textarea
              value={form.hours}
              onChange={(e) => set('hours', e.target.value)}
              className="input min-h-[5rem] max-w-md resize-y"
              maxLength={500}
              placeholder={'평일 09:00 - 18:00\n점심 12:00 - 13:00 · 주말·공휴일 휴무'}
            />
          </Row>
        </div>
      </div>

      {/* 저작권 */}
      <div className="card px-6 py-5">
        <CardTitle title="저작권 문구" where="푸터 맨 아래" />
        <div className="mt-2">
          <Row label="설립연도" description="저작권 문구의 시작 연도입니다.">
            <input
              value={form.since}
              onChange={(e) => set('since', e.target.value)}
              className="input w-28 tabular-nums"
              maxLength={10}
              placeholder="2003"
            />
          </Row>
          <Row label="저작권 문구" description="앞에 '설립연도-올해' 가 자동으로 붙습니다.">
            <input
              value={form.copyright}
              onChange={(e) => set('copyright', e.target.value)}
              className="input max-w-md"
              maxLength={200}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              미리보기:{' '}
              <span className="tabular-nums text-slate-700 dark:text-slate-300">
                {form.since && `${form.since}-`}
                {year} {form.copyright}
              </span>
            </p>
          </Row>
        </div>
      </div>

      {/* 찾아오시는 길 */}
      <div className="card px-6 py-5">
        <CardTitle title="찾아오시는 길" where="회사소개 > 찾아오시는 길의 지도 · 본사 안내 · 지점" />
        <div className="mt-2">
          <Row label="지도 검색어" description="구글 지도에 표시할 위치입니다. 비우면 위 주소를 씁니다.">
            <input
              value={form.mapQuery}
              onChange={(e) => set('mapQuery', e.target.value)}
              className="input max-w-md"
              maxLength={300}
              placeholder="서울 금천구 벚꽃로 298"
            />
          </Row>
          <Row label="본사 안내" description="전화번호·주소 아래에 보이는 교통·주차 안내입니다.">
            <textarea
              value={form.directionsGuide}
              onChange={(e) => set('directionsGuide', e.target.value)}
              className="input min-h-[6rem] resize-y"
              maxLength={1000}
            />
          </Row>
          <Row label="지점" description="본사 아래 목록으로 보입니다. 없으면 구역 자체가 감춰집니다.">
            <div className="space-y-3">
              {form.branches.length === 0 && (
                <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                  등록된 지점이 없습니다. 아래 '지점 추가'로 넣을 수 있습니다.
                </p>
              )}
              {form.branches.map((b, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">지점 {i + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBranch(i, -1)}
                        disabled={i === 0}
                        className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
                        aria-label="위로"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBranch(i, 1)}
                        disabled={i === form.branches.length - 1}
                        className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBranch(i)}
                        className="btn-secondary px-2 py-1 text-xs text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={b.name}
                      onChange={(e) => setBranch(i, 'name', e.target.value)}
                      className="input"
                      maxLength={100}
                      placeholder="지점 이름 (예: 워드앤코드 판교 지점)"
                      aria-label={`지점 ${i + 1} 이름`}
                    />
                    <input
                      value={b.phone}
                      onChange={(e) => setBranch(i, 'phone', e.target.value)}
                      className="input tabular-nums"
                      maxLength={50}
                      placeholder="연락처"
                      aria-label={`지점 ${i + 1} 연락처`}
                    />
                    <input
                      value={b.email}
                      onChange={(e) => setBranch(i, 'email', e.target.value)}
                      className="input"
                      maxLength={200}
                      placeholder="이메일"
                      aria-label={`지점 ${i + 1} 이메일`}
                    />
                    <input
                      value={b.address}
                      onChange={(e) => setBranch(i, 'address', e.target.value)}
                      className="input"
                      maxLength={300}
                      placeholder="주소"
                      aria-label={`지점 ${i + 1} 주소`}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addBranch}
                disabled={form.branches.length >= 20}
                className="btn-secondary text-sm"
              >
                + 지점 추가
              </button>
            </div>
          </Row>
        </div>
      </div>

      {/* SNS */}
      <div className="card px-6 py-5">
        <CardTitle title="SNS" where="푸터 아이콘 — 주소를 넣은 것만 보입니다" />
        <div className="mt-2">
          {(
            [
              ['snsInstagram', '인스타그램', 'https://www.instagram.com/…'],
              ['snsFacebook', '페이스북', 'https://www.facebook.com/…'],
              ['snsYoutube', '유튜브', 'https://www.youtube.com/@…'],
              ['snsBlog', '블로그', 'https://blog.naver.com/…'],
            ] as const
          ).map(([key, label, placeholder]) => (
            <Row key={key} label={label}>
              <input
                type="url"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className="input max-w-md"
                maxLength={300}
                placeholder={placeholder}
              />
            </Row>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}
