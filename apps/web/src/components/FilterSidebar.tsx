import type { FragranceSearchFilters } from '@fragrance-battle/types'
import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import React from 'react'
import { formatDisplayName, formatConcentration, sortBrandsByPopularity } from '@/utils/fragrance'

interface FilterSidebarProps {
  filters: FragranceSearchFilters
  options: {
    brands: string[]
    seasons: string[]
    occasions: string[]
    moods: string[]
    concentrations: string[]
  }
  onChange: (changes: Partial<FragranceSearchFilters>) => void
  onClear: () => void
}

const FilterGroup: React.FC<{
  title: string
  children: React.ReactNode
}> = ({ title, children }) => {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border-b border-slate-200 py-4"
    >
      <Collapsible.Trigger className="flex items-center justify-between w-full text-left">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-800">{title}</h4>
        {isOpen ? (
          <ChevronDownIcon className="w-5 h-5 text-slate-500" />
        ) : (
          <ChevronRightIcon className="w-5 h-5 text-slate-500" />
        )}
      </Collapsible.Trigger>
      <Collapsible.Content className="pt-3 space-y-2">{children}</Collapsible.Content>
    </Collapsible.Root>
  )
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  options,
  onChange,
  onClear,
}) => {
  const toggleCheckbox = (key: keyof FragranceSearchFilters, value: string) => {
    const current = filters[key] as string | undefined
    onChange({ [key]: current === value ? undefined : value })
  }

  const createCheckbox = (label: string, key: keyof FragranceSearchFilters) => (
    <label
      key={label}
      className="flex items-center space-x-3 text-sm text-slate-700 cursor-pointer hover:text-purple-700"
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        checked={filters[key] === label}
        onChange={() => toggleCheckbox(key, label)}
      />
      <span>{formatDisplayName(label)}</span>
    </label>
  )

  return (
    <aside className="w-64 space-y-2 p-4 sticky top-16 self-start">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-900">Filters</h3>
        <button
          onClick={onClear}
          className="text-sm font-medium text-purple-600 hover:text-purple-800"
        >
          Clear All
        </button>
      </div>

      <FilterGroup title="Brand">
        <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
          {options.brands.map(b => createCheckbox(b, 'brand'))}
        </div>
      </FilterGroup>

      <FilterGroup title="Season">
        {options.seasons.map(s => createCheckbox(s, 'season'))}
      </FilterGroup>

      <FilterGroup title="Occasion">
        {options.occasions.map(o => createCheckbox(o, 'occasion'))}
      </FilterGroup>

      <FilterGroup title="Concentration">
        {options.concentrations.map(c => createCheckbox(c, 'concentration'))}
      </FilterGroup>
    </aside>
  )
}
