export type Post = {
  id: string
  user_id: string
  title: string
  content: string
  image_urls: string[]
  created_at: string
  updated_at: string
  user?: {
    email: string
  }
  likes_count?: number
  comments_count?: number
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user?: {
    email: string
  }
}

export type Like = {
  id: string
  post_id: string
  user_id: string
  created_at: string
}
