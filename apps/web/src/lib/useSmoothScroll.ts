import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

/** 사이트 페이지의 휠 스크롤에 관성을 적용한다. 터치는 기기 기본 관성을 유지한다. */
export function useSmoothScroll(pathname: string, locked: boolean) {
  const instance = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
      allowNestedScroll: true,
      respectReducedMotion: true,
      stopInertiaOnNavigate: true,
      // 드로어·팝업이 잠근 배경에는 휠 이벤트를 적용하지 않는다.
      virtualScroll: () => document.body.style.overflow !== 'hidden',
    })
    instance.current = lenis
    return () => {
      lenis.destroy()
      instance.current = null
    }
  }, [])

  useEffect(() => {
    instance.current?.scrollTo(0, { immediate: true, force: true })
  }, [pathname])

  useEffect(() => {
    if (locked) instance.current?.stop()
    else instance.current?.start()
  }, [locked])
}
