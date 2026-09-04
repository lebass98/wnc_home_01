import { prisma } from './prisma.js'

/**
 * 게시판 환경설정 한 행.
 * 공개 사이트가 화면을 열 때마다 읽는 값이라 메모리에 들고 있는다.
 * 저장하거나 '캐시 초기화' 를 누르면 비운다. (신고 라우터도 같은 값을 읽는다)
 */
let cached: Record<string, any> | null = null

/** 설정 행이 없으면 기본값으로 만들어 돌려준다. */
export async function loadBoardSetting(): Promise<Record<string, any>> {
  if (cached) return cached
  const found = await prisma.boardSetting.findFirst({ orderBy: { id: 'asc' } })
  cached = found ?? (await prisma.boardSetting.create({ data: {} }))
  return cached
}

/** 저장한 값을 캐시에 그대로 얹는다. */
export function setBoardSettingCache(row: Record<string, any> | null) {
  cached = row
}
