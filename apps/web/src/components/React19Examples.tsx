import { Suspense, use } from 'react'
import { api } from '../lib/api'

// Example of React 19's new use() hook with async data
const FragranceData = ({ fragranceId }: { fragranceId: string }) => {
  // React 19's use() hook can unwrap promises directly
  const fragrance = use(api.get(`/fragrances/${fragranceId}`))

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold">{fragrance.name}</h3>
      <p className="text-gray-600">{fragrance.brand}</p>
      <div className="mt-2">
        <span className="text-sm bg-blue-100 px-2 py-1 rounded">
          Relevance Score: {fragrance.relevanceScore}
        </span>
      </div>
    </div>
  )
}

// Example component using React 19 Suspense with use()
const React19SearchExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">React 19 Features Demo</h2>

      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-20 rounded" />}>
        <FragranceData fragranceId="1" />
      </Suspense>

      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-20 rounded" />}>
        <FragranceData fragranceId="2" />
      </Suspense>
    </div>
  )
}

export default React19SearchExample
