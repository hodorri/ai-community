-- AI Engineer 명단 테이블
CREATE TABLE IF NOT EXISTS ai_engineers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort text NOT NULL,
  employee_number text,
  name text NOT NULL,
  company text,
  department text,
  title text,
  position text,
  photo_url text,
  tier text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ai_engineers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai_engineers" ON ai_engineers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ai_engineers" ON ai_engineers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update ai_engineers" ON ai_engineers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete ai_engineers" ON ai_engineers FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_ai_engineers_cohort ON ai_engineers(cohort);
