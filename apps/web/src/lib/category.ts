import type { CategoryNode } from '@wnc/shared'

/** 트리를 평탄화해 depth 정보를 유지한 배열로 만든다 (셀렉트 박스용). */
export function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = []
  const walk = (list: CategoryNode[]) => {
    for (const n of list) {
      out.push(n)
      walk(n.children)
    }
  }
  walk(nodes)
  return out
}

/** 특정 카테고리의 조상 id 들을 반환한다 (트리 자동 펼침용). */
export function ancestorIds(nodes: CategoryNode[], targetId: number): number[] {
  const path: number[] = []
  const walk = (list: CategoryNode[], trail: number[]): boolean => {
    for (const n of list) {
      if (n.id === targetId) {
        path.push(...trail)
        return true
      }
      if (walk(n.children, [...trail, n.id])) return true
    }
    return false
  }
  walk(nodes, [])
  return path
}

/** 자신과 모든 하위의 제품 수를 합산한다. */
export function totalProductCount(node: CategoryNode): number {
  return node.productCount + node.children.reduce((sum, c) => sum + totalProductCount(c), 0)
}

export function findCategory(nodes: CategoryNode[], id: number): CategoryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findCategory(n.children, id)
    if (found) return found
  }
  return null
}

/** 가격을 '1,500,000원' 형태로. null 이면 '가격 문의'. */
export function formatPrice(price: number | null): string {
  return price === null ? '가격 문의' : `${price.toLocaleString('ko-KR')}원`
}
