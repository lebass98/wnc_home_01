/** Generated catalog imagery shared by listings, details and related cards. */
const asset = (name: string) => `${import.meta.env.BASE_URL}images/products/${name}-v1.jpg`

export const productBanners: Record<string, string> = {
  전체: asset('overview'),
  소프트웨어: asset('software'),
  하드웨어: asset('hardware'),
  클라우드: asset('cloud'),
}

const categoryImages: Record<string, string> = {
  그룹웨어: 'groupware',
  전자결재: 'approval',
  인사관리: 'hr',
  'API 게이트웨이': 'api-gateway',
  'CI/CD 파이프라인': 'cicd',
  스위치: 'switch',
  라우터: 'router',
  '랙형 서버': 'rack-server',
  '타워형 서버': 'tower-server',
  '가상 서버': 'virtual-server',
  '오브젝트 스토리지': 'object-storage',
  보안: 'security',
  소프트웨어: 'software',
  '업무 솔루션': 'software',
  '개발 도구': 'api-gateway',
  하드웨어: 'hardware',
  '네트워크 장비': 'switch',
  서버: 'rack-server',
  클라우드: 'cloud',
  인프라: 'virtual-server',
}

export function productImage(product: { thumbnail?: string | null; categoryName: string }): string {
  return product.thumbnail || asset(categoryImages[product.categoryName] ?? 'overview')
}
