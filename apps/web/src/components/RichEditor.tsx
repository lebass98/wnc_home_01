import { useCallback, useRef } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { IS_DEMO } from '../lib/api'

/** 툴바 버튼 — 활성 상태를 시각적으로 구분한다. */
function ToolButton({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // 에디터 포커스를 잃지 않도록
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`grid h-8 min-w-[2rem] place-items-center rounded px-2 text-sm font-medium transition disabled:opacity-40 ${
        active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null)

  /** 본문 이미지 삽입 — 데모 모드에서는 base64, 실제 환경에서는 업로드 API 를 쓴다. */
  const insertImage = useCallback(
    async (file: File) => {
      try {
        if (IS_DEMO) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
            reader.readAsDataURL(file)
          })
          editor.chain().focus().setImage({ src: dataUrl }).run()
          return
        }
        const form = new FormData()
        form.append('file', file)
        const token = localStorage.getItem('wnc_admin_token')
        const res = await fetch('/api/uploads', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? '업로드에 실패했습니다.')
        editor.chain().focus().setImage({ src: data.url }).run()
      } catch (e) {
        alert((e as Error).message)
      }
    },
    [editor],
  )

  function handleLink() {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('링크 주소를 입력하세요. (비우면 링크 해제)', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-300 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-900/50">
      <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게">
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임">
        <span className="italic">I</span>
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선">
        <span className="line-through">S</span>
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="인라인 코드">
        {'</>'}
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />

      {([2, 3, 4] as const).map((level) => (
        <ToolButton
          key={level}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          active={editor.isActive('heading', { level })}
          title={`제목 ${level}`}
        >
          H{level}
        </ToolButton>
      ))}
      <ToolButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="본문">
        본문
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />

      <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 목록">
        • 목록
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">
        1. 목록
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용">
        &ldquo;
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">
        —
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />

      <ToolButton onClick={handleLink} active={editor.isActive('link')} title="링크">
        링크
      </ToolButton>
      <ToolButton onClick={() => fileRef.current?.click()} title="이미지 삽입">
        이미지
      </ToolButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) insertImage(file)
          e.target.value = ''
        }}
      />

      <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />

      <ToolButton onClick={() => editor.chain().focus().undo().run()} title="실행 취소" disabled={!editor.can().undo()}>
        ↶
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().redo().run()} title="다시 실행" disabled={!editor.can().redo()}>
        ↷
      </ToolButton>
    </div>
  )
}

export default function RichEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg' } }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    // 내용이 바뀔 때마다 상위 폼 상태에 HTML 을 반영한다.
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose-wnc min-h-[20rem] max-w-none px-4 py-3 focus:outline-none',
      },
    },
  })

  if (!editor) {
    return <div className="rounded-lg border border-slate-300 p-4 text-sm text-slate-500 dark:text-slate-400">편집기 불러오는 중...</div>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 dark:border-slate-600">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
