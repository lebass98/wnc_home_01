import type { BoardCategory, Contact, ContactStatus, Post } from '@wnc/shared'

/**
 * 데모 모드 초기 데이터.
 * GitHub Pages 처럼 백엔드가 없는 환경에서 UI 를 그대로 시연하기 위해 사용한다.
 */

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(9 + (n % 8), (n * 7) % 60, 0, 0)
  return d.toISOString()
}

interface DemoPost extends Omit<Post, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt: string
}

const POST_SEED: [BoardCategory, string, string][] = [
  ['NOTICE', '워드앤코드 홈페이지가 새롭게 오픈했습니다', '고객 여러분께 더 나은 정보를 전달하기 위해 홈페이지를 새롭게 단장했습니다.'],
  ['NOTICE', '2026년 설 연휴 고객센터 운영 안내', '설 연휴 기간 고객센터 운영 일정을 안내드립니다.'],
  ['NEWS', '신규 클라우드 솔루션 출시', '자체 개발한 클라우드 기반 협업 솔루션을 정식 출시했습니다.'],
  ['NEWS', '상반기 실적 발표', '올해 상반기 매출이 전년 동기 대비 32% 성장했습니다.'],
  ['NEWS', '개발자 채용 설명회 개최', '신입 및 경력 개발자를 대상으로 채용 설명회를 진행합니다.'],
  ['PRESS', "'올해의 IT 혁신기업' 선정", '한국소프트웨어산업협회가 주관한 시상식에서 혁신기업으로 선정되었습니다.'],
  ['PRESS', '글로벌 파트너십 체결', '해외 진출을 위한 전략적 파트너십을 체결했습니다.'],
  ['NOTICE', '개인정보처리방침 개정 안내', '관련 법령 개정에 따라 개인정보처리방침이 일부 변경되었습니다.'],
]

const CONTACT_SEED: [string, string, string | null, string | null, string, ContactStatus][] = [
  ['박지훈', 'jihun@example.com', '010-1234-5678', '(주)example', '홈페이지 제작 관련하여 견적을 받아보고 싶습니다.', 'NEW'],
  ['이수민', 'sumin@sample.co.kr', '010-2222-3333', '샘플테크', '솔루션 도입 상담을 요청드립니다.', 'IN_PROGRESS'],
  ['정민호', 'minho@testcorp.com', null, '테스트코퍼레이션', '기술 제휴 문의드립니다. 담당자 연결 부탁드립니다.', 'DONE'],
  ['한예린', 'yerin@demo.io', '010-8888-9999', null, '채용 관련 문의입니다.', 'NEW'],
  ['오세진', 'sejin@company.kr', '02-555-1234', '컴퍼니코리아', '유지보수 계약 조건을 확인하고 싶습니다.', 'IN_PROGRESS'],
]

export function createDemoPosts(): DemoPost[] {
  return POST_SEED.map(([category, title, content], i) => ({
    id: i + 1,
    category,
    title,
    content: `${content}\n\n자세한 내용은 담당자에게 문의해 주시기 바랍니다.\n감사합니다.`,
    published: i !== 7,
    views: [300, 183, 264, 127, 95, 212, 158, 0][i],
    authorId: i % 2 === 0 ? 1 : 2,
    authorName: i % 2 === 0 ? '최고관리자' : '김편집',
    createdAt: isoDaysAgo(i),
    updatedAt: isoDaysAgo(i),
  }))
}

export function createDemoContacts(): Contact[] {
  return CONTACT_SEED.map(([name, email, phone, company, message, status], i) => ({
    id: i + 1,
    name,
    email,
    phone,
    company,
    message,
    status,
    memo: null,
    createdAt: isoDaysAgo(i * 2),
  }))
}

export const DEMO_USER = {
  id: 1,
  email: 'admin@wnc.co.kr',
  name: '최고관리자',
  role: 'ADMIN' as const,
  createdAt: isoDaysAgo(400),
}

export const DEMO_CREDENTIALS = { email: 'admin@wnc.co.kr', password: 'admin1234' }
