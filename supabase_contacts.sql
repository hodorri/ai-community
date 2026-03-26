-- 문의 테이블
CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  employee_number text,
  content text NOT NULL,
  contact_info text NOT NULL,
  is_resolved boolean DEFAULT false,
  admin_reply text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert contacts" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read contacts" ON contacts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update contacts" ON contacts FOR UPDATE USING (auth.uid() IS NOT NULL);
