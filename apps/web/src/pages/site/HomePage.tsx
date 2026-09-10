import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { componentImageUrl, useComponentSettings } from '../../lib/componentSettings'
import { usePageTitle } from '../../lib/seo'
import Reveal from '../../components/Reveal'

const asset = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`

/** 실적 요약 — 흰 카드 세 장 */
const STATS = [
  { title: '다양한 분야의 프로젝트 수행 경험', value: 178, no: '01' },
  { title: '축적된 설계 및 시공 노하우', value: 26, no: '02' },
  { title: '고객 만족 중심의 프로젝트 관리', value: 93, no: '03' },
]

/** 진행 절차 — 어두운 구역의 가로 스크롤 카드. flip 이면 사진이 제목 위로 온다. */
const PROCESS = [
  {
    title: '상담·실측',
    image: '/images/interior/process-consulting.png',
    desc: '좋은 공간은 취향을 묻는 대화에서 시작됩니다. 워드앤코드는 눈에 보이는 치수뿐 아니라\n가족의 생활 방식과 공간 속 불편까지 세심하게 읽어냅니다.',
    flip: false,
  },
  {
    title: '설계·견적',
    image: '/images/interior/process-design.png',
    desc: '보기 좋은 공간이 실제 생활에도 편안하도록 동선과 디자인, 자재와 예산을 균형 있게 조율합니다.\n막연하던 바람을 오래 머물고 싶은 공간의 설계로 구체화합니다.',
    flip: true,
  },
  {
    title: '시공·품질관리',
    image: '/images/interior/process-construction.png',
    desc: '좋은 디자인의 완성은 보이지 않는 디테일에서 결정됩니다.\n도면의 의도가 현장에서 흐트러지지 않도록 공정마다 꼼꼼히 확인하며 완성도를 높입니다.',
    flip: false,
  },
  {
    title: '준공·사후관리',
    image: '/images/interior/process-aftercare.png',
    desc: '공사가 끝나는 순간은 새로운 일상이 시작되는 시간입니다. 완성된 공간을 함께 살피고,\n오래 편안하게 사용할 수 있도록 그 이후까지 세심하게 이어갑니다.',
    flip: true,
  },
]

/** 스타일 갤러리 — 세로 사진 네 장, 어긋난 배치(위 여백 px) */
const STYLES = [
  { label: 'Warm Comfort', image: '/images/interior/style-warm-comfort.png', offset: 90 },
  { label: 'mordern', image: '/images/interior/style-modern.png', offset: 0 },
  { label: 'minimalist wood', image: '/images/interior/style-minimalist-wood.png', offset: 279 },
  { label: 'smart practical', image: '/images/interior/style-smart-practical.png', offset: 0 },
]

/** 포트폴리오 — 글·사진이 번갈아 놓인다 */
const PORTFOLIO = [
  {
    no: 'Portfolio 1',
    title: '도시의 풍경, 집 안의 여정',
    year: '2026',
    desc: '창 너머 도시의 풍경을 이어받고, 집 안에는 차분한 온기를 더한 모던 주거공간입니다.\n아이보리 패브릭과 우드 마감, 부드러운 곡선의 가구가 어우러져 세련되면서도 편안한 분위기를\n만듭니다. 바쁜 하루를 지나 돌아왔을 때, 자연스럽게 긴장이 풀리는 거실을 제안합니다.',
    location: '서울특별시 영등포구',
    size: '45py',
    keyword: 'Warm modern',
    image: '/images/interior/portfolio-city-view.png',
  },
  {
    no: 'Portfolio 2',
    title: '한강을 바라보는 느긋한 일상',
    year: '2026',
    desc: '한강의 풍경과 오후의 햇살이 일상의 배경이 되는 공간입니다. 낮은 가구와 절제된 색으로\n시야를 열고, 우드의 자연스러운 질감으로 편안함을 더했습니다.\n풍경을 감상하는 순간부터 가족이 함께 머무는 시간까지, 집에서 보내는 하루의 여유를 담았습니다.',
    location: '서울특별시 용산구',
    size: '33py',
    keyword: 'Natural comfort',
    image: '/images/interior/portfolio-hangang.png',
  },
  {
    no: 'Portfolio 3',
    title: '아이의 오늘과 내일을 함께 만들어 갈 곳',
    year: '2025',
    desc: '편안한 잠과 호기심을 펼치며, 스스로 정리하는 일상까지 생각한 아이방입니다.\n침대와 책상, 수납을 성장 연령에 맞게 배치하고 차분한 우드와 은은한 색감으로 안정감을\n더했습니다. 과한 장식 대신 생활에 필요한 요소를 담아, 아이가 자라면서도 편안하게 사용할 수 있는\n공간을 제안합니다.',
    location: '경기도 광명시',
    size: '24py',
    keyword: 'Kids minimal',
    image: '/images/interior/portfolio-kids-room.png',
  },
]

/** 문의 폼의 밑줄 입력칸 */
function UnderlineInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-[30px] w-full border-b border-[#a99d93] bg-transparent text-base text-white outline-none placeholder:text-white/40 focus:border-white ${props.className ?? ''}`}
    />
  )
}

/**
 * 빠른 문의 — CTA 구역의 유리 카드. 실제 문의 접수(/contacts)로 저장돼
 * 관리자 [문의 관리]에서 확인할 수 있다.
 */
function QuickContactForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState(['', '', ''])
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [kind, setKind] = useState('주거 공간')
  const [agree, setAgree] = useState(false)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!agree) {
      setError('개인정보 수집/이용에 동의해 주세요.')
      return
    }
    setSending(true)
    setError('')
    try {
      await api('/contacts', {
        method: 'POST',
        body: {
          name,
          email,
          phone: phone.filter(Boolean).join('-'),
          message: `[빠른 문의 · ${kind}]\n시공 예정 주소: ${address}`,
        },
      })
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-[409px] rounded-[30px] border border-white bg-white/15 p-10 text-white backdrop-blur-sm">
        <p className="font-serif-kr text-2xl">문의가 접수되었습니다</p>
        <p className="mt-4 text-sm leading-6 text-white/80">
          담당자가 확인 후 남겨 주신 연락처로
          <br />
          빠르게 연락드리겠습니다.
        </p>
      </div>
    )
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <span className="text-base font-medium text-white">
      {children}
      <span className="text-[#e8b48c]">*</span>
    </span>
  )

  return (
    <form onSubmit={submit} className="w-full max-w-[409px] rounded-[30px] border border-white bg-white/15 px-8 py-8 backdrop-blur-sm sm:px-10">
      <div className="space-y-4">
        <label className="block space-y-1">
          <Label>성함 혹은 업체명</Label>
          <UnderlineInput required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="block space-y-1 pt-2">
          <Label>연락처</Label>
          <span className="flex items-end gap-[5px]">
            {phone.map((part, i) => (
              <span key={i} className="flex flex-1 items-end gap-[5px]">
                {i > 0 && <span className="pb-0.5 text-[#a99d93]">-</span>}
                <UnderlineInput
                  required
                  inputMode="numeric"
                  maxLength={4}
                  value={part}
                  aria-label={`연락처 ${i + 1}번째 칸`}
                  onChange={(e) => setPhone((prev) => prev.map((v, j) => (j === i ? e.target.value.replace(/\D/g, '') : v)))}
                />
              </span>
            ))}
          </span>
        </label>

        <label className="block space-y-1 pt-2">
          <Label>이메일</Label>
          <UnderlineInput required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="block space-y-1 pt-2">
          <Label>시공 예정 주소</Label>
          <UnderlineInput required maxLength={120} value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>

        <fieldset className="pt-2">
          <legend className="text-base font-medium text-white">
            서비스 유형<span className="text-[#e8b48c]">*</span>
          </legend>
          <div className="mt-2 flex gap-2">
            {['주거 공간', '상업 공간'].map((option) => (
              <label key={option} className="flex w-[142px] cursor-pointer items-center gap-1.5 text-base text-white">
                <input
                  type="radio"
                  name="service-kind"
                  checked={kind === option}
                  onChange={() => setKind(option)}
                  className="h-4 w-4 accent-[#676057]"
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {error && <p className="mt-4 text-sm text-[#ffd9c2]">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="mt-6 h-[47px] w-full rounded-md bg-[#676057]/90 text-lg font-bold text-white transition hover:bg-[#676057] disabled:opacity-60"
      >
        {sending ? '접수 중…' : '문의하기'}
      </button>

      <div className="mt-3 flex items-center justify-between text-sm text-[#ccc5bb]">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4 rounded accent-[#676057]" />
          개인정보 수집/이용 동의
        </label>
        <Link to="/privacy" className="underline-offset-2 transition hover:text-white hover:underline">
          [전문 보기]
        </Link>
      </div>
    </form>
  )
}

/**
 * 인테리어 메인 — 따뜻한 베이지 톤의 원페이지형 홈.
 * 히어로(둥근 사진) → 슬로건 → 실적 → 진행 절차(어두운 띠) → 스타일 갤러리
 * → 포트폴리오 → 빠른 문의(배경 사진 + 유리 폼) 순서로 흐른다.
 */
export default function HomePage() {
  usePageTitle(null)
  const { mainVisual } = useComponentSettings()
  // 히어로 사진은 [컴포넌트 관리 > 메인 비주얼]의 첫 슬라이드를 따른다 — 비어 있으면 기본 사진.
  const heroImage = componentImageUrl(mainVisual.slides[0]?.image || '') || asset('/images/interior/hero-main.png')

  return (
    <div className="bg-[#f7f4ef] text-[#241e12]">
      {/* ── 히어로: 둥근 모서리 사진 한 장, 가운데 세리프 문패 ── */}
      <section className="px-3 pb-0 pt-3 sm:px-6 sm:pt-6 lg:px-10 lg:pt-10">
        <div className="relative mx-auto max-w-[1840px] overflow-hidden rounded-[28px]">
          <img src={heroImage} alt="" className="h-[70vh] min-h-[420px] w-full object-cover sm:h-[81vh]" />
          {/* 좌상단 로고 판 — 시안처럼 흰 바탕 그림을 모서리에 붙인다 */}
          <img src={asset('/images/interior/logo-header.png')} alt="WORD&CODE" className="absolute left-0 top-0 w-[200px] sm:w-[328px]" />
          {/* 가운데 문패 — 이름 위에 주황 리본이 삐딱하게 얹힌다 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Reveal className="relative">
              <span className="absolute -top-10 left-1/2 w-max -translate-x-[18%] rounded bg-[#ed6e1f] px-2.5 py-0.5 font-serif-kr text-lg text-white sm:-top-11 sm:text-[26px]">
                오늘을 완성하는 인테리어
              </span>
              <h1 className="font-serif-kr text-center text-3xl text-[#171614] sm:text-4xl">워드앤코드 인테리어</h1>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 슬로건: 가운데 사진 좌우로 자간 넓은 세리프 글줄 ── */}
      <section className="relative mx-auto max-w-[1840px] px-6 py-24 sm:py-40 lg:px-[13%] lg:py-56">
        <img
          src={asset('/images/interior/slogan-living.png')}
          alt="도시가 보이는 거실"
          className="absolute left-1/2 top-1/2 w-[70%] max-w-[852px] -translate-x-1/2 -translate-y-1/2 rounded-2xl object-cover"
        />
        <div className="relative flex h-[220px] items-start justify-between sm:h-[327px]">
          <p className="font-serif-kr text-lg font-semibold leading-[1.7] tracking-[12px] text-[#7d9dd9] mix-blend-difference sm:text-[28px] sm:tracking-[24px]">
            삶의 공간을
          </p>
          <p className="self-end font-serif-kr text-lg font-semibold leading-[1.7] tracking-[12px] text-[#4b5b77] mix-blend-difference sm:text-[28px] sm:tracking-[24px]">
            실제로 구현하는
          </p>
        </div>
      </section>

      {/* ── 실적: 흰 카드 세 장 ── */}
      <section className="mx-auto grid max-w-[1840px] gap-8 px-6 pb-32 sm:px-10 lg:grid-cols-3 lg:gap-[60px] lg:px-20 lg:pb-40">
        {STATS.map((stat, i) => (
          <Reveal key={stat.no} index={i} className="rounded-2xl bg-white p-10">
            <p className="flex items-center gap-[15px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#434140]" aria-hidden />
              <span className="text-[22px] font-bold tracking-tight text-[#434140]">{stat.title}</span>
            </p>
            <p className="flex items-center justify-center py-8 pl-4 text-[#7a6759]">
              <span className="text-[90px] leading-none xl:text-[120px]">{stat.value}</span>
              <span className="text-5xl leading-none xl:text-6xl">+</span>
            </p>
            <p className="font-serif-kr text-[22px] font-extralight text-[#7a6759]">{stat.no}</p>
          </Reveal>
        ))}
      </section>

      {/* ── 진행 절차: 어두운 띠, 가로로 넘겨 보는 네 단계 ── */}
      <section className="bg-[#241d12] py-24">
        <div className="flex snap-x gap-[60px] overflow-x-auto px-6 pb-4 sm:px-10 lg:gap-[100px] lg:px-[168px] xl:pl-[168px]">
          {PROCESS.map((step) => (
            <div key={step.title} className="w-[420px] shrink-0 snap-start space-y-6 sm:w-[614px]">
              {!step.flip && <h3 className="pt-5 font-serif-kr text-[26px] text-white sm:text-[32px]">{step.title}</h3>}
              <img src={asset(step.image)} alt="" className="h-[320px] w-full rounded-2xl object-cover sm:h-[461px]" />
              {step.flip && <h3 className="pt-1 font-serif-kr text-[26px] text-white sm:text-[32px]">{step.title}</h3>}
              <p className="whitespace-pre-line text-base leading-normal tracking-tight text-white/90">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 스타일 갤러리: 어긋나게 놓인 세로 사진 네 장 ── */}
      <section className="mx-auto max-w-[1840px] px-6 py-24 sm:px-10 lg:px-20 lg:py-32">
        <div className="mb-14 flex flex-col justify-between gap-8 lg:mb-0 lg:flex-row-reverse">
          <Reveal>
            <h2 className="font-serif-kr text-[26px] leading-snug sm:text-[32px] lg:text-right">
              당신의 취향이 오롯이
              <br />
              드러나는 공간
            </h2>
          </Reveal>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STYLES.map((style, i) => (
            <Reveal key={style.label} index={i}>
              <div className="relative overflow-hidden rounded-2xl" style={{ marginTop: `${style.offset / 2}px` }}>
                <img src={asset(style.image)} alt={style.label} className="h-[340px] w-full object-cover opacity-[0.83] sm:h-[600px]" />
                <p className="absolute bottom-10 left-1/2 -translate-x-1/2 font-serif-kr text-base text-white">{style.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-12 text-base leading-normal tracking-tight text-[#6a6a6a] lg:-mt-10 lg:ml-[26%]">
          워드앤코드 인테리어는
          <br />
          공간의 용도와 가족 구성원, 생활 동선을 면밀히 파악하고,
          <br />
          고객의 취향이 세심하게 빛나도록 공간을 디자인합니다.
        </p>
      </section>

      {/* ── 포트폴리오 ── */}
      <section className="mx-auto max-w-[1840px] px-6 pb-24 pt-8 sm:px-10 lg:px-20">
        <Reveal className="pb-16 text-center lg:pb-24">
          <h2 className="font-serif-kr text-[26px] sm:text-[32px]">일상을 읽고, 공간을 설계합니다.</h2>
          <p className="mt-4 text-base tracking-tight text-[#6a6a6a]">내 취향을 담은 나만의 공간을, 생활에 맞춰 편안하게.</p>
        </Reveal>

        <div className="overflow-hidden rounded-[32px] bg-white">
          {PORTFOLIO.map((work, i) => (
            <div
              key={work.no}
              className={`flex flex-col gap-10 px-8 py-14 sm:px-14 lg:flex-row lg:items-start lg:justify-between lg:px-[88px] lg:py-[92px] ${
                i < PORTFOLIO.length - 1 ? 'border-b border-[#ebebeb]' : ''
              } ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
            >
              <div className="flex min-h-[369px] max-w-[625px] flex-col justify-between gap-8 pt-2">
                <div>
                  <p className="text-base text-[#8f784b]">{work.no}</p>
                  <h3 className="pt-5 font-serif-kr text-[26px] font-medium text-[#1f1f1f] sm:text-[32px]">{work.title}</h3>
                  <p className="pt-6 text-base font-medium text-[#1f1f1f]">{work.year}</p>
                </div>
                <p className="whitespace-pre-line text-base leading-[1.6] tracking-tight text-[#6a6a6a]">{work.desc}</p>
                <dl className="flex gap-14 sm:gap-20">
                  {[
                    ['Location', work.location],
                    ['Size', work.size],
                    ['Keyword', work.keyword],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-base text-[#7a6759]">{label}</dt>
                      <dd className="pt-2 text-base font-medium text-[#1f1f1f]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <img src={asset(work.image)} alt={work.title} className="h-[240px] w-full rounded-2xl object-cover sm:h-[369px] lg:w-[872px] lg:max-w-[48vw]" />
            </div>
          ))}
        </div>

        <div className="flex justify-center py-10">
          <Link
            to="/products"
            className="flex items-center gap-2 rounded-[50px] bg-[#676057] px-[18px] py-3 text-[15px] font-light tracking-tight text-white shadow-[3px_7px_10px_rgba(48,41,34,0.15)] transition hover:bg-[#54493d]"
          >
            view more
            <span className="h-[5px] w-[5px] rounded-full bg-white" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ── 빠른 문의: 배경 사진 위 유리 폼 ── */}
      <section
        className="relative flex min-h-[919px] flex-col justify-between px-6 py-24 sm:px-10 lg:px-[168px] lg:py-[120px]"
        style={{ background: `url(${asset('/images/interior/contact-bg.png')}) center / cover no-repeat` }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/45 to-transparent" aria-hidden />
        <Reveal className="relative pl-2">
          <h2 className="font-serif-kr text-[24px] text-white sm:text-[28px]">워드앤코드 인테리어만의 특별함</h2>
          <p className="pt-6 text-base leading-6 text-[#f7f4ef]">
            워드앤코드 인테리어는 고객님들의 취향을 반영하기 위한
            <br />
            맞춤형 디자인 프로세스로 상담을 진행하고 있습니다.
          </p>
        </Reveal>
        <div className="relative mt-14">
          <QuickContactForm />
        </div>
      </section>
    </div>
  )
}
