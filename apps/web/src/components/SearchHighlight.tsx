import type React from 'react'

interface SearchHighlightProps {
  text: string
  searchTerm: string
  className?: string
}

export const SearchHighlight: React.FC<SearchHighlightProps> = ({
  text,
  searchTerm,
  className,
}) => {
  if (!searchTerm || !text) {
    return <span className={className}>{text}</span>
  }

  // Create a regex that matches the search term (case insensitive)
  const searchWords = searchTerm
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)

  // Create a regex pattern that matches any of the search words
  const regex = new RegExp(
    `(${searchWords
      .map(
        word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex characters
      )
      .join('|')})`,
    'gi'
  )

  // Split the text by matches and create highlighted segments
  const parts = text.split(regex)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = searchWords.some(word => part.toLowerCase().includes(word.toLowerCase()))

        return isMatch ? (
          <mark key={index} className="bg-yellow-200 text-yellow-800 px-0.5 rounded-sm font-medium">
            {part}
          </mark>
        ) : (
          part
        )
      })}
    </span>
  )
}

// Enhanced version with fuzzy matching indicators
interface FuzzySearchHighlightProps extends SearchHighlightProps {
  matchType?: 'exact' | 'fuzzy' | 'partial' | 'brand'
  confidence?: number
}

export const FuzzySearchHighlight: React.FC<FuzzySearchHighlightProps> = ({
  text,
  searchTerm,
  className,
  matchType = 'exact',
  confidence = 100,
}) => {
  const getMatchTypeColor = (type: string) => {
    switch (type) {
      case 'exact':
        return 'bg-green-200 text-green-800'
      case 'partial':
        return 'bg-blue-200 text-blue-800'
      case 'fuzzy':
        return 'bg-orange-200 text-orange-800'
      case 'brand':
        return 'bg-purple-200 text-purple-800'
      default:
        return 'bg-yellow-200 text-yellow-800'
    }
  }

  const getMatchTypeIcon = (type: string) => {
    switch (type) {
      case 'exact':
        return '✓'
      case 'partial':
        return '≈'
      case 'fuzzy':
        return '~'
      case 'brand':
        return '🏷️'
      default:
        return ''
    }
  }

  if (!searchTerm || !text) {
    return <span className={className}>{text}</span>
  }

  // Create a regex that matches the search term (case insensitive)
  const searchWords = searchTerm
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)

  // Create a regex pattern that matches any of the search words
  const regex = new RegExp(
    `(${searchWords
      .map(
        word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex characters
      )
      .join('|')})`,
    'gi'
  )

  // Split the text by matches and create highlighted segments
  const parts = text.split(regex)

  return (
    <span className={`${className} flex items-center gap-1`}>
      <span>
        {parts.map((part, index) => {
          const isMatch = searchWords.some(word => part.toLowerCase().includes(word.toLowerCase()))

          return isMatch ? (
            <mark
              key={index}
              className={`${getMatchTypeColor(matchType)} px-1 rounded-sm font-medium text-xs`}
            >
              {part}
            </mark>
          ) : (
            part
          )
        })}
      </span>

      {/* Match type indicator */}
      {matchType !== 'exact' && (
        <span
          className={`inline-flex items-center text-xs ${getMatchTypeColor(matchType)} px-1 py-0.5 rounded-full font-medium`}
          title={`${matchType} match (${confidence}% confidence)`}
        >
          {getMatchTypeIcon(matchType)}
        </span>
      )}
    </span>
  )
}
