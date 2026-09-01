/**
 * 관리자가 작성한 상세 본문 HTML 을 렌더링한다.
 * 저장 시 편집기에서 허용 태그만 만들어지지만, 표시 직전에도 한 번 더 정리한다.
 */

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'CODE', 'PRE',
  'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR',
  'A', 'IMG', 'SPAN', 'DIV',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'target', 'rel']),
  IMG: new Set(['src', 'alt', 'title']),
}

/** script/onclick/javascript: 등 실행 가능한 요소를 제거한다. */
function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''

  const walk = (el: Element) => {
    for (const child of [...el.children]) {
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.remove()
        continue
      }
      const allowed = ALLOWED_ATTRS[child.tagName] ?? new Set<string>()
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase()
        if (!allowed.has(name)) {
          child.removeAttribute(attr.name)
          continue
        }
        // javascript: 스킴 차단
        if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(attr.value)) {
          child.removeAttribute(attr.name)
        }
      }
      // 외부 링크는 새 탭 + noopener 로 연다.
      if (child.tagName === 'A' && child.getAttribute('href')?.startsWith('http')) {
        child.setAttribute('target', '_blank')
        child.setAttribute('rel', 'noopener noreferrer')
      }
      walk(child)
    }
  }
  walk(root)
  return root.innerHTML
}

export default function RichText({ html, className = '' }: { html: string; className?: string }) {
  if (!html?.trim()) {
    return <p className="text-sm text-slate-500">등록된 상세 내용이 없습니다.</p>
  }
  return (
    <div
      className={`prose-wnc ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitize(html) }}
    />
  )
}
