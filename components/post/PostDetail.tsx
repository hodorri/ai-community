'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import LikeButton from '@/components/ui/LikeButton'
import type { Post } from '@/lib/types/database'

interface PostDetailProps {
  post: Post & { user?: { email: string } }
  isLiked: boolean
  currentUserId?: string
}

export default function PostDetail({ post, isLiked: initialIsLiked, currentUserId }: PostDetailProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const router = useRouter()
  const isOwner = currentUserId === post.user_id

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const response = await fetch(`/api/posts/${post.id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      router.push('/')
      router.refresh()
    } else {
      alert('삭제에 실패했습니다.')
    }
  }

  return (
    <article className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{post.user?.email || '익명'}</span>
          <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
        </div>
      </div>

      {post.image_urls && post.image_urls.length > 0 && (
        <div className="mb-6 space-y-4">
          {post.image_urls.map((url, index) => (
            <div key={index} className="relative w-full h-96 bg-gray-200 rounded-lg overflow-hidden">
              <Image
                src={url}
                alt={`${post.title} 이미지 ${index + 1}`}
                fill
                className="object-contain"
              />
            </div>
          ))}
        </div>
      )}

      <div className="prose max-w-none mb-6">
        <p className="whitespace-pre-wrap">{post.content}</p>
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-4">
          <LikeButton
            postId={post.id}
            initialLiked={isLiked}
            initialCount={likesCount}
            onToggle={(liked, count) => {
              setIsLiked(liked)
              setLikesCount(count)
            }}
          />
          <span className="text-gray-600">댓글 {post.comments_count || 0}</span>
        </div>

        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/post/${post.id}/edit`)}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              수정
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
