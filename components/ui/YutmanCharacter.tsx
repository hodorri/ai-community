'use client'

interface YutmanCharacterProps {
  size?: number
  className?: string
  imagePath?: string
}

export default function YutmanCharacter({ size = 200, className = '', imagePath = '/logo2.png' }: YutmanCharacterProps) {
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
        src={imagePath}
        alt="OK AI Community 로고"
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
