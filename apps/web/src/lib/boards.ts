import { useEffect, useState } from 'react'
import type { Board } from '@wnc/shared'
import { BOARD_CATEGORY_LABEL } from '@wnc/shared'
import { api, qs } from './api'

/** 게시판 목록은 화면마다 다시 받지 않도록 한 번만 불러 온다. */
let publicPromise: Promise<Board[]> | null = null

function loadBoards(includeHidden: boolean): Promise<Board[]> {
  if (includeHidden) return api<Board[]>(`/boards${qs({ includeHidden: 1 })}`, { auth: true })
  publicPromise ??= api<Board[]>('/boards')
  return publicPromise
}

/** 관리자 화면에서 게시판을 고치면 공개 목록 캐시를 버린다. */
export function clearBoardCache() {
  publicPromise = null
}

/**
 * 게시판 목록을 준다.
 * @param includeHidden 관리자 화면에서 감춘 게시판까지 볼 때 true (캐시하지 않는다)
 */
export function useBoards(includeHidden = false) {
  const [boards, setBoards] = useState<Board[]>([])

  useEffect(() => {
    let alive = true
    loadBoards(includeHidden)
      .then((list) => alive && setBoards(list))
      .catch(() => alive && setBoards([]))
    return () => {
      alive = false
    }
  }, [includeHidden])

  return boards
}

/** slug 로 게시판 이름을 찾는다. 아직 목록을 못 받았으면 기본 이름을 쓴다. */
export function boardName(boards: Board[], slug: string): string {
  return boards.find((b) => b.slug === slug)?.name ?? BOARD_CATEGORY_LABEL[slug] ?? slug
}
