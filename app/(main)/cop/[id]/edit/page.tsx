import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CopEditClient from '@/components/cop/CopEditClient'

interface CopEditPageProps {
  params: {
    id: string
  }
}

export default async function CopEditPage({ params }: CopEditPageProps) {
  const supabase = await createClient()
  const { id } = params

  // CoP 정보 조회 (인증 체크는 클라이언트에서 처리)
  const { data: cop, error: copError } = await supabase
    .from('cops')
    .select('*')
    .eq('id', id)
    .single()

  if (copError) {
    console.error('CoP 조회 오류:', copError)
    redirect('/dashboard?tab=study')
  }

  if (!cop) {
    redirect('/dashboard?tab=study')
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <CopEditClient cop={cop} />
    </div>
  )
}
