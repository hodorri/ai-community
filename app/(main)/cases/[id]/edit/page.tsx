import CaseEditClient from '@/components/cases/CaseEditClient'

export default function CaseEditPage({ params }: { params: { id: string } }) {
  return <CaseEditClient caseId={params.id} />
}

