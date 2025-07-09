import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, TrendingUp, Filter, X, ArrowUp, ArrowDown, Zap, Star } from 'lucide-react';
import { fragrancesApi } from '../lib/api';
import { Fragrance } from '@fragrance-battle/types';
import { searchAnalytics, SearchSuggestion } from '../lib/searchAnalytics';
import { SearchHighlight } from './SearchHighlight';
import { useSearchStore } from '../stores/searchStore';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'fragrance' | 'brand' | 'collection' | 'battle' | 'command';
  action: () => void;
  icon?: React.ReactNode;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  console.log('GlobalSearch render - isOpen:', isOpen);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Use individual selectors to avoid infinite loops
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const addRecentSearch = useSearchStore((state) => state.addRecentSearch);
  const updateSearchAnalytics = useSearchStore((state) => state.updateSearchAnalytics);

  const [suggestions, setSuggestions] = useState<{
    trending: SearchSuggestion[];
    popular: SearchSuggestion[];
    recent: SearchSuggestion[];
    completions: SearchSuggestion[];
  }>({ trending: [], popular: [], recent: [], completions: [] });

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load suggestions from analytics
  useEffect(() => {
    const loadSuggestions = () => {
      const allSuggestions = searchAnalytics.getAllSuggestions(query);
      setSuggestions(allSuggestions);
    };

    loadSuggestions();
  }, [query]);

  // Track search and save analytics
  const trackAndSaveSearch = useCallback((searchTerm: string, resultCount: number = 0) => {
    if (!searchTerm.trim()) return;

    // Update Zustand store analytics
    updateSearchAnalytics(searchTerm, resultCount, 'global');

    // Also update legacy analytics
    searchAnalytics.trackSearch(searchTerm, resultCount, 'global');
  }, [updateSearchAnalytics]);

  // Track search click
  const trackSearchClick = useCallback((searchTerm: string) => {
    // Add to recent searches in Zustand store
    addRecentSearch(searchTerm, {}, 0);

    // Also update legacy analytics
    searchAnalytics.trackSearchClick(searchTerm);
  }, [addRecentSearch]);

  // Get typo suggestions for common fragrance/brand misspellings
  const getTypoSuggestions = useCallback((query: string): string[] => {
    const commonTypos: Record<string, string> = {
      'sauvage': 'sauvage',
      'sagave': 'sauvage',
      'savage': 'sauvage',
      'sausage': 'sauvage',
      'aventus': 'aventus',
      'aventis': 'aventus',
      'avantus': 'aventus',
      'chanel': 'chanel',
      'chanell': 'chanel',
      'channel': 'chanel',
      'versace': 'versace',
      'versachi': 'versace',
      'versacci': 'versace',
      'dior': 'dior',
      'doire': 'dior',
      'fahrenheit': 'fahrenheit',
      'farenheit': 'fahrenheit',
      'fahreneheit': 'fahrenheit',
      'tom ford': 'tom ford',
      'tomford': 'tom ford',
      'creed': 'creed',
      'cread': 'creed',
      'ysl': 'yves saint laurent',
      'yves saint laurent': 'yves saint laurent',
      'saint laurent': 'yves saint laurent',
      'bleu': 'bleu de chanel',
      'blue': 'bleu de chanel',
      'acqua': 'acqua di gio',
      'aqua': 'acqua di gio',
      'adg': 'acqua di gio',
      'one million': '1 million',
      'onemillion': '1 million',
      'million': '1 million',
      'la nuit': 'la nuit de lhomme',
      'lanuit': 'la nuit de lhomme',
      'homme': 'lhomme',
      'jpg': 'jean paul gaultier',
      'gaultier': 'jean paul gaultier',
      'ck': 'calvin klein',
      'calvin': 'calvin klein',
      'dg': 'dolce gabbana',
      'dolce': 'dolce gabbana',
      'gabbana': 'dolce gabbana'
    };

    const lowerQuery = query.toLowerCase().trim();
    const suggestions: string[] = [];

    // Direct typo corrections
    if (commonTypos[lowerQuery]) {
      suggestions.push(commonTypos[lowerQuery]);
    }

    // Check for partial matches
    Object.keys(commonTypos).forEach(typo => {
      if (typo.includes(lowerQuery) && typo !== lowerQuery) {
        suggestions.push(commonTypos[typo]);
      }
    });

    // Remove duplicates and limit to 4 suggestions
    return [...new Set(suggestions)].slice(0, 4);
  }, []);

  // Search fragrances
  const searchFragrances = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fragrancesApi.search({
        query: searchTerm,
        limit: 8,
        page: 1
      });

      const fragrances = (response as any).fragrances || [];
      const searchResults: SearchResult[] = [];

      // Track search with result count
      trackAndSaveSearch(searchTerm, fragrances.length);

      // Add fragrance results
      fragrances.forEach((fragrance: Fragrance) => {
        searchResults.push({
          id: `fragrance-${fragrance.id}`,
          title: fragrance.name,
          subtitle: fragrance.brand,
          type: 'fragrance',
          action: () => {
            trackSearchClick(searchTerm);
            navigate(`/fragrances/${fragrance.id}`);
            onClose();
          },
          icon: <span className="text-lg">🧪</span>
        });
      });

      // Add brand search result
      if (searchTerm.length >= 2) {
        searchResults.push({
          id: `brand-search-${searchTerm}`,
          title: `Search "${searchTerm}" in all fragrances`,
          subtitle: 'View all results',
          type: 'command',
          action: () => {
            trackSearchClick(searchTerm);
            navigate(`/fragrances?search=${encodeURIComponent(searchTerm)}`);
            onClose();
          },
          icon: <Search className="w-4 h-4 text-blue-500" />
        });
      }

      // Add collections search
      searchResults.push({
        id: `collections-search-${searchTerm}`,
        title: `Search "${searchTerm}" in collections`,
        subtitle: 'Find matching collections',
        type: 'collection',
        action: () => {
          trackSearchClick(searchTerm);
          navigate(`/collections?search=${encodeURIComponent(searchTerm)}`);
          onClose();
        },
        icon: <Filter className="w-4 h-4 text-green-500" />
      });

      // Add battles search
      searchResults.push({
        id: `battles-search-${searchTerm}`,
        title: `Search "${searchTerm}" in battles`,
        subtitle: 'Find matching battles',
        type: 'battle',
        action: () => {
          trackSearchClick(searchTerm);
          navigate(`/battles?search=${encodeURIComponent(searchTerm)}`);
          onClose();
        },
        icon: <span className="text-lg">⚔️</span>
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, trackAndSaveSearch, trackSearchClick, onClose]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchFragrances(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, searchFragrances]);

    // Show suggestions when no query
  useEffect(() => {
    if (!query.trim()) {
      const suggestionResults: SearchResult[] = [];

      // Add trending searches
      suggestions.trending.forEach((suggestion, index) => {
        suggestionResults.push({
          id: `trending-${index}`,
          title: suggestion.query,
          subtitle: suggestion.reason,
          type: 'command',
          action: () => {
            setQuery(suggestion.query);
            navigate(`/fragrances?search=${encodeURIComponent(suggestion.query)}`);
            onClose();
          },
          icon: <TrendingUp className="w-4 h-4 text-orange-500" />
        });
      });

      // Add popular searches
      suggestions.popular.forEach((suggestion, index) => {
        suggestionResults.push({
          id: `popular-${index}`,
          title: suggestion.query,
          subtitle: suggestion.reason,
          type: 'command',
          action: () => {
            setQuery(suggestion.query);
            navigate(`/fragrances?search=${encodeURIComponent(suggestion.query)}`);
            onClose();
          },
          icon: <Star className="w-4 h-4 text-yellow-500" />
        });
      });

      // Add recent searches
      suggestions.recent.forEach((suggestion, index) => {
        suggestionResults.push({
          id: `recent-${index}`,
          title: suggestion.query,
          subtitle: suggestion.reason,
          type: 'command',
          action: () => {
            setQuery(suggestion.query);
            navigate(`/fragrances?search=${encodeURIComponent(suggestion.query)}`);
            onClose();
          },
          icon: <Clock className="w-4 h-4 text-gray-500" />
        });
      });

      // Fallback to default suggestions if no analytics data
      if (suggestionResults.length === 0) {
        const defaultResults: SearchResult[] = [
          {
            id: 'default-sauvage',
            title: 'Sauvage',
            subtitle: 'Popular fragrance',
            type: 'command',
            action: () => {
              setQuery('Sauvage');
              navigate('/fragrances?search=Sauvage');
              onClose();
            },
            icon: <Zap className="w-4 h-4 text-blue-500" />
          },
          {
            id: 'default-aventus',
            title: 'Aventus',
            subtitle: 'Popular fragrance',
            type: 'command',
            action: () => {
              setQuery('Aventus');
              navigate('/fragrances?search=Aventus');
              onClose();
            },
            icon: <Zap className="w-4 h-4 text-blue-500" />
          },
          {
            id: 'default-chanel',
            title: 'Chanel',
            subtitle: 'Popular brand',
            type: 'brand',
            action: () => {
              setQuery('Chanel');
              navigate('/fragrances?search=Chanel');
              onClose();
            },
            icon: <Zap className="w-4 h-4 text-blue-500" />
          }
        ];

        setResults(defaultResults);
      } else {
        setResults(suggestionResults);
      }
    }
  }, [query, suggestions, navigate, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            results[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-[10vh]">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search fragrances, brands, collections..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-lg outline-none placeholder-gray-400"
            autoComplete="off"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Searching...</span>
            </div>
          ) : results.length > 0 ? (
                         <div className="py-2">
               {!query.trim() && (
                 <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                   {suggestions.trending.length > 0 ? 'Trending & Popular' :
                    suggestions.recent.length > 0 ? 'Recent Searches' :
                    'Popular Searches'}
                 </div>
               )}
               {query.trim() && results.length > 0 && (
                 <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Search Results
                 </div>
               )}
               {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={result.action}
                  className={`w-full px-4 py-3 flex items-center hover:bg-gray-50 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mr-3">
                    {result.icon}
                  </div>
                                     <div className="flex-1 text-left">
                     <div className="font-medium text-gray-900">
                       <SearchHighlight
                         text={result.title}
                         searchTerm={query}
                         className="block"
                       />
                     </div>
                     <div className="text-sm text-gray-500">
                       <SearchHighlight
                         text={result.subtitle}
                         searchTerm={query}
                         className="block"
                       />
                     </div>
                   </div>
                  <div className="flex-shrink-0 ml-3">
                    {index === selectedIndex && (
                      <div className="text-xs text-gray-400 flex items-center">
                        <ArrowUp className="w-3 h-3 mr-1" />
                        <ArrowDown className="w-3 h-3 mr-1" />
                        <span>↵</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
                     ) : query.trim() ? (
             <div className="py-8 text-center text-gray-500">
               <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
               <p className="font-medium">No results found for "{query}"</p>
               <div className="mt-4 space-y-2">
                 <p className="text-sm">Try:</p>
                 <div className="flex flex-wrap gap-2 justify-center">
                   <button
                     onClick={() => setQuery('')}
                     className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                   >
                     Clear search
                   </button>
                   <button
                     onClick={() => setQuery(query.slice(0, -1))}
                     className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                   >
                     Remove last character
                   </button>
                 </div>
               </div>

               {/* Show search suggestions based on analytics */}
               {(suggestions.popular.length > 0 || suggestions.trending.length > 0) && (
                 <div className="mt-6">
                   <p className="text-sm font-medium mb-3">Popular searches:</p>
                   <div className="flex flex-wrap gap-2 justify-center">
                     {[...suggestions.trending.slice(0, 3), ...suggestions.popular.slice(0, 3)]
                       .slice(0, 4)
                       .map((suggestion, index) => (
                         <button
                           key={`suggestion-${index}`}
                           onClick={() => {
                             setQuery(suggestion.query);
                             navigate(`/fragrances?search=${encodeURIComponent(suggestion.query)}`);
                             onClose();
                           }}
                           className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors"
                         >
                           {suggestion.query}
                         </button>
                       ))}
                   </div>
                 </div>
               )}

               {/* Common typo corrections */}
               <div className="mt-6">
                 <p className="text-sm font-medium mb-3">Did you mean:</p>
                 <div className="flex flex-wrap gap-2 justify-center">
                   {getTypoSuggestions(query).map((suggestion, index) => (
                     <button
                       key={`typo-${index}`}
                       onClick={() => {
                         setQuery(suggestion);
                         navigate(`/fragrances?search=${encodeURIComponent(suggestion)}`);
                         onClose();
                       }}
                       className="px-3 py-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-full transition-colors"
                     >
                       {suggestion}
                     </button>
                   ))}
                 </div>
               </div>
             </div>
           ) : (
             <div className="py-8 text-center text-gray-500">
               <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
               <p className="font-medium">Start typing to search</p>
               <p className="text-sm mt-1">Search fragrances, brands, collections, and more</p>
               <div className="mt-4 text-xs text-gray-400">
                 <p>💡 Try searching for brand names, fragrance names, or notes</p>
                 <p className="mt-1">🔥 Popular: Sauvage, Aventus, Chanel, Tom Ford</p>
               </div>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <ArrowUp className="w-3 h-3 mr-1" />
              <ArrowDown className="w-3 h-3 mr-1" />
              Navigate
            </span>
            <span className="flex items-center">
              <span className="border border-gray-300 rounded px-1 mr-1">↵</span>
              Select
            </span>
            <span className="flex items-center">
              <span className="border border-gray-300 rounded px-1 mr-1">esc</span>
              Close
            </span>
          </div>
          <div className="flex items-center">
            <span className="font-medium">⌘K</span>
          </div>
        </div>
      </div>
    </div>
  );
};
