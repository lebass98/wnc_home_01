/** Editorial covers for the built-in announcements, news and press releases. */
const covers: Record<string, readonly (readonly [string, string])[]> = {
  news: [
    ['클라우드 협업 솔루션', 'news-collaboration'],
    ['상반기 실적', 'news-growth'],
    ['채용 설명회', 'news-career-event'],
    ['사내 해커톤', 'news-hackathon'],
    ['대시보드 오픈소스', 'news-open-source'],
    ['제조업체', 'news-manufacturing'],
    ['전 직원 워크숍', 'news-workshop'],
    ['부산 사무소', 'news-busan'],
    ['모바일 앱 전면', 'news-mobile'],
    ['AI 문서 요약', 'news-ai-summary'],
  ],
  press: [
    ['IT 혁신기업', 'innovation-award'],
    ['글로벌 파트너십', 'global-partnership'],
    ['디지털 전환 지원', 'digital-transition'],
    ['CSAP', 'cloud-certification'],
    ['산학협력', 'university'],
    ['멘토링', 'mentoring'],
    ['ISO 27001', 'iso-security'],
    ['기술 특허', 'automation-patent'],
    ['통합 민원', 'public-system'],
    ['IT 교육 기부', 'education-giving'],
  ],
}

/**
 * 대표 이미지를 쓰지 않는 게시판.
 * 공지사항은 번호·제목·날짜만 훑어보는 목록이라 그림을 쓰지 않는다.
 * 여기에 든 게시판은 홈페이지에 그림이 나오지 않고, 관리자에도 등록 칸이 나오지 않는다.
 */
const NO_IMAGE_BOARDS = new Set(['notice'])

/** 이 게시판이 대표 이미지를 쓰는지 */
export const boardUsesImage = (category: string) => !NO_IMAGE_BOARDS.has(category)

export function postImage(post: { category: string; title: string; thumbnail?: string | null }): string | null {
  if (!boardUsesImage(post.category)) return null
  if (post.thumbnail) return post.thumbnail
  const match = covers[post.category]?.find(([keyword]) => post.title.includes(keyword))
  return match ? `${import.meta.env.BASE_URL}images/posts/${match[1]}-v1.jpg` : null
}
