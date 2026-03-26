-- 관리자 삭제/수정 RLS 정책 추가
-- 관리자 이메일로 식별 (profiles 테이블 조인)

-- posts: 관리자 삭제/수정 허용
CREATE POLICY "Admin can delete any post" ON posts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email = current_setting('app.admin_email', true)
  )
);

-- 위 방식은 복잡하므로, 더 간단한 접근: service_role은 이미 RLS 무시함
-- 프론트엔드에서 API 라우트(서버)를 통해 삭제하면 됨
-- 하지만 클라이언트에서 직접 삭제하는 경우를 위해 아래 정책 추가

-- comments
DROP POLICY IF EXISTS "Owner can update comments" ON comments;
DROP POLICY IF EXISTS "Owner can delete comments" ON comments;
CREATE POLICY "Owner or admin can update comments" ON comments FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));
CREATE POLICY "Owner or admin can delete comments" ON comments FOR DELETE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));

-- posts
DROP POLICY IF EXISTS "Owner can update posts" ON posts;
DROP POLICY IF EXISTS "Owner can delete posts" ON posts;
CREATE POLICY "Owner or admin can update posts" ON posts FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));
CREATE POLICY "Owner or admin can delete posts" ON posts FOR DELETE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));

-- greeting comments
DROP POLICY IF EXISTS "Owner can update greeting comments" ON greeting_comments;
DROP POLICY IF EXISTS "Owner can delete greeting comments" ON greeting_comments;
CREATE POLICY "Owner or admin can update greeting comments" ON greeting_comments FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));
CREATE POLICY "Owner or admin can delete greeting comments" ON greeting_comments FOR DELETE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));

-- greetings
DROP POLICY IF EXISTS "Owner can update greetings" ON greetings;
DROP POLICY IF EXISTS "Owner can delete greetings" ON greetings;
CREATE POLICY "Owner or admin can update greetings" ON greetings FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));
CREATE POLICY "Owner or admin can delete greetings" ON greetings FOR DELETE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));

-- news comments
DROP POLICY IF EXISTS "Owner can update news comments" ON news_comments;
DROP POLICY IF EXISTS "Owner can delete news comments" ON news_comments;
CREATE POLICY "Owner or admin can update news comments" ON news_comments FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));
CREATE POLICY "Owner or admin can delete news comments" ON news_comments FOR DELETE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));

-- case comments
DROP POLICY IF EXISTS "Owner can update case comments" ON case_comments;
DROP POLICY IF EXISTS "Owner can delete case comments" ON case_comments;
CREATE POLICY "Owner or admin can update case comments" ON case_comments FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));
CREATE POLICY "Owner or admin can delete case comments" ON case_comments FOR DELETE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));

-- notice comments
DROP POLICY IF EXISTS "Owner can update notice comments" ON notice_comments;
DROP POLICY IF EXISTS "Owner can delete notice comments" ON notice_comments;
CREATE POLICY "Owner or admin can update notice comments" ON notice_comments FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));
CREATE POLICY "Owner or admin can delete notice comments" ON notice_comments FOR DELETE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));

-- cop logs
DROP POLICY IF EXISTS "Owner can update cop logs" ON cop_logs;
DROP POLICY IF EXISTS "Owner can delete cop logs" ON cop_logs;
CREATE POLICY "Owner or admin can update cop logs" ON cop_logs FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));
CREATE POLICY "Owner or admin can delete cop logs" ON cop_logs FOR DELETE
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));

-- activity_points: 관리자 삭제 허용
DROP POLICY IF EXISTS "Authenticated users can delete own points" ON activity_points;
CREATE POLICY "Owner or admin can delete points" ON activity_points FOR DELETE
USING (auth.uid() = created_by OR auth.uid() IN (SELECT id FROM profiles WHERE email = 'qvecamour@gmail.com'));
