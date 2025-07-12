import type { Fragrance } from '@fragrance-battle/types'
import type React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from './UI/Badge'
import { Rating } from './UI/Rating'
import { formatDisplayName, getConcentrationAbbreviation } from '@/utils/fragrance'

interface FragranceCardProps {
  fragrance: Fragrance
}

export const FragranceCard: React.FC<FragranceCardProps> = ({ fragrance }) => {
  // Placeholder for a more sophisticated image solution later
  const imagePlaceholder = (
    <div className="w-full h-48 bg-slate-200 flex items-center justify-center rounded-t-lg">
      <span role="img" aria-label="perfume" className="text-5xl opacity-50">
        🧪
      </span>
    </div>
  )

  return (
    <Link
      to={`/fragrances/${fragrance.id}`}
      className="block bg-white border border-slate-200/80 rounded-lg shadow-sm overflow-hidden group transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      {imagePlaceholder}

      <div className="p-4 flex flex-col flex-grow">
        {/* Fragrance Name - given a fixed height to allow for 2 lines and keep cards aligned */}
        <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1 overflow-hidden h-14 line-clamp-2">
          {formatDisplayName(fragrance.name) || 'Untitled Fragrance'}
        </h3>

        {/* Brand and Rating */}
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs text-slate-600">by {formatDisplayName(fragrance.brand) || '—'}</p>
          {fragrance.communityRating && (
            <Rating value={fragrance.communityRating} className="text-slate-800" />
          )}
        </div>

        {/* Badges - push to the bottom */}
        <div className="flex-grow" />
        <div className="flex items-center gap-2 text-slate-500 mt-2">
          {fragrance.year && (
            <Badge className="bg-slate-200 text-slate-600">{fragrance.year}</Badge>
          )}
          {fragrance.concentration && (
            <Badge className="bg-purple-100 text-purple-800">{getConcentrationAbbreviation(fragrance.concentration)}</Badge>
          )}
        </div>
      </div>
    </Link>
  )
}
