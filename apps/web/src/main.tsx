import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './lib/i18n'
// 사이트 전체 글꼴 — 프리텐다드(가변). CDN 이 아니라 패키지에서 번들해 어디서나 같은 글꼴로 보인다.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
