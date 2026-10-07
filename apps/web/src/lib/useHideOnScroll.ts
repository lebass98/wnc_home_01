import { useEffect, useState } from 'react'

/**
 * 스크롤 방향에 따라 헤더를 감출지 정한다 — 아래로 내리면 감추고, 위로 올리면 다시 보인다.
 * 맨 위 근처(threshold 이내)에서는 늘 보이고, 작은 관성 움직임에는 반응하지 않아 방향을 바꿀 때 깜빡이지 않는다.
 * resetKey(보통 주소)가 바뀌면 다시 보이는 상태로 시작한다.
 */
export function useHideOnScroll(resetKey: unknown, threshold = 60) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(false)
    let previousY = Math.max(0, window.scrollY)
    const onScroll = () => {
      const y = Math.max(0, window.scrollY)
      if (y <= threshold) {
        setHidden(false)
        previousY = y
        return
      }
      if (Math.abs(y - previousY) < 8) return
      setHidden(y > previousY)
      previousY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [resetKey, threshold])

  return [hidden, setHidden] as const
}
