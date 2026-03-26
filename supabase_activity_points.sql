-- 활동 포인트 내역 테이블
CREATE TABLE IF NOT EXISTS activity_points (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  points integer NOT NULL,
  activity_type text NOT NULL,
  description text,
  reference_id text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 포인트 설정 테이블 (활동별 포인트 값)
CREATE TABLE IF NOT EXISTS point_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type text UNIQUE NOT NULL,
  label text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  is_auto boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS 활성화
ALTER TABLE activity_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_settings ENABLE ROW LEVEL SECURITY;

-- activity_points 정책
CREATE POLICY "Anyone can read activity points" ON activity_points FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert activity points" ON activity_points FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete own points" ON activity_points FOR DELETE USING (auth.uid() = created_by);

-- point_settings 정책
CREATE POLICY "Anyone can read point settings" ON point_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update point settings" ON point_settings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert point settings" ON point_settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 기본 포인트 설정 데이터
INSERT INTO point_settings (activity_type, label, points, is_auto) VALUES
  ('post_create', '개발일지 작성', 10, true),
  ('comment_create', '댓글 작성', 3, true),
  ('like_received', '좋아요 받음', 1, true),
  ('cop_join', 'CoP 가입', 5, true),
  ('cop_create', 'CoP 개설', 15, true),
  ('instructor', '사내강사 활동', 20, false),
  ('manual', '관리자 수동 부과', 0, false)
ON CONFLICT (activity_type) DO NOTHING;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_activity_points_user_id ON activity_points(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_points_activity_type ON activity_points(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_points_created_at ON activity_points(created_at);
