-- CoP 활동일지 테이블
CREATE TABLE IF NOT EXISTS cop_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cop_id uuid REFERENCES cops(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  image_urls text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- CoP 활동일지 댓글
CREATE TABLE IF NOT EXISTS cop_log_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cop_log_id uuid REFERENCES cop_logs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES cop_log_comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- CoP 활동일지 좋아요
CREATE TABLE IF NOT EXISTS cop_log_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cop_log_id uuid REFERENCES cop_logs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(cop_log_id, user_id)
);

-- RLS
ALTER TABLE cop_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cop_log_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cop_log_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cop logs" ON cop_logs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert cop logs" ON cop_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update cop logs" ON cop_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete cop logs" ON cop_logs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read cop log comments" ON cop_log_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert cop log comments" ON cop_log_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update cop log comments" ON cop_log_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete cop log comments" ON cop_log_comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read cop log likes" ON cop_log_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert cop log likes" ON cop_log_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can delete cop log likes" ON cop_log_likes FOR DELETE USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_cop_logs_cop_id ON cop_logs(cop_id);
CREATE INDEX IF NOT EXISTS idx_cop_logs_user_id ON cop_logs(user_id);
