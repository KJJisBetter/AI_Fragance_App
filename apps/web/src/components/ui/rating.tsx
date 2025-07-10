import { Star, StarHalf } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingProps {
  value: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  reviewCount?: number
  className?: string
  variant?: 'default' | 'luxury' | 'minimal'
}

export const Rating: React.FC<RatingProps> = ({
  value,
  maxRating = 5,
  size = 'md',
  showValue = false,
  reviewCount,
  className,
  variant = 'default',
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const renderStars = () => {
    const stars = []

    for (let i = 1; i <= maxRating; i++) {
      const filled = value >= i
      const halfFilled = value >= i - 0.5 && value < i

      stars.push(
        <div key={i} className="relative">
          {halfFilled ? (
            <StarHalf
              className={cn(
                sizeClasses[size],
                variant === 'luxury' ? 'fill-amber-400 text-amber-400' : 'fill-yellow-400 text-yellow-400'
              )}
            />
          ) : (
            <Star
              className={cn(
                sizeClasses[size],
                filled
                  ? variant === 'luxury'
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-200 text-gray-200'
              )}
            />
          )}
        </div>
      )
    }

    return stars
  }

  const baseClasses = cn(
    'flex items-center gap-1',
    variant === 'luxury' && 'filter drop-shadow-sm',
    className
  )

  return (
    <div className={baseClasses}>
      <div className="flex items-center gap-0.5">
        {renderStars()}
      </div>

      {showValue && (
        <span className={cn(
          'font-medium',
          textSizes[size],
          variant === 'luxury' ? 'text-amber-700' : 'text-gray-700'
        )}>
          {value.toFixed(1)}
        </span>
      )}

      {reviewCount && reviewCount > 0 && (
        <span className={cn(
          'text-gray-500',
          textSizes[size]
        )}>
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  )
}
