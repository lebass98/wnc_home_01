import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'wnc_admin_theme'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  setTheme: (theme: Theme) => void
  /** 다크 테마를 실제로 적용할지 여부 (어드민 화면에서만 켠다) */
  setEnabled: (enabled: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** 저장된 값이 없으면 운영체제 설정을 따른다. */
function readInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // 저장소 접근이 막힌 환경(프라이빗 모드 등)에서는 시스템 설정으로 넘어간다.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)
  // 공개 사이트는 항상 라이트로 보여야 하므로, 어드민에 진입했을 때만 켠다.
  const [enabled, setEnabled] = useState(false)

  // Tailwind 의 darkMode:'class' 가 <html class="dark"> 를 보고 동작한다.
  useEffect(() => {
    const root = document.documentElement
    const active = enabled && theme === 'dark'
    root.classList.toggle('dark', active)
    root.style.colorScheme = active ? 'dark' : 'light'
  }, [theme, enabled])

  // 선택한 테마는 어드민을 벗어나도 기억한다.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // 저장 실패는 무시한다 — 현재 세션에서는 정상 동작한다.
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), [])

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme, setEnabled }}>
      {children}
    </ThemeContext.Provider>
  )
}

/** 어드민 화면에서 마운트되는 동안만 다크 테마를 활성화한다. */
export function useEnableDarkMode() {
  const { setEnabled } = useTheme()
  useEffect(() => {
    setEnabled(true)
    return () => setEnabled(false)
  }, [setEnabled])
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme 은 ThemeProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
