import { z } from 'zod'

/**
 * 예약 발행 — 글·페이지에 '공개 예약 시각(publishAt)'을 두고, 그 시각이 지나야 홈페이지에 보이게 한다.
 * 따로 도는 예약 작업 없이 조회할 때마다 시각을 비교하므로, 서버가 꺼져 있었어도 정확히 그 시각부터 보인다.
 */

/** 지금 공개돼 보여야 하는 것만 — 공개 상태 조건과 함께 where 에 넣는다. */
export function publishedNow() {
  return { OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] }
}

/** 공개로 저장했지만 예약 시각이 아직 오지 않았는지 */
export function isScheduled(row: { published: boolean; publishAt?: Date | null }): boolean {
  return row.published && !!row.publishAt && row.publishAt.getTime() > Date.now()
}

/** 입력 — ISO 시각 문자열. 비우면 null(예약 없음). */
export const publishAtSchema = z
  .string()
  .trim()
  .datetime({ offset: true, message: '예약 시각 형식이 올바르지 않습니다.' })
  .nullish()
  .or(z.literal('').transform(() => null))
  .transform((v) => (v ? new Date(v) : null))
