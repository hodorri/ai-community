import Link from 'next/link'
import Image from 'next/image'
import type { Post } from '@/lib/types/database'

interface PostCardProps {
  post: Post & { user?: { email: string } }
}

export default function PostCard({ post }: PostCardProps) {
  const previewImage = post.image_urls && post.image_urls.length > 0 ? post.image_urls[0] : null

  return (
    <Link href={`/post/${post.id}`}>
      <article className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-ok-primary/20">
        {previewImage && (
          <div className="relative w-full h-48 bg-gray-200">
            <Image
              src={previewImage}
              alt={post.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="p-5">
          <h2 className="text-xl font-bold mb-2 text-gray-900 overflow-hidden text-ellipsis line-clamp-2 hover:text-ok-primary transition-colors">{post.title}</h2>
          <p className="text-gray-600 text-sm mb-4 overflow-hidden text-ellipsis line-clamp-3">{post.content}</p>
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <span className="font-medium">{post.user?.email || '익명'}</span>
            <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-ok-primary font-semibold">❤️ {post.likes_count || 0}</span>
            <span className="text-gray-600">💬 {post.comments_count || 0}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
