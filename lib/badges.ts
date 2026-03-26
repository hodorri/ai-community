export interface BadgeInfo {
  id: string
  name: string
  image: string
}

// 초기 기본값 (DB 로드 전 fallback)
export const DEFAULT_BADGES: BadgeInfo[] = [
  { id: 'first-step', name: '첫발을 떼다!', image: '/badges/first-step.png' },
  { id: 'hot-learner', name: '불꽃 열공러!', image: '/badges/hot-learner.png' },
  { id: 'data-alchemist', name: '데이터 연금술사', image: '/badges/data-alchemist.png' },
  { id: 'inssa-inspirer', name: '인싸 앤 영감러', image: '/badges/inssa-inspirer.png' },
  { id: 'prompt-chef', name: '김에선 요리사', image: '/badges/prompt-chef.png' },
  { id: 'prompt-master', name: '프롬프트 장인', image: '/badges/prompt-master.png' },
  { id: 'bug-hunter', name: '버그 사냥꾼', image: '/badges/bug-hunter.png' },
  { id: 'idea-bank', name: '아이디어 뱅크', image: '/badges/idea-bank.png' },
]

// BADGES는 하위 호환을 위해 유지
export const BADGES = DEFAULT_BADGES
