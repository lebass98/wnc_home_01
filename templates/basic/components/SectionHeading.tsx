import Reveal from './Reveal'

/** 각 구역의 제목 — 위에 영문 한 줄, 아래에 굵은 국문 제목이 온다. */
export default function SectionHeading({
  eyebrow,
  title,
  tone = 'light',
  align = 'center',
}: {
  eyebrow: string
  /** 줄바꿈할 위치대로 나눠 넘긴다. */
  title: string[]
  /** 어두운 배경 위에 올릴 때는 dark 를 쓴다. */
  tone?: 'light' | 'dark'
  /** 서브 페이지에서는 왼쪽 정렬로 쓴다. */
  align?: 'center' | 'left'
}) {
  return (
    <div className={align === 'center' ? 'text-center' : 'text-left'}>
      <Reveal>
        <p className="text-[0.95rem] font-medium tracking-wide text-mint-400">{eyebrow}</p>
      </Reveal>
      <h2
        className={`mt-3 text-[1.6rem] font-bold leading-[1.5] tracking-tight sm:text-[1.75rem] ${
          tone === 'dark' ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title.map((line, i) => (
          <Reveal key={line} as="span" index={i + 1} className="block">
            {line}
          </Reveal>
        ))}
      </h2>
    </div>
  )
}
