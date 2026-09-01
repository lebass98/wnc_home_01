import { EmptyState, PageHeader } from '../../components/ui'

/** 게시판 신고현황 — 신고 접수 기능이 붙기 전까지는 빈 목록을 보여준다. */
export default function BoardReportsPage() {
  return (
    <>
      <PageHeader title="게시판 신고현황" description="이용자가 신고한 게시글과 댓글을 확인합니다." />

      <div className="card">
        <EmptyState label="접수된 신고가 없습니다. 신고 접수 기능은 아직 열려 있지 않습니다." />
      </div>
    </>
  )
}
