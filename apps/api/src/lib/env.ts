import 'dotenv/config'

function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`환경변수 ${key} 가 설정되지 않았습니다. apps/api/.env 를 확인하세요.`)
  return value
}

export const env = {
  jwtSecret: required('JWT_SECRET'),
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  /**
   * Vercel 서버 함수에서 도는지 — 배포 서버는 파일을 계속 저장할 수 없어(/tmp 만 잠시 쓸 수 있다)
   * 사이트 소스·템플릿 폴더를 바꾸는 로컬 전용 기능을 막고, 업로드는 다른 곳에 둔다.
   */
  serverless: Boolean(process.env.VERCEL),
}
