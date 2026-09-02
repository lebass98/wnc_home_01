import { useState, type KeyboardEvent } from 'react'

/** 분류처럼 여러 값을 태그로 입력받는다. Enter 또는 쉼표로 추가한다. */
export default function TagInput({
  id,
  value,
  onChange,
  placeholder = '검색 또는 입력...',
  max = 50,
}: {
  id: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  max?: number
}) {
  const [draft, setDraft] = useState('')

  function add(raw: string) {
    const name = raw.trim()
    if (!name) return
    // 같은 이름을 두 번 넣지 않는다.
    if (value.includes(name)) {
      setDraft('')
      return
    }
    if (value.length >= max) return
    onChange([...value, name])
    setDraft('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
      return
    }
    // 입력이 비어 있을 때 backspace 를 누르면 마지막 태그를 지운다.
    if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-sm
                         font-medium text-brand-700 ring-1 ring-inset ring-brand-200
                         dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`${tag} 분류 제거`}
                className="grid h-5 w-5 place-items-center rounded-full hover:bg-brand-100 dark:hover:bg-brand-500/20"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => add(draft)}
        placeholder={placeholder}
        className="input"
      />
    </div>
  )
}
