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
  ['notice', '워드앤코드 홈페이지가 새롭게 오픈했습니다', '고객 여러분께 더 나은 정보를 전달하기 위해 홈페이지를 새롭게 단장했습니다.'],
  ['notice', '2026년 설 연휴 고객센터 운영 안내', '설 연휴 기간 고객센터 운영 일정을 안내드립니다.'],
  ['news', '신규 클라우드 솔루션 출시', '자체 개발한 클라우드 기반 협업 솔루션을 정식 출시했습니다.'],
  ['news', '상반기 실적 발표', '올해 상반기 매출이 전년 동기 대비 32% 성장했습니다.'],
  ['news', '개발자 채용 설명회 개최', '신입 및 경력 개발자를 대상으로 채용 설명회를 진행합니다.'],
  ['PRESS', "'올해의 IT 혁신기업' 선정", '한국소프트웨어산업협회가 주관한 시상식에서 혁신기업으로 선정되었습니다.'],
  ['press', '글로벌 파트너십 체결', '해외 진출을 위한 전략적 파트너십을 체결했습니다.'],
  ['notice', '개인정보처리방침 개정 안내', '관련 법령 개정에 따라 개인정보처리방침이 일부 변경되었습니다.'],
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

/* --------------------------- 제품 / 카테고리 --------------------------- */

export interface DemoCategory {
  id: number
  name: string
  slug: string
  depth: number
  sortOrder: number
  parentId: number | null
}

export interface DemoProduct {
  id: number
  name: string
  model: string | null
  summary: string | null
  price: number | null
  thumbnail: string | null
  content: string
  specs: { label: string; value: string }[]
  categoryId: number
  published: boolean
  featured: boolean
  views: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const CATEGORY_TREE: [string, [string, string[]][]][] = [
  ['소프트웨어', [
    ['업무 솔루션', ['그룹웨어', '전자결재', '인사관리']],
    ['개발 도구', ['API 게이트웨이', 'CI/CD 파이프라인']],
  ]],
  ['하드웨어', [
    ['네트워크 장비', ['스위치', '라우터']],
    ['서버', ['랙형 서버', '타워형 서버']],
  ]],
  ['클라우드', [
    ['인프라', ['가상 서버', '오브젝트 스토리지']],
    ['보안', []],
  ]],
]

const SPEC_SETS = [
  [{ label: '제품 유형', value: '엔터프라이즈' }, { label: '지원 OS', value: 'Windows / Linux' }, { label: '라이선스', value: '연간 구독' }],
  [{ label: '폼팩터', value: '1U 랙마운트' }, { label: '포트', value: '48 x 1GbE' }, { label: '전원', value: '이중화 지원' }],
  [{ label: '제공 방식', value: 'SaaS' }, { label: 'SLA', value: '99.9%' }, { label: '리전', value: '서울 / 도쿄' }],
]

function slugify(s: string, i: number): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || `cat-${i}`
}

export function createDemoCategories(): { categories: DemoCategory[]; leaves: { id: number; name: string }[] } {
  const categories: DemoCategory[] = []
  const leaves: { id: number; name: string }[] = []
  let id = 1
  let order = 0

  for (const [top, mids] of CATEGORY_TREE) {
    const topId = id++
    categories.push({ id: topId, name: top, slug: slugify(top, topId), depth: 1, sortOrder: order++, parentId: null })

    let midOrder = 0
    for (const [mid, subs] of mids) {
      const midId = id++
      categories.push({ id: midId, name: mid, slug: slugify(mid, midId), depth: 2, sortOrder: midOrder++, parentId: topId })
      if (subs.length === 0) leaves.push({ id: midId, name: mid })

      let subOrder = 0
      for (const sub of subs) {
        const subId = id++
        categories.push({ id: subId, name: sub, slug: slugify(sub, subId), depth: 3, sortOrder: subOrder++, parentId: midId })
        leaves.push({ id: subId, name: sub })
      }
    }
  }
  return { categories, leaves }
}

export function createDemoProducts(leaves: { id: number; name: string }[]): DemoProduct[] {
  const SUFFIX = ['Pro', 'Enterprise', 'Standard', 'Lite']
  const ADJ = ['고성능', '안정적인', '경제적인', '확장 가능한']

  return leaves.map((leaf, i) => ({
    id: i + 1,
    name: `${leaf.name} ${SUFFIX[i % 4]}`,
    model: `WNC-${String(1000 + i * 7)}`,
    summary: `${leaf.name} 업무를 위한 ${ADJ[i % 4]} 솔루션입니다.`,
    price: i % 3 === 0 ? null : (i + 1) * 250000,
    thumbnail: null,
    content:
      `<h2>${leaf.name} 제품 소개</h2><p>본 제품은 ${leaf.name} 환경에 최적화되어 설계되었습니다. ` +
      `안정적인 성능과 손쉬운 운영을 동시에 제공합니다.</p><h3>주요 특징</h3><ul>` +
      `<li>검증된 안정성과 높은 가용성</li><li>직관적인 관리 콘솔 제공</li>` +
      `<li>기존 시스템과의 유연한 연동</li></ul>` +
      `<p>자세한 도입 문의는 영업 담당자에게 연락해 주시기 바랍니다.</p>`,
    specs: SPEC_SETS[i % SPEC_SETS.length],
    categoryId: leaf.id,
    published: true,
    featured: i < 4,
    views: [180, 240, 95, 310, 150, 88, 205, 130, 260, 72, 190, 115][i % 12],
    sortOrder: i,
    createdAt: isoDaysAgo(i % 14),
    updatedAt: isoDaysAgo(i % 14),
  }))
}

/* ------------------------------- 페이지 ------------------------------- */

export interface DemoPage {
  id: number
  slug: string
  title: string
  description: string | null
  content: string
  published: boolean
  publishedAt: string | null
  showInNav: boolean
  sortOrder: number
  views: number
  version: number
  createdAt: string
  updatedAt: string
}

export interface DemoPageVersion {
  id: number
  pageId: number
  version: number
  title: string
  description: string | null
  content: string
  published: boolean
  showInNav: boolean
  note: string
  authorName: string
  createdAt: string
}

const PAGE_SEED: [string, string, string, string, boolean][] = [
  ['about', '워드앤코드 소개', '회사의 비전과 걸어온 길을 소개합니다.', '<h2>회사 소개</h2><p>워드앤코드는 웹·모바일 서비스 개발과 디지털 전환을 돕는 IT 솔루션 기업입니다.</p><h3>우리가 하는 일</h3><ul><li>기업 홈페이지와 관리자 시스템 구축</li><li>업무 자동화 솔루션 개발</li><li>클라우드 인프라 설계와 운영</li></ul>', true],
  ['terms', '이용약관', '서비스 이용에 관한 기본 약관입니다.', '<h2>제1조 (목적)</h2><p>본 약관은 회사가 제공하는 서비스의 이용 조건과 절차를 정함을 목적으로 합니다.</p><h2>제2조 (정의)</h2><p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>', true],
  ['privacy', '개인정보처리방침', '수집하는 개인정보 항목과 이용 목적을 안내합니다.', '<h2>1. 수집하는 개인정보 항목</h2><p>회사는 문의 접수를 위해 이름, 이메일, 연락처를 수집합니다.</p><h2>2. 보유 및 이용 기간</h2><p>수집한 정보는 문의 처리 완료 후 3년간 보관 뒤 파기합니다.</p>', true],
  ['refund', '취소·환불 정책', '계약 해지와 환불 기준을 안내합니다.', '<h2>환불 기준</h2><p>착수 전 해지 시 전액 환불되며, 착수 후에는 진행 단계에 따라 정산합니다.</p>', true],
  ['faq', '자주 묻는 질문', '고객님들이 자주 문의하시는 내용을 모았습니다.', '<h3>개발 기간은 얼마나 걸리나요?</h3><p>요구사항 규모에 따라 다르지만 일반적으로 6~12주가 소요됩니다.</p><h3>유지보수도 해주시나요?</h3><p>납품 후 1년간 무상 유지보수를 제공합니다.</p>', true],
  ['partners', '파트너 안내', '함께할 협력사를 찾습니다.', '<h2>파트너십 안내</h2><p>기술 제휴와 리셀러 파트너를 상시 모집하고 있습니다.</p>', false],
]

export function createDemoPages(): { pages: DemoPage[]; versions: DemoPageVersion[] } {
  const pages: DemoPage[] = []
  const versions: DemoPageVersion[] = []

  PAGE_SEED.forEach(([slug, title, description, content, published], i) => {
    const createdAt = isoDaysAgo(10 - i)
    pages.push({
      id: i + 1,
      slug,
      title,
      description,
      content,
      published,
      publishedAt: published ? createdAt : null,
      showInNav: slug === 'about' || slug === 'faq',
      sortOrder: i,
      views: published ? (i + 1) * 37 : 0,
      version: 1,
      createdAt,
      updatedAt: createdAt,
    })
    versions.push({
      id: i + 1,
      pageId: i + 1,
      version: 1,
      title,
      description,
      content,
      published,
      showInNav: slug === 'about' || slug === 'faq',
      note: '최초 생성',
      authorName: DEMO_USER.name,
      createdAt,
    })
  })

  return { pages, versions }
}

/* ------------------------------ 환경설정 ------------------------------ */

export interface DemoSetting {
  siteName: string
  siteUrl: string
  description: string | null
  adminEmail: string
  titleImage: string | null
  metaTitle: string | null
  titleSuffix: string | null
  metaDescription: string | null
  metaKeywords: string | null
  ogEnabled: boolean
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  ogImageAlt: string | null
  ogSiteName: string | null
  ogType: string
  ogLocale: string
  allowIndexing: boolean
  googleVerification: string | null
  naverVerification: string | null
  gaId: string | null
  generatorEnabled: boolean
  generatorContent: string | null
  updatedAt: string
}

export function createDemoSetting(): DemoSetting {
  return {
    siteName: '워드앤코드',
    siteUrl: 'https://wnc.co.kr',
    description: '웹·모바일 서비스 개발과 디지털 전환을 돕는 IT 솔루션 기업입니다.',
    adminEmail: 'admin@wnc.co.kr',
    titleImage: null,
    metaTitle: '워드앤코드 — 웹·모바일 개발 파트너',
    titleSuffix: ' | 워드앤코드',
    metaDescription: '기업 홈페이지와 관리자 시스템, 업무 자동화 솔루션을 만듭니다.',
    metaKeywords: '홈페이지 제작, 업무 자동화, 클라우드',
    ogEnabled: true,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    ogImageAlt: null,
    ogSiteName: null,
    ogType: 'website',
    ogLocale: 'ko_KR',
    allowIndexing: true,
    googleVerification: null,
    naverVerification: null,
    gaId: null,
    generatorEnabled: true,
    generatorContent: null,
    updatedAt: isoDaysAgo(0),
  }
}

/* --------------------------- 게시판 환경설정 --------------------------- */

export interface DemoBoardSetting {
  seoListTitle: string
  seoListDescription: string
  seoBoardTitle: string
  seoBoardDescription: string
  seoPostTitle: string
  seoPostDescription: string
  seoServeList: boolean
  seoServeBoard: boolean
  seoServePost: boolean
  seoCacheResetAt: string
  updatedAt: string
}

export function createDemoBoardSetting(): DemoBoardSetting {
  const now = isoDaysAgo(0)
  return {
    seoListTitle: '{site_name}',
    seoListDescription: '',
    seoBoardTitle: '{board_name}',
    seoBoardDescription: '{board_description}',
    seoPostTitle: '{board_name} - {post_title}',
    seoPostDescription: '',
    seoServeList: true,
    seoServeBoard: true,
    seoServePost: true,
    seoCacheResetAt: now,
    updatedAt: now,
  }
}

/* ------------------------------- 게시판 ------------------------------- */

export interface DemoBoard {
  id: number
  name: string
  slug: string
  type: 'basic' | 'gallery' | 'card'
  description: string | null
  published: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export function createDemoBoards(): DemoBoard[] {
  const seed: [string, string, DemoBoard['type'], string][] = [
    ['notice', '공지사항', 'basic', '워드앤코드의 공지사항과 안내를 전해 드립니다.'],
    ['news', '뉴스', 'card', '워드앤코드의 새로운 소식과 활동을 소개합니다.'],
    ['press', '보도자료', 'gallery', '언론에 보도된 워드앤코드 소식을 모았습니다.'],
  ]
  return seed.map(([slug, name, type, description], i) => ({
    id: i + 1,
    name,
    slug,
    type,
    description,
    published: true,
    sortOrder: i,
    createdAt: isoDaysAgo(30),
    updatedAt: isoDaysAgo(30),
  }))
}
