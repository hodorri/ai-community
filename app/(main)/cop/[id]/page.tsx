import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CopDetailClient from '@/components/cop/CopDetailClient'

interface CopDetailPageProps {
  params: {
    id: string
  }
}

export default async function CopDetailPage({ params }: CopDetailPageProps) {
  const supabase = await createClient()
  const { id } = params

  // CoP 정보 조회
  const { data: cop, error } = await supabase
    .from('cops')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (error || !cop) {
    redirect('/dashboard?tab=study')
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <CopDetailClient cop={cop} />
    </div>
  )
}
