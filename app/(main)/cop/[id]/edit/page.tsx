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

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // CoP 정보 조회
  const { data: cop, error } = await supabase
    .from('cops')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cop) {
    redirect('/dashboard?tab=study')
  }

  // 개설자 또는 관리자만 수정 가능
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  const isOwner = user.id === cop.user_id
  const isAdmin = profile?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  if (!isOwner && !isAdmin) {
    redirect(`/cop/${id}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <CopEditClient cop={cop} />
    </div>
  )
}
