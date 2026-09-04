/** @type {import('tailwindcss').Config} */
export default {
  // 어드민에서 토글하므로 시스템 설정이 아닌 class 기반으로 제어한다.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        /* 메인 화면 강조색 — 민트 계열 */
        mint: {
          50: '#f2f8f8',
          100: '#dfeeee',
          200: '#c3e0e0',
          300: '#9ecccd',
          400: '#7dbbbd',
          500: '#5aa3a6',
          600: '#48878a',
          700: '#3d6e71',
          800: '#365b5e',
          900: '#304d50',
        },
      },
      maxWidth: {
        /* 사이트 전체 콘텐츠 최대 폭 */
        site: '1440px',
      },
      screens: {
        /* GNB 가 펼쳐지는 최소 폭. 메뉴 5개 + 언어·팝업·사이트맵이 온전히 서려면
           약 1280px 이 필요해, 그 아래(태블릿 포함)는 햄버거 메뉴를 쓴다. */
        gnb: '1280px',
      },
      /* 홈페이지·관리자 모두 프리텐다드 GOV 로 통일한다.
         mono 도 같은 글꼴로 묶어 다른 글꼴이 끼어들지 않게 한다. */
      fontFamily: {
        sans: ['Pretendard GOV Variable', 'Pretendard GOV', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Pretendard GOV Variable', 'Pretendard GOV', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
