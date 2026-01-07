import CasePageClient from '@/components/cases/CasePageClient'

export default function CasePage({ params }: { params: { id: string } }) {
  return <CasePageClient caseId={params.id} />
}
