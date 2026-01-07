-- profiles 테이블 RLS 정책 확인 및 수정

-- 1. 현재 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 2. INSERT 정책 추가 (자신의 프로필만 생성 가능)
-- 이 정책은 트리거가 작동하지 않을 경우를 대비한 백업
CREATE POLICY IF NOT EXISTS "Users can insert own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 3. UPDATE 정책 확인 (이미 있어야 함)
-- "Users can update own profile" 정책이 있는지 확인

-- 4. 트리거 확인
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 5. 트리거 함수 확인
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
