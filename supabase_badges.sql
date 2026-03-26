-- 뱃지 정의 테이블
CREATE TABLE IF NOT EXISTS badge_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  image_path text NOT NULL,
  sort_order integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read badge definitions" ON badge_definitions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update badge definitions" ON badge_definitions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert badge definitions" ON badge_definitions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 초기 뱃지 데이터
INSERT INTO badge_definitions (id, name, image_path, sort_order) VALUES
  ('first-step', '첫발을 떼다!', '/badges/first-step.png', 1),
  ('hot-learner', '불꽃 열공러!', '/badges/hot-learner.png', 2),
  ('data-alchemist', '데이터 연금술사', '/badges/data-alchemist.png', 3),
  ('inssa-inspirer', '인싸 앤 영감러', '/badges/inssa-inspirer.png', 4),
  ('prompt-chef', '김에선 요리사', '/badges/prompt-chef.png', 5),
  ('prompt-master', '프롬프트 장인', '/badges/prompt-master.png', 6),
  ('bug-hunter', '버그 사냥꾼', '/badges/bug-hunter.png', 7),
  ('idea-bank', '아이디어 뱅크', '/badges/idea-bank.png', 8)
ON CONFLICT (id) DO NOTHING;

-- 유저 뱃지 부여 테이블
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id text NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert user badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete user badges" ON user_badges FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
