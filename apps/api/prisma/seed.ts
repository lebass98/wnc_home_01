import { seedBoardSamples } from './seedBoardSamples'
import { PrismaClient } from '@prisma/client'
// 공용 패키지는 CJS 로 읽혀 이름 내보내기를 못 쓴다 — 원본 파일을 상대 경로로 직접 읽는다.
import { DEFAULT_PRIVACY_PAGE, DEFAULT_TERMS_PAGE } from '../../../packages/shared/src/policyContent'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const STATUSES = ['NEW', 'IN_PROGRESS', 'DONE'] as const

/** 최근 n일 이내의 임의 시각 */
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(9 + (n % 8), (n * 7) % 60, 0, 0)
  return d
}

/** 오늘 기준으로 n일 뒤(음수면 n일 전) — 팝업 게시기간에 쓴다. */
function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

async function main() {
  const password = await bcrypt.hash('admin1234', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@wnc.co.kr' },
    update: {},
    create: { email: 'admin@wnc.co.kr', password, name: '최고관리자', role: 'ADMIN' },
  })

  const editor = await prisma.user.upsert({
    where: { email: 'editor@wnc.co.kr' },
    update: {},
    create: { email: 'editor@wnc.co.kr', password, name: '김편집', role: 'EDITOR' },
  })

  if ((await prisma.board.count()) === 0) {
    // 공지·카드형·갤러리 게시판을 구성한다.
    const boards: [string, string, string, string][] = [
      ['notice', '공지사항', 'basic', '워드앤코드의 공지사항과 안내를 전해 드립니다.'],
      ['card', '카드형', 'card', '워드앤코드의 프로젝트와 활동을 소개합니다.'],
      ['gallery', '갤러리', 'gallery', '워드앤코드의 일상을 사진으로 만나보세요.'],
    ]
    for (const [i, [slug, name, type, description]] of boards.entries()) {
      await prisma.board.create({ data: { slug, name, type, description, sortOrder: i } })
    }
  }

  await seedBoardSamples(prisma, admin.id)

  if ((await prisma.contact.count()) === 0) {
    const samples = [
      ['박지훈', 'jihun@example.com', '010-1234-5678', '(주)example', '홈페이지 제작 관련하여 견적을 받아보고 싶습니다.'],
      ['이수민', 'sumin@sample.co.kr', '010-2222-3333', '샘플테크', '솔루션 도입 상담을 요청드립니다.'],
      ['정민호', 'minho@testcorp.com', null, '테스트코퍼레이션', '기술 제휴 문의드립니다. 담당자 연결 부탁드립니다.'],
      ['한예린', 'yerin@demo.io', '010-8888-9999', null, '채용 관련 문의입니다.'],
      ['오세진', 'sejin@company.kr', '02-555-1234', '컴퍼니코리아', '유지보수 계약 조건을 확인하고 싶습니다.'],
    ] as const

    for (const [i, [name, email, phone, company, message]] of samples.entries()) {
      await prisma.contact.create({
        data: {
          name,
          email,
          phone,
          company,
          message,
          status: STATUSES[i % STATUSES.length],
          createdAt: daysAgo(i * 2),
        },
      })
    }
  }

  // --- 제품 카테고리 (3차 계층) 및 제품 ---
  if ((await prisma.category.count()) === 0) {
    /** [대분류, [중분류, [소분류...]][]][] */
    const tree: [string, [string, string[]][]][] = [
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

    const slug = (s: string, i: number) =>
      s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || `cat-${i}`

    let order = 0
    const leaves: { id: number; name: string }[] = []

    for (const [top, mids] of tree) {
      const parent = await prisma.category.create({
        data: { name: top, slug: slug(top, order), depth: 1, sortOrder: order++ },
      })
      let midOrder = 0
      for (const [mid, subs] of mids) {
        const midCat = await prisma.category.create({
          data: { name: mid, slug: slug(mid, ++order), depth: 2, parentId: parent.id, sortOrder: midOrder++ },
        })
        if (subs.length === 0) leaves.push({ id: midCat.id, name: mid })
        let subOrder = 0
        for (const sub of subs) {
          const subCat = await prisma.category.create({
            data: { name: sub, slug: slug(sub, ++order), depth: 3, parentId: midCat.id, sortOrder: subOrder++ },
          })
          leaves.push({ id: subCat.id, name: sub })
        }
      }
    }

    const SPECS = [
      [{ label: '제품 유형', value: '엔터프라이즈' }, { label: '지원 OS', value: 'Windows / Linux' }, { label: '라이선스', value: '연간 구독' }],
      [{ label: '폼팩터', value: '1U 랙마운트' }, { label: '포트', value: '48 x 1GbE' }, { label: '전원', value: '이중화 지원' }],
      [{ label: '제공 방식', value: 'SaaS' }, { label: 'SLA', value: '99.9%' }, { label: '리전', value: '서울 / 도쿄' }],
    ]

    for (const [i, leaf] of leaves.entries()) {
      const specs = SPECS[i % SPECS.length]
      await prisma.product.create({
        data: {
          name: `${leaf.name} ${['Pro', 'Enterprise', 'Standard', 'Lite'][i % 4]}`,
          model: `WNC-${String(1000 + i * 7)}`,
          summary: `${leaf.name} 업무를 위한 ${['고성능', '안정적인', '경제적인', '확장 가능한'][i % 4]} 솔루션입니다.`,
          price: i % 3 === 0 ? null : (i + 1) * 250000,
          thumbnail: null,
          content: `<h2>${leaf.name} 제품 소개</h2><p>본 제품은 ${leaf.name} 환경에 최적화되어 설계되었습니다. 안정적인 성능과 손쉬운 운영을 동시에 제공합니다.</p><h3>주요 특징</h3><ul><li>검증된 안정성과 높은 가용성</li><li>직관적인 관리 콘솔 제공</li><li>기존 시스템과의 유연한 연동</li></ul><p>자세한 도입 문의는 영업 담당자에게 연락해 주시기 바랍니다.</p>`,
          specs: JSON.stringify(specs),
          categoryId: leaf.id,
          published: true,
          featured: i < 4,
          views: Math.floor(Math.random() * 300) + 10,
          sortOrder: i,
          createdAt: daysAgo(i % 14),
        },
      })
    }
  }

  // 기본 정책 페이지 — /terms, /privacy 가 이 내용을 보여 준다. 내용은 [페이지 관리]에서 고친다.
  if ((await prisma.page.count()) === 0) {
    for (const [i, def] of [DEFAULT_TERMS_PAGE, DEFAULT_PRIVACY_PAGE].entries()) {
      const created = await prisma.page.create({
        data: {
          slug: def.slug,
          title: def.title,
          description: def.description,
          content: def.content,
          published: true,
          publishedAt: daysAgo(10),
          showInNav: false,
          sortOrder: i,
          version: 1,
          createdAt: daysAgo(10),
        },
      })
      await prisma.pageVersion.create({
        data: {
          pageId: created.id,
          version: 1,
          title: def.title,
          description: def.description,
          content: def.content,
          published: true,
          showInNav: false,
          note: '최초 생성',
          authorId: admin.id,
          authorName: admin.name,
          createdAt: created.createdAt,
        },
      })
    }
  }

  if ((await prisma.popup.count()) === 0) {
    // 앞의 세 건은 지금 게시기간 안이라 홈페이지에 바로 뜬다.
    // 뒤의 세 건은 진행대기·종료·중지 상태로, 관리자 목록의 상태 필터를 확인하는 용도다.
    const popups: [string, string, number, number, boolean, string][] = [
      ['신규 제품 출시 안내', 'fixed', -3, 14, true, '<h3>신규 제품이 출시되었습니다</h3><p>워드앤코드의 새로운 제품 라인업을 확인해 보세요.</p>'],
      ['설 연휴 배송 안내', 'draggable', -1, 7, true, '<p>설 연휴 기간에는 배송이 하루 이틀 늦어질 수 있습니다.</p>'],
      ['개발자 채용 설명회 안내', 'fixed', -2, 10, true, '<h3>개발자 채용 설명회를 엽니다</h3><p>신입·경력 개발자를 모십니다. 사전 신청은 문의하기에서 받습니다.</p>'],
      ['정기 점검 예정 안내', 'fixed', 5, 12, true, '<p>서비스 점검이 예정되어 있습니다. 이용에 참고해 주세요.</p>'],
      ['지난 이벤트 안내', 'fixed', -30, -10, true, '<p>종료된 이벤트입니다.</p>'],
      ['임시 중지된 팝업', 'fixed', -5, 20, false, '<p>관리자가 잠시 꺼 둔 팝업입니다.</p>'],
    ]

    for (const [i, [name, windowType, startDays, endDays, enabled, content]] of popups.entries()) {
      await prisma.popup.create({
        data: {
          name,
          placement: 'main',
          windowType,
          scrollbar: 'none',
          content,
          startAt: daysFromNow(startDays),
          endAt: daysFromNow(endDays),
          enabled,
          positionTop: 120,
          positionLeft: 120 + i * 30,
          width: 400,
          height: 500,
          hidePeriod: 'day',
          sortOrder: i,
          createdAt: daysAgo(10 - i),
        },
      })
    }
  }

  if ((await prisma.faqCategory.count()) === 0) {
    for (const [i, name] of ['서비스', '견적·계약', '개발·운영', '유지보수'].entries()) {
      await prisma.faqCategory.create({ data: { name, sortOrder: i } })
    }
  }

  if ((await prisma.faq.count()) === 0) {
    const faqs: [string, string, string][] = [
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
    for (const [i, [category, question, answer]] of faqs.entries()) {
      await prisma.faq.create({
        data: { category, question, answer, published: true, sortOrder: i, createdAt: daysAgo(20 - i) },
      })
    }
  }

  if ((await prisma.privacyRevision.count()) === 0) {
    const revisions: [string, string, string, string][] = [
      ['개인정보처리방침 v1.0', '2024-01-01', '최초 제정', '워드앤코드는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.\n\n1. 수집하는 개인정보 항목\n문의 접수 시 이름, 이메일, 연락처를 수집합니다.\n\n2. 개인정보의 처리 목적\n문의 응대와 상담 이력 관리에 이용합니다.\n\n3. 보유 및 이용 기간\n문의 처리 완료 후 1년간 보관한 뒤 파기합니다.\n\n4. 개인정보 보호책임자\n경영지원팀장 · 02-1234-5678'],
      ['개인정보처리방침 v1.1', '2025-03-01', '처리 위탁 항목 추가, 보유 기간을 3년으로 변경', '워드앤코드는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.\n\n1. 수집하는 개인정보 항목\n문의 접수 시 이름, 이메일, 연락처를 수집하며, 회사명은 선택 항목입니다.\n\n2. 개인정보의 처리 목적\n문의 응대, 견적·계약 진행, 서비스 개선에 이용합니다.\n\n3. 보유 및 이용 기간\n문의 처리 완료 후 3년간 보관한 뒤 파기합니다.\n\n4. 개인정보 처리의 위탁\n클라우드 호스팅 사업자에게 서버·데이터 보관을 위탁합니다.\n\n5. 개인정보 보호책임자\n경영지원팀장 · 02-1234-5678 · privacy@wnc.co.kr'],
      ['개인정보처리방침 v1.2', '2026-01-01', '주요 처리표시(라벨링) 도입, 권익 침해 구제 기관 안내 추가', '현재 시행 중인 방침입니다. 본문은 개인정보처리방침 페이지에서 확인하실 수 있습니다.'],
    ]
    for (const [title, date, summary, content] of revisions) {
      await prisma.privacyRevision.create({
        data: { title, effectiveAt: new Date(`${date}T00:00:00`), summary, content, createdAt: new Date(`${date}T09:00:00`) },
      })
    }
  }

  // 홈페이지 메뉴 — 기존에 코드로 고정돼 있던 GNB 구성을 그대로 옮긴다.
  if ((await prisma.menuItem.count()) === 0) {
    type Child = { label: string; url: string; showInGnb?: boolean }
    const menus: {
      label: string
      url: string
      autoChildren?: string
      showInGnb?: boolean
      showInFooter?: boolean
      children: Child[]
    }[] = [
      {
        label: '회사소개',
        url: '/about',
        children: [
          { label: '회사 소개', url: '/about' },
          { label: '찾아오시는 길', url: '/about/directions' },
        ],
      },
      {
        label: '사업분야',
        url: '/services',
        children: [
          { label: '사업분야', url: '/services' },
          { label: '서비스', url: '/service' },
        ],
      },
      { label: '제품소개', url: '/products', autoChildren: 'categories', children: [{ label: '전체 제품', url: '/products' }] },
      { label: '소식', url: '/board', autoChildren: 'boards', children: [{ label: '전체 소식', url: '/board' }] },
      {
        label: '문의하기',
        url: '/contact',
        children: [
          { label: '문의하기', url: '/contact' },
          { label: '자주 묻는 질문', url: '/contact/faq' },
        ],
      },
      // 이용안내는 사이트맵에만 보인다.
      {
        label: '이용안내',
        url: '/terms',
        showInGnb: false,
        showInFooter: false,
        children: [
          { label: '이용약관', url: '/terms' },
          { label: '개인정보처리방침', url: '/privacy' },
        ],
      },
    ]
    for (const [i, m] of menus.entries()) {
      const parent = await prisma.menuItem.create({
        data: {
          label: m.label,
          url: m.url,
          autoChildren: m.autoChildren ?? 'none',
          showInGnb: m.showInGnb ?? true,
          showInFooter: m.showInFooter ?? true,
          sortOrder: i,
        },
      })
      for (const [j, c] of m.children.entries()) {
        await prisma.menuItem.create({
          data: {
            parentId: parent.id,
            label: c.label,
            url: c.url,
            showInGnb: (c.showInGnb ?? m.showInGnb) ?? true,
            showInFooter: m.showInFooter ?? true,
            sortOrder: j,
          },
        })
      }
    }
  }

  // 방문 통계 표본 — 관리자 [통계] 화면이 비어 보이지 않도록 최근 60일치를 지어 넣는다.
  if ((await prisma.visit.count()) === 0) {
    /** 같은 씨앗이면 늘 같은 수를 내놓는 난수 — 다시 시드해도 그래프 모양이 같다. */
    const seededRandom = (seed: number) => {
      let t = seed >>> 0
      return () => {
        t = (t + 0x6d2b79f5) >>> 0
        let x = Math.imul(t ^ (t >>> 15), 1 | t)
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296
      }
    }
    /** 가중치가 붙은 후보 중 하나를 고른다. */
    const pick = (rand: () => number, table: [string, number][]) => {
      let r = rand() * table.reduce((sum, [, w]) => sum + w, 0)
      for (const [name, w] of table) {
        r -= w
        if (r <= 0) return name
      }
      return table[table.length - 1][0]
    }

    const DEVICES: [string, number][] = [['desktop', 52], ['mobile', 40], ['tablet', 8]]
    const BROWSERS: [string, number][] = [
      ['Chrome', 55], ['Safari', 20], ['Edge', 11], ['Samsung Internet', 6],
      ['Whale', 4], ['Firefox', 3], ['기타', 1],
    ]
    const OSES: [string, number][] = [
      ['Windows', 41], ['Android', 22], ['iOS', 18], ['macOS', 13], ['iPadOS', 4], ['Linux', 2],
    ]
    const SOURCES: [string, number][] = [['direct', 42], ['search', 34], ['sns', 14], ['referral', 10]]
    const PATHS: [string, number][] = [
      ['/', 30], ['/about', 12], ['/products', 11], ['/services', 10], ['/board', 9],
      ['/service', 8], ['/contact', 8], ['/contact/faq', 5], ['/about/directions', 4],
      ['/terms', 2], ['/privacy', 1],
    ]
    // 0~23시 방문이 몰리는 정도 — 새벽은 뜸하고 낮·저녁에 몰린다.
    const HOURS = [1, 1, 1, 1, 1, 2, 4, 8, 14, 20, 24, 22, 18, 24, 26, 25, 22, 18, 14, 12, 10, 8, 5, 3]
    const HOUR_TOTAL = HOURS.reduce((sum, w) => sum + w, 0)

    const rows: { path: string; visitorId: string; device: string; browser: string; os: string; source: string; referrer: string; createdAt: Date }[] = []
    for (let back = 59; back >= 0; back--) {
      const day = new Date()
      day.setDate(day.getDate() - back)
      day.setHours(0, 0, 0, 0)
      const rand = seededRandom(Number(`${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, '0')}${String(day.getDate()).padStart(2, '0')}`))
      const weekday = day.getDay()
      const busy = weekday === 0 ? 0.55 : weekday === 6 ? 0.62 : 1
      const count = Math.round(90 * busy * (0.75 + rand() * 0.5))
      // 한 사람이 여러 화면을 보므로 방문자 수는 조회수보다 적다.
      const visitors = Math.max(1, Math.round(count * 0.62))

      for (let i = 0; i < count; i++) {
        let r = rand() * HOUR_TOTAL
        let hour = 23
        for (let h = 0; h < 24; h++) {
          r -= HOURS[h]
          if (r <= 0) { hour = h; break }
        }
        const at = new Date(day)
        at.setHours(hour, Math.floor(rand() * 60), Math.floor(rand() * 60), 0)
        const source = pick(rand, SOURCES)
        rows.push({
          path: pick(rand, PATHS),
          visitorId: `seed-${back}-${Math.floor(rand() * visitors)}`,
          device: pick(rand, DEVICES),
          browser: pick(rand, BROWSERS),
          os: pick(rand, OSES),
          source,
          referrer: source === 'search' ? 'google.com' : source === 'sns' ? 'instagram.com' : '',
          createdAt: at,
        })
      }
    }
    await prisma.visit.createMany({ data: rows })
    console.log(`  방문 통계 표본 ${rows.length}건`)
  }

  console.log('시드 데이터 생성 완료')
  console.log('  관리자: admin@wnc.co.kr / admin1234')
  console.log('  편집자: editor@wnc.co.kr / admin1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
