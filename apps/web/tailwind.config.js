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
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
