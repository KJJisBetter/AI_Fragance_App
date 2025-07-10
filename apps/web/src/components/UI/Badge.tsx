import type React from 'react'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ children, className = '' }) => {
  return (
    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${className}`}>
      {children}
    </span>
  )
}
