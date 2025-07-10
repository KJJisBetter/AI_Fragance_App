import type React from 'react'
import { Link } from 'react-router-dom'

interface BrandScrollerProps {
  brands: { name: string; count?: number }[]
}

export const BrandScroller: React.FC<BrandScrollerProps> = ({ brands }) => {
  return (
    <div className="overflow-x-auto py-4">
      <div className="flex gap-4 min-w-max px-2">
        {brands.map(b => (
          <Link
            key={b.name}
            to={`/fragrances?search=${encodeURIComponent(b.name)}`}
            className="shrink-0 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shadow-sm"
          >
            {b.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
