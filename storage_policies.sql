-- Storage 버킷 RLS 정책 설정
-- avatars 버킷 정책 (프로필 이미지 및 일반 파일 업로드용)

-- 1. 누구나 이미지 조회 가능
CREATE POLICY IF NOT EXISTS "Anyone can view avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- 2. 인증된 사용자는 자신의 폴더에 파일 업로드 가능
CREATE POLICY IF NOT EXISTS "Authenticated users can upload to avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. 사용자는 자신의 파일만 삭제 가능
CREATE POLICY IF NOT EXISTS "Users can delete own files in avatars" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. 사용자는 자신의 파일만 업데이트 가능
CREATE POLICY IF NOT EXISTS "Users can update own files in avatars" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- post-images 버킷 정책 (게시글 이미지용)

-- 1. 누구나 이미지 조회 가능
CREATE POLICY IF NOT EXISTS "Anyone can view images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'post-images');

-- 2. 인증된 사용자는 이미지 업로드 가능
CREATE POLICY IF NOT EXISTS "Authenticated users can upload images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'post-images' 
  AND auth.role() = 'authenticated'
);

-- 3. 사용자는 자신의 이미지만 삭제 가능
CREATE POLICY IF NOT EXISTS "Users can delete own images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'post-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
