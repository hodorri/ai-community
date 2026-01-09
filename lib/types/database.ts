export type Post = {
  id: string
  user_id: string
  title: string
  content: string
  image_urls: string[]
  is_pinned?: boolean
  created_at: string
  updated_at: string
  published_at?: string | null
  author_name?: string | null
  ai_engineer_cohort?: string | null
  user?: {
    email: string
  }
  likes_count?: number
  comments_count?: number
}

export type Profile = {
  id: string
  email: string | null
  name?: string | null
  nickname?: string | null
  avatar_url?: string | null
  employee_number?: string | null
  company?: string | null
  team?: string | null
  position?: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id?: string | null
  created_at: string
  updated_at: string
  user?: {
    email: string
    name?: string
    nickname?: string
    avatar_url?: string
    company?: string
    team?: string
    position?: string
  }
  replies?: Comment[]
}

export type Like = {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export type CoP = {
  id: string
  user_id: string
  name: string
  description?: string | null
  image_url?: string | null
  max_members: number
  activity_plan?: string | null
  ai_tools?: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  user?: {
    email: string
    name?: string
    nickname?: string
  }
}

export type News = {
  id: string
  title: string
  content: string
  source_url?: string | null
  source_site?: string | null
  author_name?: string | null
  user_id?: string | null
  image_url?: string | null
  published_at?: string | null
  is_manual: boolean
  is_pinned?: boolean
  created_at: string
  updated_at: string
  user?: {
    email: string
    name?: string
    nickname?: string
    avatar_url?: string | null
    company?: string | null
    team?: string | null
    position?: string | null
  }
  likes_count?: number
  comments_count?: number
}

export type NewsLike = {
  id: string
  news_id: string
  user_id: string
  created_at: string
}

export type NewsComment = {
  id: string
  news_id: string
  user_id: string
  content: string
  parent_id?: string | null
  created_at: string
  updated_at: string
  user?: {
    email: string
    name?: string
    nickname?: string
    avatar_url?: string | null
    company?: string | null
    team?: string | null
    position?: string | null
  }
  replies?: NewsComment[]
}

export type CrawledNews = {
  id: string
  title: string
  content: string
  source_url?: string | null
  source_site?: string | null
  author_name?: string | null
  image_url?: string | null
  published_at?: string | null
  uploaded_by: string
  uploaded_at: string
  is_published: boolean
  published_to_news_id?: string | null
  created_at: string
  updated_at: string
}

export type Greeting = {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user?: {
    email: string
    name?: string
    nickname?: string
    avatar_url?: string | null
    company?: string | null
    team?: string | null
    position?: string | null
  }
  likes_count?: number
  comments_count?: number
}

export type GreetingLike = {
  id: string
  greeting_id: string
  user_id: string
  created_at: string
}

export type GreetingComment = {
  id: string
  greeting_id: string
  user_id: string
  content: string
  parent_id?: string | null
  created_at: string
  updated_at: string
  user?: {
    email: string
    name?: string
    nickname?: string
    avatar_url?: string | null
    company?: string | null
    team?: string | null
    position?: string | null
  }
  replies?: GreetingComment[]
}
