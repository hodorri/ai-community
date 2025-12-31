'use client'

import Image from 'next/image'

interface YutmanCharacterProps {
  size?: number
  className?: string
}

export default function YutmanCharacter({ size = 200, className = '' }: YutmanCharacterProps) {
  return (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <Image
        src="/okman3.png"
        alt="OK AI Community 읏맨 캐릭터"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  )
}
