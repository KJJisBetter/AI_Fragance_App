import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FuzzySearchHighlight, SearchHighlight } from './SearchHighlight'

describe('SearchHighlight', () => {
  it('renders text without highlighting when no search term', () => {
    render(<SearchHighlight text="Chanel No. 5" searchTerm="" />)

    const element = screen.getByText('Chanel No. 5')
    expect(element).toBeInTheDocument()
    expect(element.querySelector('mark')).toBeNull()
  })

  it('renders text without highlighting when search term is empty', () => {
    render(<SearchHighlight text="Chanel No. 5" searchTerm="   " />)

    const element = screen.getByText('Chanel No. 5')
    expect(element).toBeInTheDocument()
    expect(element.querySelector('mark')).toBeNull()
  })

  it('highlights single word matches', () => {
    render(<SearchHighlight text="Chanel No. 5" searchTerm="Chanel" />)

    const highlightedText = screen.getByText('Chanel')
    expect(highlightedText.tagName).toBe('MARK')
    expect(highlightedText).toHaveClass('bg-yellow-200', 'text-yellow-800')
  })

  it('highlights multiple word matches', () => {
    render(<SearchHighlight text="Chanel No. 5 Eau de Parfum" searchTerm="Chanel Parfum" />)

    const chanelHighlight = screen.getByText('Chanel')
    const parfumHighlight = screen.getByText('Parfum')

    expect(chanelHighlight.tagName).toBe('MARK')
    expect(parfumHighlight.tagName).toBe('MARK')
  })

  it('is case insensitive', () => {
    render(<SearchHighlight text="Chanel No. 5" searchTerm="chanel" />)

    const highlightedText = screen.getByText('Chanel')
    expect(highlightedText.tagName).toBe('MARK')
  })

  it('handles partial word matches', () => {
    render(<SearchHighlight text="Sauvage by Dior" searchTerm="Sauv" />)

    // SearchHighlight does highlight partial matches within words
    const highlightedText = screen.getByText('Sauv')
    expect(highlightedText.tagName).toBe('MARK')
  })

  it('escapes special regex characters', () => {
    render(<SearchHighlight text="Cost: $100 (50% off)" searchTerm="$100" />)

    const highlightedText = screen.getByText('$100')
    expect(highlightedText.tagName).toBe('MARK')
  })

  it('applies custom className', () => {
    render(<SearchHighlight text="Chanel No. 5" searchTerm="Chanel" className="custom-class" />)

    const container = screen.getByText('Chanel').closest('span')
    expect(container).toHaveClass('custom-class')
  })
})

describe('FuzzySearchHighlight', () => {
  it('renders with exact match styling', () => {
    render(<FuzzySearchHighlight text="Chanel No. 5" searchTerm="Chanel" matchType="exact" />)

    const highlightedText = screen.getByText('Chanel')
    expect(highlightedText).toHaveClass('bg-green-200', 'text-green-800')
  })

  it('renders with fuzzy match styling', () => {
    render(<FuzzySearchHighlight text="Chanel No. 5" searchTerm="Chanel" matchType="fuzzy" />)

    const highlightedText = screen.getByText('Chanel')
    expect(highlightedText).toHaveClass('bg-orange-200', 'text-orange-800')
  })

  it('renders with partial match styling', () => {
    render(<FuzzySearchHighlight text="Chanel No. 5" searchTerm="Chanel" matchType="partial" />)

    const highlightedText = screen.getByText('Chanel')
    expect(highlightedText).toHaveClass('bg-blue-200', 'text-blue-800')
  })

  it('renders with brand match styling', () => {
    render(<FuzzySearchHighlight text="Chanel No. 5" searchTerm="Chanel" matchType="brand" />)

    const highlightedText = screen.getByText('Chanel')
    expect(highlightedText).toHaveClass('bg-purple-200', 'text-purple-800')
  })

  it('shows match type indicator for non-exact matches', () => {
    render(
      <FuzzySearchHighlight
        text="Chanel No. 5"
        searchTerm="Chanel"
        matchType="fuzzy"
        confidence={85}
      />
    )

    const indicator = screen.getByText('~')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveAttribute('title', 'fuzzy match (85% confidence)')
  })

  it('does not show indicator for exact matches', () => {
    render(<FuzzySearchHighlight text="Chanel No. 5" searchTerm="Chanel" matchType="exact" />)

    expect(screen.queryByText('✓')).toBeNull()
  })

  it('shows brand indicator with emoji', () => {
    render(<FuzzySearchHighlight text="Chanel No. 5" searchTerm="Chanel" matchType="brand" />)

    const indicator = screen.getByText('🏷️')
    expect(indicator).toBeInTheDocument()
  })

  it('handles confidence values correctly', () => {
    render(
      <FuzzySearchHighlight
        text="Chanel No. 5"
        searchTerm="Chanel"
        matchType="partial"
        confidence={92}
      />
    )

    const indicator = screen.getByText('≈')
    expect(indicator).toHaveAttribute('title', 'partial match (92% confidence)')
  })

  it('defaults to 100% confidence when not specified', () => {
    render(<FuzzySearchHighlight text="Chanel No. 5" searchTerm="Chanel" matchType="fuzzy" />)

    const indicator = screen.getByText('~')
    expect(indicator).toHaveAttribute('title', 'fuzzy match (100% confidence)')
  })
})
