/**
 * 에디터에 한 번에 넣는 섹션 템플릿.
 * 편집기가 다루는 요소(제목·문단·목록·인용·표·이미지·링크)만 써서 넣은 뒤에도 그대로 고칠 수 있게 한다.
 * 2단·카드 구성은 표로 만든다 — 편집기에서 열·행을 늘리고 줄일 수 있다.
 */

export interface SectionTemplate {
  key: string
  label: string
  description: string
  html: string
}

/** 이미지 자리 — 회색 바탕에 안내 문구. 이미지를 눌러 바꾸거나 지우고 새로 넣는다. */
const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" font-family="sans-serif" font-size="28" fill="#64748b" text-anchor="middle" dominant-baseline="middle">이미지를 넣어 주세요</text></svg>',
  )

const cell = (inner: string) => `<td>${inner}</td>`

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    key: 'intro',
    label: '소개 문구',
    description: '작은 제목 + 소개 문단',
    html: `<h2>섹션 제목을 입력하세요</h2><p>이 섹션에서 전하고 싶은 내용을 두세 문장으로 적어 주세요. 방문자가 처음 읽는 부분이므로 핵심부터 씁니다.</p>`,
  },
  {
    key: 'text-image',
    label: '텍스트 + 이미지 2단',
    description: '왼쪽 이미지, 오른쪽 제목과 설명',
    html: `<table><tbody><tr>${cell(`<img src="${PLACEHOLDER_IMG}" alt="">`)}${cell(
      `<h3>소제목을 입력하세요</h3><p>이미지와 함께 보여 줄 설명입니다. 서비스의 특징이나 강점을 적어 주세요.</p><p><a href="/contact"><strong>자세히 보기 →</strong></a></p>`,
    )}</tr></tbody></table>`,
  },
  {
    key: 'cards',
    label: '카드 3개',
    description: '제목과 설명이 있는 카드 세 개',
    html: `<table><tbody><tr>${[1, 2, 3]
      .map((n) => cell(`<h3>특징 ${n}</h3><p>이 항목에 대한 짧은 설명을 적어 주세요.</p>`))
      .join('')}</tr></tbody></table>`,
  },
  {
    key: 'table',
    label: '표 (항목 · 내용)',
    description: '머리글이 있는 2열 표',
    html: `<table><tbody><tr><th>항목</th><th>내용</th></tr><tr>${cell('항목 1')}${cell('내용을 입력하세요')}</tr><tr>${cell(
      '항목 2',
    )}${cell('내용을 입력하세요')}</tr><tr>${cell('항목 3')}${cell('내용을 입력하세요')}</tr></tbody></table>`,
  },
  {
    key: 'steps',
    label: '단계 안내',
    description: '번호 목록으로 진행 순서 설명',
    html: `<h3>진행 절차</h3><ol><li><p><strong>문의 접수</strong> — 양식이나 전화로 문의를 남겨 주세요.</p></li><li><p><strong>상담·견적</strong> — 담당자가 범위와 일정을 확인해 드립니다.</p></li><li><p><strong>진행·완료</strong> — 확정된 내용대로 진행하고 결과를 전달합니다.</p></li></ol>`,
  },
  {
    key: 'faq',
    label: '자주 묻는 질문',
    description: '질문 · 답변 세 쌍',
    html: [1, 2, 3]
      .map(
        (n) =>
          `<h3>Q. 질문 ${n}을 입력하세요</h3><p>A. 답변을 입력하세요. 짧고 분명하게 쓰는 편이 읽기 좋습니다.</p>`,
      )
      .join(''),
  },
  {
    key: 'quote',
    label: '강조 인용',
    description: '핵심 문장을 인용구로',
    html: `<blockquote><p>강조하고 싶은 문장을 여기에 적어 주세요.</p></blockquote>`,
  },
  {
    key: 'cta',
    label: '문의 유도 (버튼 링크)',
    description: '안내 문장 + 문의하기 링크',
    html: `<hr><h3>더 궁금한 점이 있으신가요?</h3><p>언제든 편하게 문의해 주세요. 1영업일 안에 답변드립니다.</p><p><a href="/contact"><strong>문의하기 →</strong></a></p>`,
  },
]
