import type React from 'react'
import { Link } from 'react-router-dom'
import { formatDisplayName, sortBrandsByPopularity } from '@/utils/fragrance'

interface BrandScrollerProps {
  brands: { name: string; count?: number }[]
}

export const BrandScroller: React.FC<BrandScrollerProps> = ({ brands }) => {
  // Sort brands by popularity if count information is available
  const sortedBrands = brands.some(b => b.count !== undefined)
    ? sortBrandsByPopularity(brands.map(b => ({ name: b.name, count: b.count || 0 })))
    : brands;

  return (
    <div className="overflow-x-auto py-4">
      <div className="flex gap-4 min-w-max px-2">
        {sortedBrands.map(b => (
          <Link
            key={b.name}
            to={`/fragrances?search=${encodeURIComponent(b.name)}`}
            className="shrink-0 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shadow-sm"
          >
            {formatDisplayName(b.name)}
          </Link>
        ))}
      </div>
    </div>
  )
}
