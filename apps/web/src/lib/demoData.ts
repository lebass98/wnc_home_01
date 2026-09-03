import type { BoardCategory, Branch, Contact, ContactStatus, MenuAutoChildren, Post } from '@wnc/shared'
import { DEFAULT_COMPANY } from '@wnc/shared'

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

/** 게시판마다 10건씩 — 공지·뉴스·보도자료 순으로 놓았다. */
const POST_SEED: [BoardCategory, string, string][] = [
  ['notice', '워드앤코드 홈페이지가 새롭게 오픈했습니다', '고객 여러분께 더 나은 정보를 전달하기 위해 홈페이지를 새롭게 단장했습니다. 회사소개, 사업분야, 제품소개를 한눈에 볼 수 있도록 구성했으며 모바일에서도 편하게 보실 수 있습니다.'],
  ['notice', '2026년 설 연휴 고객센터 운영 안내', '설 연휴 기간 동안 고객센터 운영 일정을 안내드립니다. 연휴 기간에는 긴급 장애 접수만 받으며, 일반 문의는 연휴 이후 순차적으로 답변드립니다.'],
  ['notice', '개인정보처리방침 개정 안내', '관련 법령 개정에 따라 개인정보처리방침이 일부 변경되었습니다. 수집 항목과 보유 기간이 조정되었으니 홈페이지 하단의 개인정보처리방침을 확인해 주시기 바랍니다.'],
  ['notice', '서버 정기 점검 안내 (매월 둘째 주 일요일)', '안정적인 서비스 제공을 위해 매월 둘째 주 일요일 새벽 2시부터 4시까지 정기 점검을 진행합니다. 점검 시간에는 관리자 페이지 접속이 잠시 제한될 수 있습니다.'],
  ['notice', '추석 연휴 휴무 안내', '추석 연휴 기간 동안 사무실 운영을 쉬어 갑니다. 연휴 중 접수된 문의는 업무 재개 후 빠르게 처리해 드리겠습니다. 풍성한 한가위 보내시기 바랍니다.'],
  ['notice', '사무실 이전 안내', '워드앤코드 사무실이 강남구 테헤란로로 이전했습니다. 새 주소와 오시는 길은 문의하기 페이지에서 확인하실 수 있으며, 전화번호는 그대로 사용합니다.'],
  ['notice', '이용약관 개정 안내', '서비스 이용약관이 개정되어 안내드립니다. 유지보수 범위와 환불 기준이 명확해졌으며, 개정된 약관은 공지일로부터 7일 후 적용됩니다.'],
  ['notice', '2026년 하반기 신입·경력 개발자 채용 공고', '프론트엔드, 백엔드, 클라우드 인프라 부문에서 함께 성장할 동료를 찾습니다. 서류 접수는 이달 말까지이며 자세한 자격 요건은 채용 페이지를 참고해 주세요.'],
  ['notice', '고객센터 운영시간 변경 안내', '고객센터 운영시간이 평일 오전 9시부터 오후 6시까지로 변경됩니다. 점심시간(12시~13시)에는 상담이 어려우니 양해 부탁드립니다.'],
  ['notice', '연말연시 휴무 및 긴급 지원 안내', '연말연시 기간 동안 사무실은 휴무이며, 운영 중인 서비스의 장애는 24시간 긴급 지원 채널로 접수하실 수 있습니다. 한 해 동안 보내 주신 성원에 감사드립니다.'],
  ['news', '신규 클라우드 협업 솔루션 정식 출시', '자체 개발한 클라우드 기반 협업 솔루션을 정식 출시했습니다. 문서 공동 편집과 일정 공유, 결재 흐름을 하나의 화면에서 처리할 수 있어 중소기업의 업무 효율을 크게 높여 줍니다.'],
  ['news', '상반기 실적 발표 — 전년 대비 32% 성장', '올해 상반기 매출이 전년 동기 대비 32% 성장했습니다. 클라우드 전환 사업과 유지보수 계약이 꾸준히 늘어난 결과이며, 하반기에는 데이터 분석 분야로 영역을 넓힐 계획입니다.'],
  ['news', '개발자 채용 설명회 성황리에 마쳐', '신입 및 경력 개발자를 대상으로 진행한 채용 설명회에 200여 명이 참석했습니다. 현업 개발자가 직접 일하는 방식과 기술 스택을 소개해 큰 호응을 얻었습니다.'],
  ['news', '사내 해커톤 개최 — 업무 자동화 아이디어 12건 발굴', '전 직원이 참여한 1박 2일 해커톤에서 업무 자동화 아이디어 12건이 나왔습니다. 우수작으로 뽑힌 문의 자동 분류 기능은 다음 분기 제품에 반영될 예정입니다.'],
  ['news', '관리자 대시보드 오픈소스로 공개', '워드앤코드가 사용하는 관리자 대시보드 템플릿을 오픈소스로 공개했습니다. 게시판, 문의 관리, 팝업 기능을 기본으로 갖추고 있어 누구나 가져다 쓸 수 있습니다.'],
  ['news', '고객사 도입 사례 — 제조업체 A사의 디지털 전환', '종이 문서로 관리하던 생산 일지를 태블릿 기반 시스템으로 바꾼 제조업체 A사의 사례를 소개합니다. 도입 3개월 만에 보고서 작성 시간이 절반으로 줄었습니다.'],
  ['news', '전 직원 워크숍 — 올해의 목표와 팀 소개', '제주에서 진행한 전 직원 워크숍에서 올해의 목표를 공유하고 새로 합류한 동료들을 소개했습니다. 팀별 회고와 내년 계획 발표가 이어졌습니다.'],
  ['news', '부산 사무소 개소 — 영남권 고객 지원 강화', '영남권 고객을 가까이에서 지원하기 위해 부산 사무소를 열었습니다. 현장 방문과 교육 요청에 더 빠르게 대응할 수 있게 되었습니다.'],
  ['news', '모바일 앱 전면 리뉴얼 — 더 빠르고 단순하게', '자주 쓰는 기능을 첫 화면으로 끌어올리고 로딩 속도를 두 배 높인 모바일 앱 리뉴얼 버전을 배포했습니다. 앱스토어와 플레이스토어에서 업데이트하실 수 있습니다.'],
  ['news', 'AI 문서 요약 기능 베타 오픈', '긴 회의록과 보고서를 몇 줄로 요약해 주는 AI 기능을 베타로 열었습니다. 기존 고객사는 관리자 설정에서 바로 켜서 써 보실 수 있습니다.'],
  ['press', '\'올해의 IT 혁신기업\' 선정', '한국소프트웨어산업협회가 주관한 시상식에서 워드앤코드가 올해의 IT 혁신기업으로 선정되었습니다. 중소기업 맞춤형 웹 서비스로 디지털 전환을 도운 점이 높이 평가받았습니다.'],
  ['press', '글로벌 파트너십 체결 — 동남아 시장 진출', '해외 진출을 위해 싱가포르 IT 기업과 전략적 파트너십을 체결했습니다. 양사는 동남아 시장을 대상으로 협업 솔루션을 공동으로 공급할 계획입니다.'],
  ['press', '중소기업 디지털 전환 지원 협약 체결', '지역 상공회의소와 중소기업 디지털 전환 지원 협약을 맺었습니다. 협약에 따라 100개 기업에 홈페이지 구축과 업무 시스템 컨설팅을 지원합니다.'],
  ['press', '클라우드 보안 인증(CSAP) 획득', '워드앤코드 클라우드 서비스가 클라우드 보안 인증을 획득했습니다. 이로써 공공기관과 금융권에도 서비스를 공급할 수 있는 기반을 마련했습니다.'],
  ['press', '지역 대학과 산학협력 MOU', '지역 대학 소프트웨어학과와 산학협력 협약을 체결했습니다. 재학생 인턴십과 현장 실습, 공동 연구 과제를 함께 진행할 예정입니다.'],
  ['press', '스타트업 멘토링 프로그램 운영', '창업 초기 스타트업 20곳을 대상으로 기술 멘토링 프로그램을 운영했습니다. 서비스 구조 설계와 클라우드 비용 절감 방법을 중심으로 6주간 진행되었습니다.'],
  ['press', 'ISO 27001 정보보호 인증 취득', '정보보호 관리체계 국제 표준인 ISO 27001 인증을 취득했습니다. 고객 데이터를 다루는 전 과정이 국제 기준에 맞게 관리되고 있음을 인정받았습니다.'],
  ['press', '업무 자동화 관련 기술 특허 등록', '반복 업무를 자동으로 분류하고 처리하는 기술로 특허를 등록했습니다. 해당 기술은 문의 관리 제품에 적용되어 처리 시간을 크게 줄였습니다.'],
  ['press', '공공기관 통합 민원 시스템 구축 사업 수주', '지방자치단체의 통합 민원 시스템 구축 사업을 수주했습니다. 내년 상반기 오픈을 목표로 설계와 개발을 진행합니다.'],
  ['press', '연말 나눔 — 지역 아동센터에 IT 교육 기부', '지역 아동센터 5곳에 노트북과 코딩 교육 프로그램을 기부했습니다. 임직원이 직접 강사로 참여해 아이들과 첫 프로그램을 함께 만들었습니다.'],
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
    // 마지막 한 건은 임시저장 상태로 둔다.
    published: i !== POST_SEED.length - 1,
    views: ((i * 37) % 280) + 20,
    authorId: i % 2 === 0 ? 1 : 2,
    authorName: i % 2 === 0 ? '최고관리자' : '김편집',
    // 게시판 안에서는 위쪽 글이 더 최신이 되도록, 게시판끼리는 날짜가 섞이도록 배정한다.
    createdAt: isoDaysAgo((i % 10) * 3 + Math.floor(i / 10)),
    updatedAt: isoDaysAgo((i % 10) * 3 + Math.floor(i / 10)),
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
  /** 언어별 제목·본문 { ko, en, ja } */
  titleI18n: Record<string, string>
  contentI18n: Record<string, string>
  /** 첨부파일 [{ name, url, size }] */
  attachments: { name: string; url: string; size: number }[]
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string | null
  ogImage: string | null
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

// 에디터 페이지 샘플은 두지 않는다 — 새 페이지는 관리자에서 직접 만든다.
const PAGE_SEED: [string, string, string, string, boolean][] = []

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
      showInNav: false,
      sortOrder: i,
      views: published ? (i + 1) * 37 : 0,
      version: 1,
      titleI18n: {},
      contentI18n: {},
      attachments: [],
      metaKeywords: null,
      metaTitle: null,
      metaDescription: null,
      ogImage: null,
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
      showInNav: false,
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
  companyName: string
  companyNameEn: string
  ceo: string
  bizNo: string
  zipCode: string
  address: string
  tel: string
  fax: string
  email: string
  hours: string
  since: string
  copyright: string
  mapQuery: string
  directionsGuide: string
  snsFacebook: string
  snsYoutube: string
  snsBlog: string
  snsInstagram: string
  branches: Branch[]
  updatedAt: string
}

export function createDemoSetting(): DemoSetting {
  return {
    ...DEFAULT_COMPANY,
    branches: [
      { name: '워드앤코드 판교 지점', phone: '031-123-4567', email: 'pangyo@wordncode.com', address: '경기도 성남시 분당구 판교역로 166' },
      { name: '워드앤코드 부산 지점', phone: '051-123-4567', email: 'busan@wordncode.com', address: '부산광역시 해운대구 센텀중앙로 79' },
    ],
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
  nameI18n: Record<string, string>
  descriptionI18n: Record<string, string>
  showInAdminMenu: boolean
  categories: string[]
  secretMode: 'off' | 'optional' | 'always'
  showViews: boolean
  useReport: boolean
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
    nameI18n: { ko: name },
    descriptionI18n: { ko: description },
    showInAdminMenu: false,
    categories: [],
    secretMode: 'off' as const,
    showViews: true,
    useReport: false,
    published: true,
    sortOrder: i,
    createdAt: isoDaysAgo(30),
    updatedAt: isoDaysAgo(30),
  }))
}

export interface DemoPopup {
  id: number
  name: string
  placement: 'main' | 'path'
  placementPath: string | null
  windowType: 'window' | 'fixed' | 'draggable'
  scrollbar: 'auto' | 'none' | 'always'
  content: string
  image: string | null
  linkUrl: string | null
  linkNewTab: boolean
  startAt: string
  endAt: string
  enabled: boolean
  positionTop: number
  positionLeft: number
  width: number
  height: number
  hidePeriod: 'day' | 'never' | 'session'
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/**
 * 진행중·진행대기·종료 상태를 한 번에 볼 수 있도록 기간을 다르게 잡는다.
 * 앞의 세 건은 지금 게시기간 안이라 홈페이지에 바로 뜬다.
 */
export function createDemoPopups(): DemoPopup[] {
  const daysFromNow = (n: number): string => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d.toISOString()
  }

  const seed: [string, DemoPopup['windowType'], number, number, boolean, string][] = [
    ['신규 제품 출시 안내', 'fixed', -3, 14, true, '<h3>신규 제품이 출시되었습니다</h3><p>워드앤코드의 새로운 제품 라인업을 확인해 보세요.</p>'],
    ['설 연휴 배송 안내', 'draggable', -1, 7, true, '<p>설 연휴 기간에는 배송이 하루 이틀 늦어질 수 있습니다.</p>'],
    ['개발자 채용 설명회 안내', 'fixed', -2, 10, true, '<h3>개발자 채용 설명회를 엽니다</h3><p>신입·경력 개발자를 모십니다. 사전 신청은 문의하기에서 받습니다.</p>'],
    ['정기 점검 예정 안내', 'fixed', 5, 12, true, '<p>서비스 점검이 예정되어 있습니다. 이용에 참고해 주세요.</p>'],
    ['지난 이벤트 안내', 'fixed', -30, -10, true, '<p>종료된 이벤트입니다.</p>'],
    ['임시 중지된 팝업', 'fixed', -5, 20, false, '<p>관리자가 잠시 꺼 둔 팝업입니다.</p>'],
  ]

  return seed.map(([name, windowType, startDays, endDays, enabled, content], i) => ({
    id: i + 1,
    name,
    placement: 'main' as const,
    placementPath: null,
    windowType,
    scrollbar: 'none' as const,
    content,
    image: null,
    linkUrl: null,
    linkNewTab: false,
    startAt: daysFromNow(startDays),
    endAt: daysFromNow(endDays),
    enabled,
    positionTop: 120,
    positionLeft: 120 + i * 30,
    width: 400,
    height: 500,
    hidePeriod: 'day' as const,
    sortOrder: i,
    createdAt: isoDaysAgo(10 - i),
    updatedAt: isoDaysAgo(10 - i),
  }))
}

/* --------------------------- 자주 묻는 질문 --------------------------- */

export interface DemoFaq {
  id: number
  category: string
  question: string
  answer: string
  published: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export function createDemoFaqs(): DemoFaq[] {
  const seed: [string, string, string][] = [
    ['서비스', '어떤 종류의 서비스를 개발하나요?', '기업 홈페이지와 브랜드 사이트, 이커머스 플랫폼, 사내 업무 시스템(그룹웨어·ERP), 관리자 대시보드, 모바일 앱까지 목적에 맞는 구조로 설계하고 개발합니다. 웹과 모바일을 가리지 않으며, 운영 중인 서비스의 리뉴얼과 성능 개선도 함께 진행합니다.'],
    ['서비스', '소규모 회사나 개인도 의뢰할 수 있나요?', '네. 한 페이지짜리 소개 사이트부터 수백 명이 쓰는 업무 시스템까지 규모에 맞춰 진행합니다. 필요한 기능만 골라 시작하고, 사업이 커지면 그때 확장하는 방식을 권해 드립니다.'],
    ['서비스', '기획이나 디자인이 준비되어 있지 않아도 되나요?', '괜찮습니다. 해결하려는 문제와 목표만 말씀해 주시면 요구사항 정리부터 화면 설계, 디자인까지 한 팀이 함께 진행합니다. 이미 준비된 기획서나 디자인이 있다면 그대로 이어받아 개발만 맡을 수도 있습니다.'],
    ['견적·계약', '견적은 어떻게 받을 수 있나요?', '문의하기 페이지에 대략적인 내용을 남겨 주시면 담당자가 1영업일 내에 연락드립니다. 간단한 통화나 미팅으로 범위를 확인한 뒤, 화면 수·기능·일정을 기준으로 항목별 견적서를 보내 드립니다. 견적 상담은 무료입니다.'],
    ['견적·계약', '개발 기간은 얼마나 걸리나요?', '요구사항 규모에 따라 다르지만 소개 사이트는 4~6주, 관리자 시스템을 포함한 서비스는 8~12주 정도가 일반적입니다. 착수 전에 주 단위 일정을 확정해 공유하고, 2주 단위로 진행 상황을 보여 드립니다.'],
    ['견적·계약', '계약금과 잔금은 어떻게 나뉘나요?', '보통 착수 시 30%, 중간 검수 시 30%, 오픈 후 40%로 나누어 진행합니다. 프로젝트 규모와 기간에 따라 조정할 수 있으며, 세부 조건은 계약서에 명시합니다.'],
    ['개발·운영', '개발 중간에 진행 상황을 확인할 수 있나요?', '네. 2주 단위로 동작하는 화면을 테스트 서버에 올려 직접 확인하실 수 있게 합니다. 남은 일정과 변경 사항도 함께 정리해 공유하므로 마지막에 예상과 다른 결과가 나오는 일을 막을 수 있습니다.'],
    ['개발·운영', '관리자 화면에서 직접 콘텐츠를 수정할 수 있나요?', '기본으로 제공하는 관리자 대시보드에서 게시글, 제품, 팝업, 페이지 내용을 담당자가 직접 고칠 수 있습니다. 따로 교육을 받지 않아도 쓸 수 있도록 화면을 단순하게 정리했고, 필요하면 사용 설명서와 짧은 교육을 제공합니다.'],
    ['유지보수', '오픈 이후 유지보수도 해 주시나요?', '납품 후 1년간 무상 유지보수를 제공합니다. 오류 수정과 보안 업데이트, 소규모 문구·이미지 변경이 포함되며, 그 이후에는 월 단위 유지보수 계약으로 이어 갈 수 있습니다.'],
    ['유지보수', '장애가 생기면 얼마나 빨리 대응하나요?', '평일 업무 시간에는 접수 후 1시간 안에 1차 답변을 드리고, 서비스가 멈추는 긴급 장애는 24시간 긴급 지원 채널로 접수하실 수 있습니다. 대응 기준과 시간은 유지보수 계약서에 명시합니다.'],
  ]
  return seed.map(([category, question, answer], i) => ({
    id: i + 1,
    category,
    question,
    answer,
    published: true,
    sortOrder: i,
    createdAt: isoDaysAgo(20 - i),
    updatedAt: isoDaysAgo(20 - i),
  }))
}

export interface DemoFaqCategory {
  id: number
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export function createDemoFaqCategories(): DemoFaqCategory[] {
  return ['서비스', '견적·계약', '개발·운영', '유지보수'].map((name, i) => ({
    id: i + 1,
    name,
    sortOrder: i,
    createdAt: isoDaysAgo(21),
    updatedAt: isoDaysAgo(21),
  }))
}

/* --------------------------- 개인정보처리방침 개정 이력 --------------------------- */

export interface DemoPrivacyRevision {
  id: number
  title: string
  effectiveAt: string
  summary: string
  content: string
  createdAt: string
  updatedAt: string
}

export function createDemoPrivacyRevisions(): DemoPrivacyRevision[] {
  const seed: [string, string, string, string][] = [
    ['개인정보처리방침 v1.0', '2024-01-01', '최초 제정', '워드앤코드는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.\n\n1. 수집하는 개인정보 항목\n문의 접수 시 이름, 이메일, 연락처를 수집합니다.\n\n2. 개인정보의 처리 목적\n문의 응대와 상담 이력 관리에 이용합니다.\n\n3. 보유 및 이용 기간\n문의 처리 완료 후 1년간 보관한 뒤 파기합니다.\n\n4. 개인정보 보호책임자\n경영지원팀장 · 02-1234-5678'],
    ['개인정보처리방침 v1.1', '2025-03-01', '처리 위탁 항목 추가, 보유 기간을 3년으로 변경', '워드앤코드는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.\n\n1. 수집하는 개인정보 항목\n문의 접수 시 이름, 이메일, 연락처를 수집하며, 회사명은 선택 항목입니다.\n\n2. 개인정보의 처리 목적\n문의 응대, 견적·계약 진행, 서비스 개선에 이용합니다.\n\n3. 보유 및 이용 기간\n문의 처리 완료 후 3년간 보관한 뒤 파기합니다.\n\n4. 개인정보 처리의 위탁\n클라우드 호스팅 사업자에게 서버·데이터 보관을 위탁합니다.\n\n5. 개인정보 보호책임자\n경영지원팀장 · 02-1234-5678 · privacy@wnc.co.kr'],
    ['개인정보처리방침 v1.2', '2026-01-01', '주요 처리표시(라벨링) 도입, 권익 침해 구제 기관 안내 추가', '현재 시행 중인 방침입니다. 본문은 개인정보처리방침 페이지에서 확인하실 수 있습니다.'],
  ]
  return seed.map(([title, date, summary, content], i) => ({
    id: i + 1,
    title,
    effectiveAt: new Date(`${date}T00:00:00`).toISOString(),
    summary,
    content,
    createdAt: new Date(`${date}T09:00:00`).toISOString(),
    updatedAt: new Date(`${date}T09:00:00`).toISOString(),
  }))
}

/* ------------------------------ 홈페이지 메뉴 ------------------------------ */

export interface DemoMenuItem {
  id: number
  parentId: number | null
  label: string
  url: string
  newTab: boolean
  autoChildren: MenuAutoChildren
  published: boolean
  showInGnb: boolean
  showInFooter: boolean
  showInSitemap: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** 기본 메뉴 — 서버 시드와 같은 구성 */
export function createDemoMenus(): DemoMenuItem[] {
  const at = isoDaysAgo(30)
  const items: DemoMenuItem[] = []
  let id = 1
  const add = (
    parentId: number | null,
    sortOrder: number,
    label: string,
    url: string,
    extra: Partial<DemoMenuItem> = {},
  ) => {
    const item: DemoMenuItem = {
      id: id++,
      parentId,
      label,
      url,
      newTab: false,
      autoChildren: 'none',
      published: true,
      showInGnb: true,
      showInFooter: true,
      showInSitemap: true,
      sortOrder,
      createdAt: at,
      updatedAt: at,
      ...extra,
    }
    items.push(item)
    return item.id
  }
  const about = add(null, 0, '회사소개', '/about')
  add(about, 0, '회사 소개', '/about')
  add(about, 1, '사업분야', '/services')
  add(about, 2, '찾아오시는 길', '/about/directions')
  add(null, 1, '사업분야', '/services')
  const products = add(null, 2, '제품소개', '/products', { autoChildren: 'categories' })
  add(products, 0, '전체 제품', '/products')
  const board = add(null, 3, '소식', '/board', { autoChildren: 'boards' })
  add(board, 0, '전체 소식', '/board')
  const contact = add(null, 4, '문의하기', '/contact')
  add(contact, 0, '문의하기', '/contact')
  add(contact, 1, '자주 묻는 질문', '/contact/faq')
  const guide = add(null, 5, '이용안내', '/terms', { showInGnb: false, showInFooter: false })
  add(guide, 0, '이용약관', '/terms', { showInGnb: false, showInFooter: false })
  add(guide, 1, '개인정보처리방침', '/privacy', { showInGnb: false, showInFooter: false })
  return items
}
