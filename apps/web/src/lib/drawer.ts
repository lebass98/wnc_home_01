import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * 옆에서 밀려 들어오는 판의 여닫이 상태.
 *
 * - mounted  DOM 에 붙어 있는지 — 닫는 동작이 다 보인 뒤에 떼어 낸다.
 * - shown    제자리에 와 있는지 — false 면 화면 밖(오른쪽)에 있다.
 * - panelRef 밀려 들어오는 요소에 달아 준다.
 *
 * 판을 붙인 '한 프레임 뒤'에 여는 방식(requestAnimationFrame)은
 * 브라우저가 시작 위치를 그리기 전에 클래스가 바뀌어 버리면
 * 전환 없이 완성 위치로 바로 나타난다(팍 켜짐). 그래서 프레임을 기다리는 대신,
 * 판이 붙은 직후 위치를 강제로 계산시켜(reflow) 시작 위치를 확정한 뒤 연다.
 * 이 방식은 기기·프레임 사정과 무관하게 항상 전환이 걸린다.
 */
export function useDrawerTransition(
  open: boolean,
  /** 닫는 애니메이션 시간(ms) — CSS duration 과 맞춘다. */
  duration: number,
): { mounted: boolean; shown: boolean; panelRef: RefObject<HTMLDivElement> } {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    setShown(false)
    const timer = setTimeout(() => setMounted(false), duration)
    return () => clearTimeout(timer)
  }, [open, duration])

  // 판이 붙은 뒤: 화면 밖 시작 위치를 브라우저가 확정하게 만든 다음 연다.
  useEffect(() => {
    if (!mounted || !open) return
    // 이 읽기가 강제 리플로우를 일으켜 '닫힌 위치'가 계산된다. 값 자체는 쓰지 않는다.
    panelRef.current?.getBoundingClientRect()
    setShown(true)
  }, [mounted, open])

  return { mounted, shown, panelRef }
}
