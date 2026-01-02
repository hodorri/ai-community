'use client'

interface YutmanCharacterProps {
  size?: number
  className?: string
}

export default function YutmanCharacter({ size = 200, className = '' }: YutmanCharacterProps) {
  return (
    <div 
      className={`inline-block ${className}`} 
      style={{ 
        width: size, 
        height: size, 
        background: 'transparent',
        position: 'relative'
      }}
    >
      <img
        src="/okman4.png"
        alt="OK AI Community 읏맨 캐릭터"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        style={{ 
          background: 'transparent !important',
          backgroundColor: 'transparent !important',
          mixBlendMode: 'normal',
          imageRendering: 'auto',
          display: 'block'
        }}
        onError={(e) => {
          console.error('이미지 로드 실패:', e)
        }}
      />
    </div>
  )
}
