import React, { useState } from 'react'
import { ChevronDown, ChevronUp, X, RotateCcw, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'

interface FilterState {
  brands: string[]
  concentrations: string[]
  seasons: string[]
  occasions: string[]
  moods: string[]
  yearRange: [number, number]
  ratingRange: [number, number]
  priceRange: [number, number]
  hasNotes: boolean
  verified: boolean
}

interface FilterSidebarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  isOpen?: boolean
  onClose?: () => void
  className?: string
  availableOptions?: {
    brands: Array<{ name: string; count: number }>
    concentrations: string[]
    seasons: string[]
    occasions: string[]
    moods: string[]
  }
}

interface FilterSectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  count?: number
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  isOpen,
  onToggle,
  children,
  count,
}) => {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 px-1 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{title}</span>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" size="sm">
              {count}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4 px-1 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFiltersChange,
  isOpen = true,
  onClose,
  className,
  availableOptions = {
    brands: [],
    concentrations: ['EDT', 'EDP', 'Parfum', 'EDC'],
    seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
    occasions: ['Daily', 'Evening', 'Formal', 'Casual', 'Date', 'Work'],
    moods: ['Fresh', 'Confident', 'Sophisticated', 'Playful', 'Romantic', 'Energetic'],
  },
}) => {
  const [openSections, setOpenSections] = useState({
    brands: true,
    attributes: false,
    categories: false,
    ranges: false,
    features: false,
  })

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      brands: [],
      concentrations: [],
      seasons: [],
      occasions: [],
      moods: [],
      yearRange: [1900, new Date().getFullYear()],
      ratingRange: [0, 5],
      priceRange: [0, 1000],
      hasNotes: false,
      verified: false,
    })
  }

  const getActiveFilterCount = () => {
    return (
      filters.brands.length +
      filters.concentrations.length +
      filters.seasons.length +
      filters.occasions.length +
      filters.moods.length +
      (filters.hasNotes ? 1 : 0) +
      (filters.verified ? 1 : 0)
    )
  }

  const handleBrandToggle = (brand: string) => {
    const newBrands = filters.brands.includes(brand)
      ? filters.brands.filter(b => b !== brand)
      : [...filters.brands, brand]
    updateFilters({ brands: newBrands })
  }

  const handleMultiSelect = (key: keyof FilterState, value: string) => {
    const currentValues = filters[key] as string[]
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    updateFilters({ [key]: newValues })
  }

  return (
    <div className={cn(
      'bg-white border-r border-slate-200 h-full overflow-y-auto',
      className
    )}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 p-4 z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Filters</h3>
          <div className="flex items-center gap-2">
            {getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="lg:hidden"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Summary */}
        {getActiveFilterCount() > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {filters.brands.map(brand => (
              <Badge
                key={brand}
                variant="secondary"
                className="cursor-pointer hover:bg-slate-200"
                onClick={() => handleBrandToggle(brand)}
              >
                {brand} <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
            {filters.concentrations.map(conc => (
              <Badge
                key={conc}
                variant="secondary"
                className="cursor-pointer hover:bg-slate-200"
                onClick={() => handleMultiSelect('concentrations', conc)}
              >
                {conc} <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Filter Sections */}
      <div className="p-4 space-y-0">
        {/* Brands */}
        <FilterSection
          title="Brands"
          isOpen={openSections.brands}
          onToggle={() => toggleSection('brands')}
          count={filters.brands.length}
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableOptions.brands.slice(0, 20).map((brand) => (
              <label
                key={brand.name}
                className="flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded px-2 py-1"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={filters.brands.includes(brand.name)}
                    onCheckedChange={() => handleBrandToggle(brand.name)}
                  />
                  <span className="text-sm text-slate-700">{brand.name}</span>
                </div>
                <span className="text-xs text-slate-500">{brand.count}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Concentration */}
        <FilterSection
          title="Concentration"
          isOpen={openSections.attributes}
          onToggle={() => toggleSection('attributes')}
          count={filters.concentrations.length}
        >
          <div className="space-y-2">
            {availableOptions.concentrations.map((concentration) => (
              <label
                key={concentration}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1"
              >
                <Checkbox
                  checked={filters.concentrations.includes(concentration)}
                  onCheckedChange={() => handleMultiSelect('concentrations', concentration)}
                />
                <span className="text-sm text-slate-700">{concentration}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Categories */}
        <FilterSection
          title="Categories"
          isOpen={openSections.categories}
          onToggle={() => toggleSection('categories')}
          count={filters.seasons.length + filters.occasions.length + filters.moods.length}
        >
          <div className="space-y-4">
            {/* Seasons */}
            <div>
              <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Seasons
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {availableOptions.seasons.map((season) => (
                  <label
                    key={season}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.seasons.includes(season)}
                      onCheckedChange={() => handleMultiSelect('seasons', season)}
                    />
                    <span className="text-sm text-slate-700">{season}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Occasions */}
            <div>
              <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Occasions
              </h5>
              <div className="space-y-2">
                {availableOptions.occasions.map((occasion) => (
                  <label
                    key={occasion}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.occasions.includes(occasion)}
                      onCheckedChange={() => handleMultiSelect('occasions', occasion)}
                    />
                    <span className="text-sm text-slate-700">{occasion}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Moods */}
            <div>
              <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Moods
              </h5>
              <div className="space-y-2">
                {availableOptions.moods.map((mood) => (
                  <label
                    key={mood}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.moods.includes(mood)}
                      onCheckedChange={() => handleMultiSelect('moods', mood)}
                    />
                    <span className="text-sm text-slate-700">{mood}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Rating Range */}
        <FilterSection
          title="Rating"
          isOpen={openSections.ranges}
          onToggle={() => toggleSection('ranges')}
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-700">Minimum Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">
                    {filters.ratingRange[0].toFixed(1)}+
                  </span>
                </div>
              </div>
              <Slider
                value={filters.ratingRange}
                onValueChange={(value) => updateFilters({ ratingRange: value as [number, number] })}
                max={5}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </FilterSection>

        {/* Features */}
        <FilterSection
          title="Features"
          isOpen={openSections.features}
          onToggle={() => toggleSection('features')}
          count={(filters.hasNotes ? 1 : 0) + (filters.verified ? 1 : 0)}
        >
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1">
              <Checkbox
                checked={filters.hasNotes}
                onCheckedChange={(checked) => updateFilters({ hasNotes: !!checked })}
              />
              <span className="text-sm text-slate-700">Has Note Information</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1">
              <Checkbox
                checked={filters.verified}
                onCheckedChange={(checked) => updateFilters({ verified: !!checked })}
              />
              <span className="text-sm text-slate-700">Verified Fragrances Only</span>
            </label>
          </div>
        </FilterSection>
      </div>
    </div>
  )
}
