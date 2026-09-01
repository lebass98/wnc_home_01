import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CATEGORIES = ['NOTICE', 'NEWS', 'PRESS'] as const
const STATUSES = ['NEW', 'IN_PROGRESS', 'DONE'] as const

/** 최근 n일 이내의 임의 시각 */
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(9 + (n % 8), (n * 7) % 60, 0, 0)
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

  if ((await prisma.post.count()) === 0) {
    const samples = [
      ['NOTICE', '워드앤코드 홈페이지가 새롭게 오픈했습니다', '고객 여러분께 더 나은 정보를 전달하기 위해 홈페이지를 새롭게 단장했습니다.'],
      ['NOTICE', '2026년 설 연휴 고객센터 운영 안내', '설 연휴 기간 고객센터 운영 일정을 안내드립니다.'],
      ['NEWS', '신규 클라우드 솔루션 출시', '자체 개발한 클라우드 기반 협업 솔루션을 정식 출시했습니다.'],
      ['NEWS', '상반기 실적 발표', '올해 상반기 매출이 전년 동기 대비 32% 성장했습니다.'],
      ['NEWS', '개발자 채용 설명회 개최', '신입 및 경력 개발자를 대상으로 채용 설명회를 진행합니다.'],
      ['PRESS', '\'올해의 IT 혁신기업\' 선정', '한국소프트웨어산업협회가 주관한 시상식에서 혁신기업으로 선정되었습니다.'],
      ['PRESS', '글로벌 파트너십 체결', '해외 진출을 위한 전략적 파트너십을 체결했습니다.'],
      ['NOTICE', '개인정보처리방침 개정 안내', '관련 법령 개정에 따라 개인정보처리방침이 일부 변경되었습니다.'],
    ] as const

    for (const [i, [category, title, content]] of samples.entries()) {
      await prisma.post.create({
        data: {
          category,
          title,
          content: `${content}\n\n자세한 내용은 담당자에게 문의해 주시기 바랍니다.\n감사합니다.`,
          published: i !== 7, // 마지막 한 건은 임시저장 상태로 둔다
          views: Math.floor(Math.random() * 400) + 20,
          authorId: i % 2 === 0 ? admin.id : editor.id,
          createdAt: daysAgo(i),
        },
      })
    }
  }

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
