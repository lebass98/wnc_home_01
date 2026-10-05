import { componentSettingsSchema, defaultComponentResponse, type ComponentKey, type ComponentSettings } from '@wnc/shared'
import { prisma } from './prisma.js'

/**
 * 템플릿의 컴포넌트 설정 — 헤더·푸터 옵션, 메인·서브 비주얼 같은 디자인 값을 DB 와 주고받는다.
 *
 * 이 값들은 화면 파일이 아니라 설정이라, 템플릿 파일만 바꾸면 이전 템플릿의 값이 그대로 남는다.
 * (인테리어를 켜도 히어로 사진이 Basic 의 것으로 보이던 문제) 그래서 템플릿을 끌 때 담고, 켤 때 되살린다.
 */

const KEYS = componentSettingsSchema.keyof().options as ComponentKey[]

/** 지금 사이트에 적용된 설정 — 저장된 값이 없는 항목은 기본값이다. */
export async function readSiteComponents(): Promise<ComponentSettings> {
  const result = defaultComponentResponse().settings
  for (const row of await prisma.componentSetting.findMany()) {
    const key = KEYS.find((k) => k === row.key)
    if (!key) continue
    try {
      const parsed = componentSettingsSchema.shape[key].safeParse(JSON.parse(row.value))
      if (parsed.success) Object.assign(result, { [key]: parsed.data })
    } catch {
      // 깨진 값은 기본값으로 둔다.
    }
  }
  return result
}

/** 템플릿 파일의 값을 검증한다 — 규격에 맞지 않으면 null. */
export function parseComponents(raw: unknown): ComponentSettings | null {
  const parsed = componentSettingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/**
 * 설정을 사이트에 적용한다. 판(revision)을 올려, [컴포넌트 관리]를 열어 둔 화면이
 * 옛 값으로 덮어쓰지 못하고 최신 값을 다시 불러오게 한다.
 */
export async function applySiteComponents(settings: ComponentSettings): Promise<void> {
  await prisma.$transaction(
    KEYS.map((key) =>
      prisma.componentSetting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(settings[key]) },
        update: { value: JSON.stringify(settings[key]), revision: { increment: 1 } },
      }),
    ),
  )
}
