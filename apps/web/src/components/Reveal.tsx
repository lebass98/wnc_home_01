import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'

/**
 * 화면에 들어오면 아래에서 위로 부드럽게 나타난다.
 * 여러 개를 나란히 둘 때는 index 를 넘겨 순서대로 나오게 한다.
 */
export default function Reveal({
  children,
  /** 순서대로 나오게 할 때의 자리 번호. 0부터 시작한다. */
  index = 0,
  /** 한 칸당 늦추는 시간(ms) */
  step = 110,
  /** 나타나기 시작하는 방향 */
  from = 'bottom',
  as: Tag = 'div',
  className = '',
  style,
}: {
  /** 색 블록처럼 내용 없이 상자만 나타낼 때는 비워 둘 수 있다. */
  children?: ReactNode
  index?: number
  step?: number
  from?: 'bottom' | 'left' | 'right'
  /** 감싸는 태그를 바꾼다. 표의 칸처럼 div 를 못 쓰는 자리에 쓴다. */
  as?: ElementType
  className?: string
  /** 배경 그라데이션처럼 클래스로 못 쓰는 값 */
  style?: CSSProperties
}) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // 움직임을 줄이도록 설정한 사용자에게는 애니메이션 없이 바로 보여준다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    // 관찰 기능이 없는 환경에서도 내용은 보여야 한다.
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // 한 번 나타난 뒤에는 다시 감추지 않는다.
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      // 아래쪽에서 조금 올라왔을 때 시작해 자연스럽게 보이도록 한다.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const hidden =
    from === 'left' ? '-translate-x-6 opacity-0' : from === 'right' ? 'translate-x-6 opacity-0' : 'translate-y-7 opacity-0'

  return (
    <Tag
      ref={ref}
      style={{ ...style, transitionDelay: shown ? `${index * step}ms` : '0ms' }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        shown ? 'translate-x-0 translate-y-0 opacity-100' : hidden
      } ${className}`}
    >
      {children}
    </Tag>
  )
}
