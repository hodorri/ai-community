import PostPageClient from '@/components/post/PostPageClient'

export default function PostPage({ params }: { params: { id: string } }) {
  return <PostPageClient postId={params.id} />
}
