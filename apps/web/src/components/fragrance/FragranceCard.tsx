import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Swords, Eye, Star, Crown, TrendingUp } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useCleanFragrance } from '@/hooks/useCleanFragrance'
import type { Fragrance } from '@fragrance-battle/types'

// Premium CVA variants with sophisticated styling and fixed heights
const fragranceCardVariants = cva(
  'group relative overflow-hidden bg-white transition-all duration-300 cursor-pointer border border-slate-200/60 flex flex-col',
  {
    variants: {
      variant: {
        default: 'rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-300/80 h-[400px]',
        luxury: 'rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br from-white via-slate-50/30 to-white border-slate-200/80 h-[420px]',
        compact: 'rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 h-[350px]',
        featured: 'rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-3 bg-gradient-to-br from-white via-amber-50/20 to-white border-amber-200/40 h-[420px]',
      },
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

const imageContainerVariants = cva(
  'relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center flex-shrink-0',
  {
    variants: {
      variant: {
        default: 'rounded-xl aspect-[4/5] mb-4',
        luxury: 'rounded-2xl aspect-[4/5] mb-4',
        compact: 'rounded-lg aspect-[3/4] mb-3',
        featured: 'rounded-2xl aspect-[4/5] mb-4 bg-gradient-to-br from-amber-50 to-slate-50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface FragranceCardProps extends VariantProps<typeof fragranceCardVariants> {
  fragrance: Fragrance
  className?: string
  showBattleControls?: boolean
  onBattle?: (fragrance: Fragrance) => void
  onSave?: (fragrance: Fragrance) => void
  onSelect?: (fragrance: Fragrance) => void
  isSelected?: boolean
  isLoading?: boolean
}

export const FragranceCard: React.FC<FragranceCardProps> = ({
  fragrance,
  variant = 'default',
  size = 'md',
  className,
  showBattleControls = false,
  onBattle,
  onSave,
  onSelect,
  isSelected = false,
  isLoading = false,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Handle data gracefully
  const displayYear = fragrance.year || null
  const displayRating = fragrance.communityRating || 0
  const displayConcentration = fragrance.concentration || null
  const hasHighRating = displayRating >= 4.5
  const isTrending = displayRating > 4.0 && fragrance.verified

      // Use the clean fragrance hook for optimal performance and consistent cleaning
  const cleanResult = useCleanFragrance(fragrance, {
    context: 'card',
    enableTooltip: true
  })

  // Extract clean data with fallback
  const displayName = cleanResult?.displayFragrance.displayName || fragrance.name
  const tooltip = cleanResult?.tooltip || ''
  const hasRedundancy = cleanResult?.hasRedundancy || false
  const isNameTruncated = displayName.length > 40 // Approximate threshold for 2 lines

  // Premium bottle placeholder
  const BottlePlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full w-full opacity-30">
      <div className="relative">
        {/* Elegant bottle shape */}
        <div className="w-16 h-24 bg-gradient-to-t from-slate-300 via-slate-200 to-slate-100 rounded-t-2xl relative shadow-inner">
          {/* Bottle cap */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-gradient-to-b from-slate-400 to-slate-300 rounded-sm shadow-sm"></div>
          {/* Brand reflection */}
          <div className="absolute inset-2 bg-gradient-to-br from-white/40 to-transparent rounded-xl"></div>
        </div>
        {/* Bottle base */}
        <div className="w-16 h-6 bg-gradient-to-b from-slate-300 to-slate-400 rounded-b-lg shadow-sm"></div>
      </div>
      <div className="mt-3 text-xs font-medium text-slate-400 text-center">
        {fragrance.brand}
      </div>
    </div>
  )

  // Loading skeleton with consistent height
  const LoadingSkeleton = () => (
    <div className="animate-pulse h-full flex flex-col">
      <div className="bg-slate-200 rounded-xl aspect-[4/5] mb-4 flex-shrink-0"></div>
      <div className="flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-slate-200 rounded w-20"></div>
            <div className="h-4 bg-slate-200 rounded w-16"></div>
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-slate-200 rounded w-4/5"></div>
            <div className="h-5 bg-slate-200 rounded w-3/5"></div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-slate-200 rounded-full w-12"></div>
          <div className="h-6 bg-slate-200 rounded-full w-16"></div>
        </div>
      </div>
    </div>
  )

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-action]')) {
      e.preventDefault()
      return
    }
  }

  if (isLoading) {
    return (
      <div className={cn(fragranceCardVariants({ variant, size }), className)}>
        <LoadingSkeleton />
      </div>
    )
  }

  // Brand color mapping for premium feel
  const getBrandColor = (brand: string) => {
    const brandColors: Record<string, string> = {
      'Versace': 'text-amber-700',
      'Dior': 'text-slate-700',
      'Chanel': 'text-slate-800',
      'Tom Ford': 'text-slate-900',
      'Creed': 'text-emerald-700',
      'Dolce & Gabbana': 'text-red-700',
      'Atelier Versace': 'text-amber-600',
    }
    return brandColors[brand] || 'text-slate-600'
  }

  return (
    <Link
      to={`/fragrances/${fragrance.id}`}
      className={cn(
        fragranceCardVariants({ variant, size }),
        isSelected && 'ring-2 ring-purple-500 ring-offset-2',
        className
      )}
      onClick={handleCardClick}
    >
      {/* Premium Image Container */}
      <div className={imageContainerVariants({ variant })}>
        {/* Trending/Featured Badge */}
        {isTrending && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg border-0">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          </div>
        )}

        {/* High Rating Crown */}
        {hasHighRating && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white p-1.5 rounded-full shadow-lg">
              <Crown className="w-3 h-3" />
            </div>
          </div>
        )}

        {/* Image or Placeholder */}
        {!imageError && fragrance.imageUrl ? (
          <img
            src={fragrance.imageUrl}
            alt={`${fragrance.brand} ${displayName}`}
            className={cn(
              'w-full h-full object-contain transition-opacity duration-300',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <BottlePlaceholder />
        )}

        {/* Premium Hover Actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-4">
          <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <button
              data-action="quickview"
              className="bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110 backdrop-blur-sm"
              title="Quick View"
            >
              <Eye className="w-4 h-4" />
            </button>

            {onSave && (
              <button
                data-action="save"
                className="bg-white/95 hover:bg-white text-red-500 hover:text-red-600 p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110 backdrop-blur-sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSave(fragrance)
                }}
                title="Save to Favorites"
              >
                <Heart className="w-4 h-4" />
              </button>
            )}

            {showBattleControls && onBattle && (
              <button
                data-action="battle"
                className="bg-purple-600/95 hover:bg-purple-700 text-white p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110 backdrop-blur-sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onBattle(fragrance)
                }}
                title="Add to Battle"
              >
                <Swords className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute inset-0 bg-purple-500/20 border-2 border-purple-500 rounded-xl"></div>
        )}
      </div>

      {/* Content Section - Flex-grow to fill remaining space */}
      <div className="flex-1 flex flex-col justify-between space-y-3">
        {/* Top Content Section */}
        <div className="space-y-3">
          {/* Brand Name & Rating Row */}
          <div className="flex items-center justify-between">
            <div className={cn(
              'text-xs font-semibold uppercase tracking-wider truncate pr-2',
              getBrandColor(fragrance.brand)
            )}>
              {fragrance.brand}
            </div>

            {displayRating > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className={cn(
                  'w-4 h-4 fill-current',
                  hasHighRating ? 'text-amber-500' : 'text-yellow-400'
                )} />
                <span className={cn(
                  'text-sm font-bold',
                  hasHighRating ? 'text-amber-700' : 'text-slate-700'
                )}>
                  {displayRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

                    {/* Product Name - Multi-line with proper line height */}
          <div>
            <h3
              className={cn(
                'font-bold text-slate-900 leading-tight group-hover:text-slate-700 transition-colors',
                variant === 'compact' ? 'text-sm line-clamp-2' : 'text-base line-clamp-2'
              )}
              title={tooltip || (isNameTruncated ? fragrance.name : undefined)}
            >
              {displayName}
            </h3>

            {/* Show redundancy indicator for debugging/admin purposes (optional) */}
            {hasRedundancy && process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-green-600 mt-1 opacity-70">
                ✨ Name cleaned
              </div>
            )}
          </div>
        </div>

        {/* Bottom Content Section */}
        <div className="space-y-3">
          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {displayYear && (
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-medium"
              >
                {displayYear}
              </Badge>
            )}
            {displayConcentration && (
              <Badge
                variant="outline"
                className={cn(
                  'border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors text-xs font-medium',
                  displayConcentration === 'Parfum' && 'border-amber-200 text-amber-700 hover:bg-amber-50',
                  displayConcentration === 'EDP' && 'border-blue-200 text-blue-700 hover:bg-blue-50'
                )}
              >
                {displayConcentration}
              </Badge>
            )}
            {fragrance.verified && (
              <Badge
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
              >
                Verified
              </Badge>
            )}
          </div>

          {/* Battle Controls (when enabled) */}
          {showBattleControls && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                {onBattle && (
                  <button
                    data-action="battle"
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-800 hover:bg-purple-50 py-2.5 px-4 rounded-xl transition-colors border border-purple-200 hover:border-purple-300"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onBattle(fragrance)
                    }}
                  >
                    <Swords className="w-4 h-4" />
                    Battle
                  </button>
                )}

                {onSelect && (
                  <button
                    data-action="select"
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2.5 px-4 rounded-xl transition-colors border',
                      isSelected
                        ? 'text-purple-800 bg-purple-100 border-purple-300'
                        : 'text-slate-700 hover:text-slate-800 hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onSelect(fragrance)
                    }}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Premium Gradient Overlay */}
      {(variant === 'luxury' || variant === 'featured') && (
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
      )}
    </Link>
  )
}

// Export variants for external use
export { fragranceCardVariants }
export type { FragranceCardProps }
