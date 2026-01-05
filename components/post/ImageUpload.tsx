'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface ImageUploadProps {
  onImagesChange: (urls: string[]) => void
  existingImages?: string[]
  maxImages?: number
}

export default function ImageUpload({ onImagesChange, existingImages = [], maxImages }: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(existingImages)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // maxImages 제한 확인
    if (maxImages && images.length >= maxImages) {
      alert(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`)
      return
    }

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      alert('로그인이 필요합니다. 로그인 후 다시 시도해주세요.')
      return
    }

    setUploading(true)
    const newImageUrls: string[] = []
    const filesToProcess = maxImages 
      ? Array.from(files).slice(0, maxImages - images.length)
      : Array.from(files)

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name}은(는) 이미지 파일이 아닙니다.`)
        continue
      }

      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}은(는) 5MB 이하여야 합니다.`)
        continue
      }

      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        // post-images 버킷에 직접 업로드
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw new Error(`이미지 업로드에 실패했습니다: ${uploadError.message || '알 수 없는 오류'}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(uploadData.path)

        if (!publicUrl) {
          throw new Error('이미지 URL을 받지 못했습니다.')
        }

        newImageUrls.push(publicUrl)
      } catch (error) {
        console.error('이미지 업로드 오류:', error)
        alert(`${file.name} 업로드에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      }
    }

    const updatedImages = [...images, ...newImageUrls]
    setImages(updatedImages)
    onImagesChange(updatedImages)
    setUploading(false)
  }

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index)
    setImages(updatedImages)
    onImagesChange(updatedImages)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">이미지 첨부</label>
        <input
          type="file"
          accept="image/*"
          multiple={!maxImages || maxImages > 1}
          onChange={handleFileSelect}
          disabled={uploading || (maxImages ? images.length >= maxImages : false)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {maxImages && (
          <p className="text-xs text-gray-500 mt-1">
            {images.length}/{maxImages}개 이미지 업로드됨
          </p>
        )}
        {uploading && <p className="text-sm text-gray-500 mt-2">업로드 중...</p>}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative w-full h-32 bg-gray-200 rounded-md overflow-hidden">
                <Image
                  src={url}
                  alt={`업로드된 이미지 ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
