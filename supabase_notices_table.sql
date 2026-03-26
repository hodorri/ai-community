-- 공지사항 테이블 생성
CREATE TABLE IF NOT EXISTS notices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  image_urls text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 공지사항 댓글 테이블
CREATE TABLE IF NOT EXISTS notice_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  notice_id uuid REFERENCES notices(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES notice_comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 공지사항 좋아요 테이블
CREATE TABLE IF NOT EXISTS notice_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  notice_id uuid REFERENCES notices(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(notice_id, user_id)
);

-- RLS 활성화
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_likes ENABLE ROW LEVEL SECURITY;

-- notices 정책: 누구나 읽기, 관리자만 쓰기/수정/삭제
CREATE POLICY "Anyone can read notices" ON notices FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert notices" ON notices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update notices" ON notices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete notices" ON notices FOR DELETE USING (auth.uid() = user_id);

-- notice_comments 정책
CREATE POLICY "Anyone can read notice comments" ON notice_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert notice comments" ON notice_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update notice comments" ON notice_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete notice comments" ON notice_comments FOR DELETE USING (auth.uid() = user_id);

-- notice_likes 정책
CREATE POLICY "Anyone can read notice likes" ON notice_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert notice likes" ON notice_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can delete notice likes" ON notice_likes FOR DELETE USING (auth.uid() = user_id);
