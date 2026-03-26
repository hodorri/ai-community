export interface BadgeInfo {
  id: string
  name: string
  image: string
  description?: string
}

// 초기 기본값 (DB 로드 전 fallback)
export const DEFAULT_BADGES: BadgeInfo[] = [
  { id: 'first-step', name: '첫발을 떼다!', image: '/badges/first-step.png', description: '첫 게시글을 작성한 커뮤니티 신규 멤버' },
  { id: 'hot-learner', name: '불꽃 열공러!', image: '/badges/hot-learner.png', description: '학습 관련 게시글을 꾸준히 작성한 열정러' },
  { id: 'data-alchemist', name: '데이터 연금술사', image: '/badges/data-alchemist.png', description: '데이터를 활용한 우수 게시글을 작성한 분석가' },
  { id: 'inssa-inspirer', name: '인싸 앤 영감러', image: '/badges/inssa-inspirer.png', description: '댓글과 소통으로 커뮤니티를 활발하게 만드는 인싸' },
  { id: 'prompt-chef', name: '김에선 요리사', image: '/badges/prompt-chef.png', description: '프롬프트 레시피를 공유한 요리사' },
  { id: 'prompt-master', name: '프롬프트 장인', image: '/badges/prompt-master.png', description: '뛰어난 프롬프트 엔지니어링 실력을 보여준 장인' },
  { id: 'bug-hunter', name: '버그 사냥꾼', image: '/badges/bug-hunter.png', description: '버그를 발견하고 제보하여 서비스 개선에 기여' },
  { id: 'idea-bank', name: '아이디어 뱅크', image: '/badges/idea-bank.png', description: '창의적인 아이디어를 다수 제안한 아이디어 뱅크' },
]

// BADGES는 하위 호환을 위해 유지
export const BADGES = DEFAULT_BADGES
