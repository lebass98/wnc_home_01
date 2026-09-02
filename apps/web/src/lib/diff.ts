/**
 * 두 코드의 줄 단위 차이를 구한다.
 * 백업으로 되돌리기 전에 무엇이 바뀌는지 보여 주는 데 쓴다.
 */

export type DiffKind = 'same' | 'added' | 'removed'

export interface DiffLine {
  kind: DiffKind
  /** 바뀌기 전 코드에서의 줄 번호. 추가된 줄이면 null */
  oldNo: number | null
  /** 바뀐 뒤 코드에서의 줄 번호. 지워진 줄이면 null */
  newNo: number | null
  text: string
}

/** 앞뒤로 같은 줄이 아주 많을 수 있어, 가운데만 비교한다. */
const MAX_CELLS = 4_000_000

/**
 * 가운데 구간을 최장 공통 부분수열로 비교한다.
 * 구간이 너무 크면 통째로 '지우고 새로 넣음'으로 처리한다 (비교에 너무 오래 걸리지 않도록).
 */
function diffMiddle(a: string[], b: string[], offA: number, offB: number): DiffLine[] {
  if (a.length === 0 && b.length === 0) return []
  if (a.length === 0) return b.map((text, i) => ({ kind: 'added' as const, oldNo: null, newNo: offB + i + 1, text }))
  if (b.length === 0) return a.map((text, i) => ({ kind: 'removed' as const, oldNo: offA + i + 1, newNo: null, text }))

  if (a.length * b.length > MAX_CELLS) {
    return [
      ...a.map((text, i) => ({ kind: 'removed' as const, oldNo: offA + i + 1, newNo: null, text })),
      ...b.map((text, i) => ({ kind: 'added' as const, oldNo: null, newNo: offB + i + 1, text })),
    ]
  }

  // lcs[i][j] = a[i..] 와 b[j..] 의 공통 줄 수
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', oldNo: offA + i + 1, newNo: offB + j + 1, text: a[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ kind: 'removed', oldNo: offA + i + 1, newNo: null, text: a[i] })
      i++
    } else {
      out.push({ kind: 'added', oldNo: null, newNo: offB + j + 1, text: b[j] })
      j++
    }
  }
  while (i < a.length) {
    out.push({ kind: 'removed', oldNo: offA + i + 1, newNo: null, text: a[i] })
    i++
  }
  while (j < b.length) {
    out.push({ kind: 'added', oldNo: null, newNo: offB + j + 1, text: b[j] })
    j++
  }
  return out
}

/** 바뀌기 전(before)과 바뀐 뒤(after) 코드를 줄 단위로 비교한다. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n')
  const b = after.split('\n')

  // 앞뒤로 똑같은 줄은 비교에서 뺀다.
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let tail = 0
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++

  const out: DiffLine[] = []
  for (let i = 0; i < head; i++) out.push({ kind: 'same', oldNo: i + 1, newNo: i + 1, text: a[i] })
  out.push(...diffMiddle(a.slice(head, a.length - tail), b.slice(head, b.length - tail), head, head))
  for (let i = 0; i < tail; i++) {
    const oldNo = a.length - tail + i + 1
    out.push({ kind: 'same', oldNo, newNo: b.length - tail + i + 1, text: a[oldNo - 1] })
  }
  return out
}

/** 바뀐 줄 수 — 요약 문구에 쓴다. */
export function diffSummary(lines: DiffLine[]) {
  return {
    added: lines.filter((l) => l.kind === 'added').length,
    removed: lines.filter((l) => l.kind === 'removed').length,
  }
}

/**
 * 바뀐 곳 주변 몇 줄만 남기고 접는다.
 * 접힌 구간은 kind 'gap' 으로 표시해 '… n줄 같음' 으로 보여 준다.
 */
export interface DiffChunk {
  gap: number | null
  lines: DiffLine[]
}

export function collapseDiff(lines: DiffLine[], context = 3): DiffChunk[] {
  const keep = new Array<boolean>(lines.length).fill(false)
  lines.forEach((l, i) => {
    if (l.kind === 'same') return
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) keep[k] = true
  })

  const chunks: DiffChunk[] = []
  let i = 0
  while (i < lines.length) {
    if (keep[i]) {
      const start = i
      while (i < lines.length && keep[i]) i++
      chunks.push({ gap: null, lines: lines.slice(start, i) })
    } else {
      const start = i
      while (i < lines.length && !keep[i]) i++
      chunks.push({ gap: i - start, lines: [] })
    }
  }
  return chunks
}
