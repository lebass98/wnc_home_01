import { useEffect, useState } from 'react'
import type { CategoryNode } from '@wnc/shared'
import { ancestorIds, totalProductCount } from '../lib/category'

/** 공개 제품 페이지의 좌측 카테고리 트리 (3차까지) */
export default function CategoryTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: CategoryNode[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // 선택된 카테고리의 상위 경로는 자동으로 펼쳐 둔다.
  useEffect(() => {
    if (selectedId === null) return
    setExpanded((prev) => new Set([...prev, ...ancestorIds(nodes, selectedId), selectedId]))
  }, [selectedId, nodes])

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderNodes = (list: CategoryNode[], depth = 0) => (
    <ul className={depth === 0 ? 'space-y-0.5' : 'mt-0.5 space-y-0.5 border-l border-slate-200 pl-3'}>
      {list.map((node) => {
        const hasChildren = node.children.length > 0
        const isOpen = expanded.has(node.id)
        const isSelected = selectedId === node.id
        const count = totalProductCount(node)

        return (
          <li key={node.id}>
            <div className="flex items-center gap-0.5">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggle(node.id)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={isOpen ? '접기' : '펼치기'}
                  aria-expanded={isOpen}
                >
                  <svg
                    className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <span className="w-6 shrink-0" />
              )}

              <button
                type="button"
                onClick={() => onSelect(node.id)}
                className={`flex flex-1 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                  isSelected
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{node.name}</span>
                <span className="shrink-0 text-xs text-slate-400">{count}</span>
              </button>
            </div>

            {hasChildren && isOpen && renderNodes(node.children, depth + 1)}
          </li>
        )
      })}
    </ul>
  )

  return (
    <nav aria-label="제품 카테고리">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`mb-2 w-full rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition ${
          selectedId === null ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        전체 제품
      </button>
      {renderNodes(nodes)}
    </nav>
  )
}
