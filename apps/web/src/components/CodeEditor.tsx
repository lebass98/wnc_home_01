import { useEffect, useRef } from 'react'
import { basicSetup } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

/**
 * 코드 편집기 — 줄 번호·문법 색·자동 들여쓰기·괄호 짝 맞추기를 지원한다.
 * 볼 때(readOnly)와 고칠 때 같은 화면을 쓰므로 코드가 늘 같은 모습으로 보인다.
 * 무거운 편집기이므로 코드 창을 열 때만 불러온다. (부르는 쪽에서 lazy 로 감싼다)
 */
export default function CodeEditor({
  value,
  onChange,
  readOnly = false,
  /** 이동할 줄 — 문법 오류 자리로 보낼 때 쓴다. 같은 줄을 다시 눌러도 움직이도록 객체로 받는다. */
  jump = null,
  className = '',
}: {
  value: string
  onChange?: (next: string) => void
  readOnly?: boolean
  jump?: { line: number } | null
  className?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const editable = useRef(new Compartment())
  // 최신 onChange 를 참조해, 편집기를 다시 만들지 않고도 바뀐 콜백을 쓴다.
  const notify = useRef(onChange)
  notify.current = onChange

  useEffect(() => {
    if (!host.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        javascript({ jsx: true, typescript: true }),
        oneDark,
        keymap.of([indentWithTab]),
        EditorView.lineWrapping,
        editable.current.of(EditorView.editable.of(!readOnly)),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) notify.current?.(u.state.doc.toString())
        }),
      ],
    })
    const instance = new EditorView({ state, parent: host.current })
    view.current = instance
    return () => {
      instance.destroy()
      view.current = null
    }
    // 편집기는 한 번만 만든다. 값·읽기전용 변경은 아래에서 따로 반영한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 바깥에서 값이 통째로 바뀐 경우(백업 복원·편집 취소)에만 갈아 끼운다.
  useEffect(() => {
    const v = view.current
    if (!v) return
    const current = v.state.doc.toString()
    if (current === value) return
    v.dispatch({ changes: { from: 0, to: current.length, insert: value } })
  }, [value])

  useEffect(() => {
    view.current?.dispatch({ effects: editable.current.reconfigure(EditorView.editable.of(!readOnly)) })
  }, [readOnly])

  // 오류 줄로 이동 — 그 줄을 골라 두면 어디가 문제인지 바로 보인다.
  useEffect(() => {
    const v = view.current
    if (!v || !jump) return
    if (jump.line < 1 || jump.line > v.state.doc.lines) return
    const line = v.state.doc.line(jump.line)
    v.dispatch({ selection: { anchor: line.from, head: line.to }, scrollIntoView: true })
    v.focus()
  }, [jump])

  return <div ref={host} className={`cm-wnc overflow-hidden rounded-lg text-[13px] ${className}`} />
}
