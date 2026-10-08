import app from './app.js'
import { env } from './lib/env.js'
import { purgeExpiredTrash } from './lib/trash.js'
import { syncTemplateFolders } from './lib/templates.js'

/**
 * 로컬 개발 서버 — 앱을 띄우고, 서버가 뜰 때 한 번 하는 정리 작업을 돌린다.
 * Vercel 에서는 이 파일 대신 저장소 루트의 api/index.ts 가 앱을 서버 함수로 감싼다.
 */

// 템플릿 폴더(templates/)와 DB 를 맞춘다 — 예전 보관함을 옮기고, git 으로 받은 템플릿을 등록한다.
syncTemplateFolders().catch((e) => console.error('[templates] 템플릿 폴더를 맞추지 못했습니다:', e))
// 휴지통에서 보관 기간(30일)이 지난 항목을 비운다.
purgeExpiredTrash().catch((e) => console.error('[trash] 휴지통을 비우지 못했습니다:', e))

app.listen(env.port, () => {
  console.log(`API 서버 실행 중 → http://localhost:${env.port}`)
})
