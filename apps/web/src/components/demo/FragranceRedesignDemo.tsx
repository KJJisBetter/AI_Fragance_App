import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { FragranceCard } from '@/components/fragrance/FragranceCard'
import { SearchResults } from '@/components/search/SearchResults'
import { FilterSidebar } from '@/components/filter/FilterSidebar'
import { Rating } from '@/components/ui/rating'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Fragrance } from '@fragrance-battle/types'

// Sample data that matches the new design
const sampleFragrances: Fragrance[] = [
  {
    id: '1',
    name: 'Eros',
    brand: 'Versace',
    year: 2023,
    concentration: 'EDT',
    communityRating: 4.5,
    topNotes: ['Mint', 'Green Apple', 'Lemon'],
    middleNotes: ['Tonka Bean', 'Ambroxan', 'Geranium'],
    baseNotes: ['Vanilla', 'Vetiver', 'Oakmoss'],
    verified: true,
    imageUrl: '/images/versace-eros.jpg',
    description: 'A fresh, dynamic fragrance with Mediterranean influences'
  },
  {
    id: '2',
    name: 'Dylan Blue',
    brand: 'Versace',
    year: 2022,
    concentration: 'EDP',
    communityRating: 4.8,
    topNotes: ['Bergamot', 'Grapefruit', 'Fig Leaves'],
    middleNotes: ['Violet Leaf', 'Papyrus', 'Patchouli'],
    baseNotes: ['Musk', 'Tonka Bean', 'Saffron'],
    verified: true,
    imageUrl: '/images/versace-dylan-blue.jpg',
    description: 'An elegant, sophisticated fragrance with woody undertones'
  },
  {
    id: '3',
    name: 'Bright Crystal',
    brand: 'Versace',
    year: 2021,
    concentration: 'EDT',
    communityRating: 4.2,
    topNotes: ['Pomegranate', 'Yuzu', 'Frosted Accord'],
    middleNotes: ['Peony', 'Magnolia', 'Lotus'],
    baseNotes: ['Amber', 'Musk', 'Mahogany'],
    verified: false,
    imageUrl: '/images/versace-bright-crystal.jpg',
    description: 'A luminous, floral fragrance with sparkling freshness'
  },
  {
    id: '4',
    name: 'Pour Homme',
    brand: 'Versace',
    year: 2020,
    concentration: 'EDT',
    communityRating: 4.0,
    topNotes: ['Bergamot', 'Neroli', 'Citron'],
    middleNotes: ['Geranium', 'Clary Sage', 'Cedarwood'],
    baseNotes: ['Amber', 'Musk', 'Tonka Bean'],
    verified: true,
    imageUrl: '/images/versace-pour-homme.jpg',
    description: 'A classic, timeless fragrance with Mediterranean charm'
  },
  {
    id: '5',
    name: 'Oud Noir',
    brand: 'Versace',
    year: 2019,
    concentration: 'EDP',
    communityRating: 4.6,
    topNotes: ['Black Pepper', 'Cardamom', 'Saffron'],
    middleNotes: ['Oud', 'Rose', 'Patchouli'],
    baseNotes: ['Amber', 'Vanilla', 'Sandalwood'],
    verified: true,
    imageUrl: '/images/versace-oud-noir.jpg',
    description: 'A luxurious, oriental fragrance with precious oud'
  },
  {
    id: '6',
    name: 'Eros Flame',
    brand: 'Versace',
    year: 2018,
    concentration: 'EDP',
    communityRating: 4.4,
    topNotes: ['Mandarin', 'Madagascar Pepper', 'Rosemary'],
    middleNotes: ['Geranium', 'Rose', 'Pepperwood'],
    baseNotes: ['Vanilla', 'Tonka Bean', 'Sandalwood'],
    verified: true,
    imageUrl: '/images/versace-eros-flame.jpg',
    description: 'A passionate, intense fragrance with spicy warmth'
  },
]

const sampleFilterOptions = {
  brands: [
    { name: 'Versace', count: 6 },
    { name: 'Creed', count: 12 },
    { name: 'Tom Ford', count: 8 },
    { name: 'Dior', count: 15 },
    { name: 'Chanel', count: 10 },
  ],
  concentrations: ['EDT', 'EDP', 'Parfum', 'EDC'],
  seasons: ['Spring', 'Summer', 'Fall', 'Winter'],
  occasions: ['Daily', 'Evening', 'Formal', 'Casual', 'Date', 'Work'],
  moods: ['Fresh', 'Confident', 'Sophisticated', 'Playful', 'Romantic', 'Energetic'],
}

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

export const FragranceRedesignDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<'cards' | 'search' | 'filters' | 'complete'>('cards')
  const [filters, setFilters] = useState<FilterState>({
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
  const [currentSort, setCurrentSort] = useState({ sortBy: 'popularity', sortOrder: 'desc' as 'asc' | 'desc' })

  const handleSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setCurrentSort({ sortBy, sortOrder })
  }

  const handleAddToBattle = (fragrance: Fragrance) => {
    console.log('Added to battle:', fragrance.name)
  }

  const handleAddToWishlist = (fragrance: Fragrance) => {
    console.log('Added to wishlist:', fragrance.name)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Demo Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900">
                Fragrance Battle AI - Redesign Demo
              </h1>
              <div className="flex gap-2">
                <Button
                  variant={activeDemo === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveDemo('cards')}
                >
                  Cards
                </Button>
                <Button
                  variant={activeDemo === 'search' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveDemo('search')}
                >
                  Search Results
                </Button>
                <Button
                  variant={activeDemo === 'filters' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveDemo('filters')}
                >
                  Filters
                </Button>
                <Button
                  variant={activeDemo === 'complete' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveDemo('complete')}
                >
                  Complete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards Demo */}
        {activeDemo === 'cards' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">FragranceCard Variants</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FragranceCard
                  fragrance={sampleFragrances[0]}
                  variant="default"
                  onAddToWishlist={handleAddToWishlist}
                />
                <FragranceCard
                  fragrance={sampleFragrances[1]}
                  variant="luxury"
                  onAddToWishlist={handleAddToWishlist}
                />
                <FragranceCard
                  fragrance={sampleFragrances[2]}
                  variant="compact"
                  size="sm"
                  onAddToWishlist={handleAddToWishlist}
                />
                <FragranceCard
                  fragrance={sampleFragrances[3]}
                  variant="battle"
                  showBattleActions={true}
                  onAddToBattle={handleAddToBattle}
                  onAddToWishlist={handleAddToWishlist}
                />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Rating Component</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                  <h3 className="font-medium mb-3">Default Rating</h3>
                  <Rating value={4.5} showValue reviewCount={1250} />
                </div>
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                  <h3 className="font-medium mb-3">Luxury Rating</h3>
                  <Rating value={4.8} variant="luxury" showValue reviewCount={892} />
                </div>
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                  <h3 className="font-medium mb-3">Large Rating</h3>
                  <Rating value={4.2} size="lg" showValue reviewCount={2156} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Results Demo */}
        {activeDemo === 'search' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <SearchResults
              fragrances={sampleFragrances}
              totalCount={sampleFragrances.length}
              isLoading={false}
              searchQuery="Versace"
              onSort={handleSort}
              currentSort={currentSort}
            />
          </div>
        )}

        {/* Filters Demo */}
        {activeDemo === 'filters' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <FilterSidebar
                filters={filters}
                onFiltersChange={setFilters}
                availableOptions={sampleFilterOptions}
                className="h-[600px] rounded-xl border border-slate-200 shadow-sm"
              />
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Filter State</h3>
                <pre className="bg-slate-50 rounded-lg p-4 text-sm overflow-auto">
                  {JSON.stringify(filters, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Complete Demo */}
        {activeDemo === 'complete' && (
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <FilterSidebar
                  filters={filters}
                  onFiltersChange={setFilters}
                  availableOptions={sampleFilterOptions}
                  className="h-[calc(100vh-8rem)] rounded-xl border border-slate-200 shadow-sm"
                />
              </div>
            </div>
            <div className="lg:col-span-3">
              <SearchResults
                fragrances={sampleFragrances}
                totalCount={sampleFragrances.length}
                isLoading={false}
                searchQuery="Versace"
                onSort={handleSort}
                currentSort={currentSort}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
              />
            </div>
          </div>
        )}
      </div>

      {/* Design System Info */}
      <div className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Key Features</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• CVA-based component variants</li>
                <li>• Sophisticated hover effects</li>
                <li>• Battle mode integration</li>
                <li>• Mobile-responsive design</li>
                <li>• Accessibility-first approach</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Design Tokens</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Premium color palette</li>
                <li>• Consistent spacing system</li>
                <li>• Modern typography scale</li>
                <li>• Luxury-inspired aesthetics</li>
                <li>• Brand-aligned visuals</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Technical Stack</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• React 19 + TypeScript</li>
                <li>• Tailwind CSS + CVA</li>
                <li>• Radix UI primitives</li>
                <li>• Framer Motion ready</li>
                <li>• Performance optimized</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
