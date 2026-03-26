-- 뱃지 정의 테이블
CREATE TABLE IF NOT EXISTS badge_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  image_path text NOT NULL,
  sort_order integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read badge definitions" ON badge_definitions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update badge definitions" ON badge_definitions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert badge definitions" ON badge_definitions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 기존 테이블에 description 컬럼 추가 (이미 테이블이 있는 경우)
ALTER TABLE badge_definitions ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- 초기 뱃지 데이터
INSERT INTO badge_definitions (id, name, description, image_path, sort_order) VALUES
  ('first-step', '첫발을 떼다!', '첫 게시글을 작성한 커뮤니티 신규 멤버', '/badges/first-step.png', 1),
  ('hot-learner', '불꽃 열공러!', '학습 관련 게시글을 꾸준히 작성한 열정러', '/badges/hot-learner.png', 2),
  ('data-alchemist', '데이터 연금술사', '데이터를 활용한 우수 게시글을 작성한 분석가', '/badges/data-alchemist.png', 3),
  ('inssa-inspirer', '인싸 앤 영감러', '댓글과 소통으로 커뮤니티를 활발하게 만드는 인싸', '/badges/inssa-inspirer.png', 4),
  ('prompt-chef', '김에선 요리사', '프롬프트 레시피를 공유한 요리사', '/badges/prompt-chef.png', 5),
  ('prompt-master', '프롬프트 장인', '뛰어난 프롬프트 엔지니어링 실력을 보여준 장인', '/badges/prompt-master.png', 6),
  ('bug-hunter', '버그 사냥꾼', '버그를 발견하고 제보하여 서비스 개선에 기여', '/badges/bug-hunter.png', 7),
  ('idea-bank', '아이디어 뱅크', '창의적인 아이디어를 다수 제안한 아이디어 뱅크', '/badges/idea-bank.png', 8)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description;

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
