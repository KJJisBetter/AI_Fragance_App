import { Star } from 'lucide-react'
import type React from 'react'

interface RatingProps {
  value: number
  className?: string
}

export const Rating: React.FC<RatingProps> = ({ value, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 font-bold ${className}`}>
      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
      <span>{value.toFixed(1)}</span>
    </div>
  )
}
