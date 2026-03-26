import NoticePageClient from '@/components/notice/NoticePageClient'

export default function NoticePage({ params }: { params: { id: string } }) {
  return <NoticePageClient noticeId={params.id} />
}
