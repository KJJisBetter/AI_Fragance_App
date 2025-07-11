import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import type React from 'react'

interface SortSelectProps {
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

const options: { label: string; value: string }[] = [
  { label: 'Popularity', value: 'popularity' },
  { label: 'Rating', value: 'rating' },
  { label: 'Name', value: 'name' },
  { label: 'Brand', value: 'brand' },
  { label: 'Year', value: 'year' },
]

export const SortSelect: React.FC<SortSelectProps> = ({ sortBy, sortOrder, onChange }) => {
  const currentLabel = options.find(o => o.value === sortBy)?.label || 'Sort by'

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
            <span>Sort by: {currentLabel}</span>
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1"
            sideOffset={5}
          >
            {options.map(option => (
              <DropdownMenu.Item
                key={option.value}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-purple-100 hover:text-purple-900 ${
                  sortBy === option.value ? 'bg-purple-50 text-purple-900' : 'text-slate-700'
                }`}
                onSelect={() => onChange(option.value, sortOrder)}
              >
                {option.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <button
        onClick={() => onChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
        className="p-2 text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      >
        {sortOrder === 'asc' ? (
          <ArrowUpIcon className="w-4 h-4" />
        ) : (
          <ArrowDownIcon className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
