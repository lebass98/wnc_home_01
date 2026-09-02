import { Modal } from './ui'

/**
 * 관리자 안에서 실제 홈페이지 레이아웃(헤더·푸터 포함)으로 페이지를 본다.
 * 미발행 페이지도 preview=1 로 열면 로그인한 관리자에게는 보인다.
 */
export default function SitePreviewModal({
  slug,
  published,
  onClose,
}: {
  slug: string
  published: boolean
  onClose: () => void
}) {
  const src = `${import.meta.env.BASE_URL}page/${slug}?preview=1`
  return (
    <Modal
      title="실제 화면 미리보기"
      onClose={onClose}
      wide
      footer={
        <>
          <a href={src} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            새 창에서 열기
          </a>
          <button type="button" onClick={onClose} className="btn-primary">
            닫기
          </button>
        </>
      }
    >
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        저장된 내용 기준입니다. 고치는 중인 내용은 저장한 뒤에 보입니다.
        {!published && ' 미발행 상태라 방문자에게는 아직 보이지 않습니다.'}
      </p>
      <iframe
        src={src}
        title="실제 화면 미리보기"
        className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700"
      />
    </Modal>
  )
}
