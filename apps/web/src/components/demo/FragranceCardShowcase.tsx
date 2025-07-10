import React, { useState } from 'react'
import { FragranceCard } from '@/components/fragrance/FragranceCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Fragrance } from '@fragrance-battle/types'

// Premium sample data that showcases different states
const premiumFragrances: Fragrance[] = [
  {
    id: '1',
    name: 'Eros',
    brand: 'Versace',
    year: 2023,
    concentration: 'EDT',
    communityRating: 4.7,
    topNotes: ['Mint', 'Green Apple', 'Lemon'],
    middleNotes: ['Tonka Bean', 'Ambroxan', 'Geranium'],
    baseNotes: ['Vanilla', 'Vetiver', 'Oakmoss'],
    verified: true,
    imageUrl: '/api/placeholder/300/375', // 4:5 aspect ratio
    description: 'A fresh, dynamic fragrance with Mediterranean influences'
  },
  {
    id: '2',
    name: 'Dylan Blue',
    brand: 'Versace',
    year: 2022,
    concentration: 'EDP',
    communityRating: 4.9,
    topNotes: ['Bergamot', 'Grapefruit', 'Fig Leaves'],
    middleNotes: ['Violet Leaf', 'Papyrus', 'Patchouli'],
    baseNotes: ['Musk', 'Tonka Bean', 'Saffron'],
    verified: true,
    imageUrl: '/api/placeholder/300/375',
    description: 'An elegant, sophisticated fragrance with woody undertones'
  },
  {
    id: '3',
    name: 'Sauvage',
    brand: 'Dior',
    year: 2021,
    concentration: 'EDT',
    communityRating: 4.3,
    topNotes: ['Bergamot', 'Pepper', 'Lavender'],
    middleNotes: ['Sichuan Pepper', 'Lavender', 'Pink Pepper'],
    baseNotes: ['Ambroxan', 'Cedar', 'Labdanum'],
    verified: true,
    imageUrl: '/api/placeholder/300/375',
    description: 'A radically fresh composition with ambroxan'
  },
  {
    id: '4',
    name: 'Aventus',
    brand: 'Creed',
    year: 2020,
    concentration: 'Parfum',
    communityRating: 4.8,
    topNotes: ['Bergamot', 'Blackcurrant', 'Apple', 'Pineapple'],
    middleNotes: ['Rose', 'Dry Birch', 'Moroccan Jasmine'],
    baseNotes: ['Oakmoss', 'Musk', 'Ambergris', 'Vanilla'],
    verified: true,
    imageUrl: '/api/placeholder/300/375',
    description: 'The legendary fragrance for the modern gentleman'
  },
  {
    id: '5',
    name: 'Noir de Noir',
    brand: 'Tom Ford',
    year: 2019,
    concentration: 'EDP',
    communityRating: 4.2,
    topNotes: ['Black Truffle', 'Bergamot', 'Bay Leaves'],
    middleNotes: ['Black Rose', 'Patchouli', 'Oud'],
    baseNotes: ['Vanilla', 'Sandalwood', 'Amber'],
    verified: false,
    imageUrl: '/api/placeholder/300/375',
    description: 'A sophisticated, mysterious fragrance with dark elegance'
  },
  {
    id: '6',
    name: 'No. 5',
    brand: 'Chanel',
    year: 2018,
    concentration: 'EDP',
    communityRating: 4.6,
    topNotes: ['Ylang-Ylang', 'Neroli', 'Amalfi Lemon'],
    middleNotes: ['Iris', 'Jasmine', 'Rose'],
    baseNotes: ['Sandalwood', 'Vetiver', 'Vanilla'],
    verified: true,
    imageUrl: '/api/placeholder/300/375',
    description: 'The iconic fragrance that redefined elegance'
  },
]

export const FragranceCardShowcase: React.FC = () => {
  const [selectedFragrances, setSelectedFragrances] = useState<string[]>([])
  const [battleList, setBattleList] = useState<Fragrance[]>([])
  const [favorites, setFavorites] = useState<string[]>([])

  const handleSelect = (fragrance: Fragrance) => {
    setSelectedFragrances(prev =>
      prev.includes(fragrance.id)
        ? prev.filter(id => id !== fragrance.id)
        : [...prev, fragrance.id]
    )
  }

  const handleBattle = (fragrance: Fragrance) => {
    setBattleList(prev => {
      const exists = prev.find(f => f.id === fragrance.id)
      if (exists) {
        return prev.filter(f => f.id !== fragrance.id)
      }
      return prev.length < 4 ? [...prev, fragrance] : prev
    })
  }

  const handleSave = (fragrance: Fragrance) => {
    setFavorites(prev =>
      prev.includes(fragrance.id)
        ? prev.filter(id => id !== fragrance.id)
        : [...prev, fragrance.id]
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900">
            Premium FragranceCard Showcase
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Sophisticated, engaging cards that make users want to explore and battle fragrances.
            Inspired by luxury fragrance boutiques with modern web design.
          </p>
        </div>

        {/* Battle Status */}
        {battleList.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-900">Battle Selection</h3>
              <Badge className="bg-purple-100 text-purple-800">
                {battleList.length} of 4 selected
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {battleList.map(fragrance => (
                <div key={fragrance.id} className="text-center">
                  <div className="text-sm font-medium text-purple-900">{fragrance.brand}</div>
                  <div className="text-xs text-purple-700">{fragrance.name}</div>
                </div>
              ))}
            </div>
            {battleList.length >= 2 && (
              <div className="mt-4 text-center">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Start Battle ({battleList.length} fragrances)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Card Variants Showcase */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Card Variants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Default Variant */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">Default</h3>
                <FragranceCard
                  fragrance={premiumFragrances[0]}
                  variant="default"
                  onBattle={handleBattle}
                  onSave={handleSave}
                />
              </div>

              {/* Luxury Variant */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">Luxury</h3>
                <FragranceCard
                  fragrance={premiumFragrances[1]}
                  variant="luxury"
                  onBattle={handleBattle}
                  onSave={handleSave}
                />
              </div>

              {/* Featured Variant */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">Featured</h3>
                <FragranceCard
                  fragrance={premiumFragrances[3]}
                  variant="featured"
                  onBattle={handleBattle}
                  onSave={handleSave}
                />
              </div>

              {/* Compact Variant */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">Compact</h3>
                <FragranceCard
                  fragrance={premiumFragrances[2]}
                  variant="compact"
                  size="sm"
                  onBattle={handleBattle}
                  onSave={handleSave}
                />
              </div>
            </div>
          </div>

          {/* Battle Mode Showcase */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Battle Mode</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {premiumFragrances.slice(0, 3).map((fragrance) => (
                <FragranceCard
                  key={fragrance.id}
                  fragrance={fragrance}
                  variant="default"
                  showBattleControls={true}
                  onBattle={handleBattle}
                  onSave={handleSave}
                  onSelect={handleSelect}
                  isSelected={selectedFragrances.includes(fragrance.id)}
                />
              ))}
            </div>
          </div>

          {/* Different States */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Different States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Loading State */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">Loading</h3>
                <FragranceCard
                  fragrance={premiumFragrances[0]}
                  variant="default"
                  isLoading={true}
                />
              </div>

              {/* High Rating */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">High Rating (4.5+)</h3>
                <FragranceCard
                  fragrance={premiumFragrances[1]}
                  variant="default"
                  onBattle={handleBattle}
                  onSave={handleSave}
                />
              </div>

              {/* No Image */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">No Image</h3>
                <FragranceCard
                  fragrance={{
                    ...premiumFragrances[2],
                    imageUrl: undefined
                  }}
                  variant="default"
                  onBattle={handleBattle}
                  onSave={handleSave}
                />
              </div>

              {/* Selected */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">Selected</h3>
                <FragranceCard
                  fragrance={premiumFragrances[3]}
                  variant="default"
                  isSelected={true}
                  onBattle={handleBattle}
                  onSave={handleSave}
                />
              </div>
            </div>
          </div>

          {/* Grid Layout Example */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Grid Layout (Real Usage)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {premiumFragrances.map((fragrance) => (
                <FragranceCard
                  key={fragrance.id}
                  fragrance={fragrance}
                  variant="default"
                  onBattle={handleBattle}
                  onSave={handleSave}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Features Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Premium Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800">Visual Excellence</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Sophisticated shadows and gradients</li>
                <li>• Premium typography hierarchy</li>
                <li>• Brand-specific color coding</li>
                <li>• Elegant loading states</li>
                <li>• 4:5 aspect ratio bottle images</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800">Interactive Elements</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Smooth hover animations</li>
                <li>• Battle mode integration</li>
                <li>• Quick action buttons</li>
                <li>• Selection states</li>
                <li>• Trending/crown badges</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800">Technical Quality</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• CVA variant system</li>
                <li>• TypeScript integration</li>
                <li>• Accessibility compliant</li>
                <li>• Performance optimized</li>
                <li>• Mobile responsive</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
