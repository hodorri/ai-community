import { SupabaseClient } from '@supabase/supabase-js'

/**
 * 자동 포인트 적립 함수
 * 중복 적립 방지: 같은 user_id + activity_type + reference_id 조합이면 무시
 */
export async function earnPoints(
  supabase: SupabaseClient,
  userId: string,
  activityType: string,
  referenceId?: string,
  description?: string
) {
  try {
    // 포인트 설정 조회
    const { data: setting } = await supabase
      .from('point_settings')
      .select('points, is_auto')
      .eq('activity_type', activityType)
      .single()

    if (!setting || !setting.is_auto || setting.points === 0) return null

    // 중복 체크
    if (referenceId) {
      const { data: existing } = await supabase
        .from('activity_points')
        .select('id')
        .eq('user_id', userId)
        .eq('activity_type', activityType)
        .eq('reference_id', referenceId)
        .maybeSingle()

      if (existing) return null // 이미 적립됨
    }

    const { data, error } = await supabase
      .from('activity_points')
      .insert({
        user_id: userId,
        points: setting.points,
        activity_type: activityType,
        description: description || null,
        reference_id: referenceId || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('포인트 적립 오류:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('포인트 적립 예외:', error)
    return null
  }
}
