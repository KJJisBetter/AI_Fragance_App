import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fragrancesApi } from "../lib/api";
import { Fragrance, FragranceSearchFilters } from "@fragrance-battle/types";
import { VirtualizedList } from "../components/VirtualizedList";
import { SmartLoading, FilterSkeleton, PageHeaderSkeleton, SearchResultsSkeleton } from "../components/LoadingStates";
import { FragranceInfiniteScroll, BackToTop } from "../components/InfiniteScroll";
import { useInfiniteData, useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { searchAnalytics } from "../lib/searchAnalytics";
import "./FragrancesPage.css";

export const FragrancesPage = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [filters, setFilters] = useState<FragranceSearchFilters>({});
  const [brandSearch, setBrandSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'brand' | 'year' | 'rating' | 'createdAt' | 'popularity' | 'prestige'>('popularity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dynamic filter options from database
  const [filterOptions, setFilterOptions] = useState<{
    brands: string[];
    seasons: string[];
    occasions: string[];
    moods: string[];
    concentrations: string[];
    yearRange: { min: number; max: number };
  }>({
    brands: [],
    seasons: [],
    occasions: [],
    moods: [],
    concentrations: [],
    yearRange: { min: 1900, max: new Date().getFullYear() }
  });
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [brandSuggestions, setBrandSuggestions] = useState<Array<{ name: string; originalName: string; count: number }>>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  // Infinite scroll data fetching function
  const fetchData = useCallback(async (page: number) => {
    console.log('🔍 Fetching fragrances with params:', {
      searchQuery: debouncedSearchQuery,
      filters,
      page,
      sortBy,
      sortOrder
    });

    let result;
    const limit = 20;

    try {
      // Use search if there's a query, otherwise get all with filters
      if (debouncedSearchQuery.trim()) {
        console.log('🔍 Using search API');
        result = await fragrancesApi.search({
          query: debouncedSearchQuery,
          filters,
          page,
          limit,
          sortBy,
          sortOrder
        });
      } else {
        console.log('🔍 Using getAll API');
        result = await fragrancesApi.getAll({
          page,
          limit,
          sortBy,
          sortOrder,
          ...filters
        });
      }

      console.log('✅ API Response:', result);

      // Handle the nested response format from the backend
      const responseData = (result as any).data || (result as any);
      const fragrances = responseData.fragrances || [];
      const totalCount = responseData.pagination?.totalCount || responseData.total || 0;
      const totalPages = responseData.pagination?.totalPages || responseData.totalPages || 1;
      const hasMore = page < totalPages;

      // Track search analytics for first page only
      if (page === 1 && debouncedSearchQuery.trim()) {
        searchAnalytics.trackSearch(
          debouncedSearchQuery,
          fragrances.length,
          'page'
        );
      }

      return {
        items: fragrances,
        hasMore,
        totalCount
      };
    } catch (error) {
      console.error('❌ Error fetching fragrances:', error);
      throw error;
    }
  }, [debouncedSearchQuery, filters, sortBy, sortOrder]);

  // Use infinite scroll hook
  const {
    data: fragrances,
    hasMore,
    isLoading,
    isInitialLoading,
    error,
    totalCount: totalFragrances,
    loadMore,
    refresh
  } = useInfiniteData<Fragrance>({
    fetchData,
    dependencies: [debouncedSearchQuery, filters, sortBy, sortOrder],
    initialPage: 1
  });

  // Intersection observer for infinite scroll trigger
  const { loadingRef } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    threshold: 1.0,
    rootMargin: '100px'
  });

  // Virtual scrolling configuration
  const VIRTUAL_SCROLL_THRESHOLD = 50; // Use virtual scrolling for more than 50 items
  const ITEM_HEIGHT = 280; // Height of each fragrance card in pixels
  const CONTAINER_HEIGHT = 600; // Height of the virtual scroll container

  // Should use virtual scrolling?
  const shouldUseVirtualScrolling = useMemo(() => {
    return fragrances.length > VIRTUAL_SCROLL_THRESHOLD;
  }, [fragrances.length]);

  // Render function for virtual list items
  const renderFragranceItem = useMemo(() =>
    (fragrance: Fragrance, index: number) => (
      <Link
        key={fragrance.id}
        to={`/fragrances/${fragrance.id}`}
        className="fragrance-card"
        style={{ margin: '8px' }}
      >
        <div className="fragrance-card-content">
          <div className="fragrance-card-header">
            <h3 className="fragrance-card-name">{fragrance.name}</h3>
            <p className="fragrance-card-brand">{fragrance.brand}</p>
          </div>

          <div className="fragrance-card-details">
            {fragrance.year && (
              <div className="fragrance-card-year">
                📅 {fragrance.year}
              </div>
            )}
            {fragrance.concentration && (
              <div className="fragrance-card-concentration">
                💧 {fragrance.concentration}
              </div>
            )}
          </div>

          <div className="fragrance-card-notes">
            <div className="notes-section">
              <span className="notes-label">Top:</span>
              <span className="notes-text">
                {formatNotes(fragrance.topNotes || [])}
              </span>
            </div>
            <div className="notes-section">
              <span className="notes-label">Heart:</span>
              <span className="notes-text">
                {formatNotes(fragrance.heartNotes || [])}
              </span>
            </div>
            <div className="notes-section">
              <span className="notes-label">Base:</span>
              <span className="notes-text">
                {formatNotes(fragrance.baseNotes || [])}
              </span>
            </div>
          </div>

          <div className="fragrance-card-footer">
            <div className="fragrance-card-rating">
              <span
                className="rating-value"
                style={{ color: getRatingColor(fragrance.communityRating) }}
              >
                ⭐ {fragrance.communityRating?.toFixed(1) || 'N/A'}
              </span>
              <span className="rating-label">Community Rating</span>
            </div>

            {fragrance.verified && (
              <div className="verified-badge">
                ✅ Verified
              </div>
            )}
          </div>
        </div>
      </Link>
    ), []);

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      const result = await fragrancesApi.getFilters() as {
        brands: Array<{ name: string; count: number }>;
        seasons: string[];
        occasions: string[];
        moods: string[];
        concentrations: Array<{ name: string; count: number }>;
        yearRange?: { min: number; max: number };
      };

      // Convert the response to the expected format
      const options = {
        brands: result.brands.map(b => b.name),
        seasons: result.seasons,
        occasions: result.occasions,
        moods: result.moods,
        concentrations: result.concentrations.map(c => c.name),
        yearRange: result.yearRange || { min: 1900, max: new Date().getFullYear() }
      };

      setFilterOptions(options);
    } catch (err) {
      console.error('❌ Error fetching filter options:', err);
    } finally {
      setFiltersLoading(false);
    }
  };

  // Debounce search query - OPTIMIZED to 300ms
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce for search - faster response

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);



  // Effect to fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Search brands dynamically
  const searchBrands = async (query: string) => {
    if (!query.trim()) {
      setBrandSuggestions([]);
      setShowBrandDropdown(false);
      return;
    }

    try {
      const result = await fragrancesApi.searchBrands(query, 10);
      const responseData = (result as any).data || (result as any);
      setBrandSuggestions(responseData.brands || []);
      setShowBrandDropdown(true);
    } catch (err) {
      console.error('Error searching brands:', err);
      setBrandSuggestions([]);
      setShowBrandDropdown(false);
    }
  };

  // Debounced brand search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchBrands(brandSearch);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [brandSearch]);

  // Track the selected brand's original name for filtering
  const [selectedBrandOriginal, setSelectedBrandOriginal] = useState<string>('');

  // Effect to update filters when brand is selected
  useEffect(() => {
    const updatedFilters = { ...filters };
    if (selectedBrandOriginal.trim()) {
      updatedFilters.brand = selectedBrandOriginal.trim();
    } else if (brandSearch.trim() && !selectedBrandOriginal) {
      // If typing freely (not from suggestions), use the typed value
      updatedFilters.brand = brandSearch.trim();
    } else {
      delete updatedFilters.brand;
    }
    setFilters(updatedFilters);
  }, [brandSearch, selectedBrandOriginal]);

  // Effect to handle URL search params
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The debounced effect will handle the actual search
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof FragranceSearchFilters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value === '' ? undefined : value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setBrandSearch('');
    setSelectedBrandOriginal('');
  };

  // Format notes for display
  const formatNotes = (notes: string[]) => {
    if (!notes || notes.length === 0) return 'Not specified';
    return notes.slice(0, 3).join(', ') + (notes.length > 3 ? '...' : '');
  };

  // Get rating color
  const getRatingColor = (rating?: number) => {
    if (!rating) return '#94a3b8';
    if (rating >= 4.5) return '#22c55e';
    if (rating >= 4.0) return '#3b82f6';
    if (rating >= 3.5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="fragrances-page">
      {/* Header Section */}
      <div className="fragrances-header">
        <div className="fragrances-header-container">
          <div className="fragrances-header-title">
            <h1>
              Discover Fragrances
            </h1>
            <p>
              Explore our collection of {totalFragrances.toLocaleString()} fragrances from the world's finest perfumers
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-container">
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Search fragrances, brands, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {isLoading && (
                  <div className="search-loading"></div>
                )}
              </div>
              <button
                type="submit"
                className="search-button"
              >
                Search
              </button>
            </div>
          </form>

          {/* Popular Filter Chips */}
          <div style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "16px"
          }}>


            <button
              onClick={() => {
                setSortBy('rating');
                setSortOrder('desc');
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: sortBy === 'rating' ? "#f59e0b" : "transparent",
                color: sortBy === 'rating' ? "white" : "#f59e0b",
                border: "1px solid #f59e0b",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                if (sortBy !== 'rating') {
                  (e.target as HTMLElement).style.backgroundColor = "#f59e0b";
                  (e.target as HTMLElement).style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (sortBy !== 'rating') {
                  (e.target as HTMLElement).style.backgroundColor = "transparent";
                  (e.target as HTMLElement).style.color = "#f59e0b";
                }
              }}
            >
              ⭐ Top Rated
            </button>


          </div>

          {/* Filters */}
          {filtersLoading ? (
            <FilterSkeleton />
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "24px"
            }}>
            <div style={{ position: "relative" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search brands..."
                  value={brandSearch}
                  onChange={(e) => {
                    setBrandSearch(e.target.value);
                    // Clear selected brand when typing (allows free typing)
                    if (selectedBrandOriginal) {
                      setSelectedBrandOriginal('');
                    }
                  }}
                  onFocus={() => {
                    if (brandSuggestions.length > 0) {
                      setShowBrandDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow clicking on suggestions
                    setTimeout(() => setShowBrandDropdown(false), 200);
                  }}
                  style={{
                    padding: "8px 32px 8px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "14px",
                    minWidth: "150px",
                    width: "100%"
                  }}
                />
                {brandSearch && (
                  <button
                    onClick={() => {
                      setBrandSearch('');
                      setSelectedBrandOriginal('');
                      setShowBrandDropdown(false);
                    }}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      fontSize: "16px",
                      color: "#64748b",
                      cursor: "pointer",
                      padding: "0",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {showBrandDropdown && brandSuggestions.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  zIndex: 1000,
                  maxHeight: "200px",
                  overflowY: "auto"
                }}>
                  {brandSuggestions.map(brand => (
                    <div
                      key={brand.name}
                      onClick={() => {
                        setBrandSearch(brand.name); // Display formatted name
                        setSelectedBrandOriginal(brand.originalName); // Use original for filtering
                        setShowBrandDropdown(false);
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                      }}
                    >
                      <span>{brand.name}</span>
                      <span style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginLeft: "8px"
                      }}>
                        {brand.count} fragrances
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <select
              value={filters.season || ''}
              onChange={(e) => handleFilterChange('season', e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "14px"
              }}
            >
              <option value="">All Seasons</option>
              {filterOptions.seasons.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>

            <select
              value={filters.occasion || ''}
              onChange={(e) => handleFilterChange('occasion', e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "14px"
              }}
            >
              <option value="">All Occasions</option>
              {filterOptions.occasions.map(occasion => (
                <option key={occasion} value={occasion}>{occasion}</option>
              ))}
            </select>

            <select
              value={filters.mood || ''}
              onChange={(e) => handleFilterChange('mood', e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "14px"
              }}
            >
              <option value="">All Moods</option>
              {filterOptions.moods.map(mood => (
                <option key={mood} value={mood}>{mood}</option>
              ))}
            </select>

            {filterOptions.concentrations.length > 0 && (
              <select
                value={filters.concentration || ''}
                onChange={(e) => handleFilterChange('concentration', e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              >
                <option value="">All Concentrations</option>
                {filterOptions.concentrations.map(concentration => (
                  <option key={concentration} value={concentration}>{concentration}</option>
                ))}
              </select>
            )}
          </div>
          )}

          {/* Sort and Actions */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              >
                                      <option value="popularity">🔥 Most Popular (Sales Volume)</option>
                      <option value="prestige">⭐ Highest Prestige (Quality)</option>
                      <option value="rating">Sort by Fragantica Rating</option>
                      <option value="name">Sort by Name</option>
                      <option value="brand">Sort by Brand</option>
                      <option value="year">Sort by Year</option>
                      <option value="createdAt">Sort by Date Added</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "transparent",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <button
              onClick={clearFilters}
              style={{
                padding: "8px 16px",
                backgroundColor: "transparent",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#64748b"
              }}
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content-container">
        {isInitialLoading && (
          <SearchResultsSkeleton
            count={12}
            isSearching={debouncedSearchQuery.trim().length > 0}
          />
        )}

        {error && (
          <div className="error-container">
            {error}
            <button onClick={refresh} style={{ marginLeft: "8px", padding: "4px 8px" }}>
              Retry
            </button>
          </div>
        )}

        {!isInitialLoading && !error && (
          <>
            {/* Results Count */}
            <div className="results-count">
              <p>
                Showing {fragrances.length} of {totalFragrances.toLocaleString()} fragrances
                {searchQuery && ` for "${searchQuery}"`}
                {isLoading && (
                  <span style={{ marginLeft: "8px" }}>
                    <span className="results-loading"></span>
                  </span>
                )}
              </p>
            </div>

            {/* Fragrances Grid */}
            {shouldUseVirtualScrolling ? (
              <div className="virtualized-fragrances-container">
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  padding: "8px 16px",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}>
                  <span style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    ⚡ Virtual Scrolling Active
                    <span style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: "normal"
                    }}>
                      ({fragrances.length} items)
                    </span>
                  </span>
                  <span style={{
                    fontSize: "12px",
                    color: "#64748b"
                  }}>
                    Optimized for large datasets
                  </span>
                </div>
                <VirtualizedList
                  items={fragrances}
                  itemHeight={ITEM_HEIGHT}
                  containerHeight={CONTAINER_HEIGHT}
                  renderItem={renderFragranceItem}
                  className="border border-gray-200 rounded-lg"
                />
              </div>
            ) : (
              <div className="fragrances-grid">
                {fragrances.map((fragrance) => (
                  <Link
                    key={fragrance.id}
                    to={`/fragrances/${fragrance.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit"
                    }}
                    onClick={() => {
                      // Track search result click for analytics
                      if (debouncedSearchQuery.trim()) {
                        searchAnalytics.trackSearchClick(debouncedSearchQuery);
                      }
                    }}
                  >
                    <div className="fragrance-card">
                      {/* Fragrance Header */}
                      <div className="fragrance-header">
                        <div className="fragrance-title-row">
                          <h3 className="fragrance-title">
                            {fragrance.name}
                          </h3>
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            {fragrance.year && (
                              <span style={{
                                backgroundColor: "#64748b",
                                color: "white",
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "600"
                              }}>
                                {fragrance.year}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="fragrance-brand">
                          {fragrance.brand}
                        </p>
                      </div>

                      {/* Details */}
                      <div className="fragrance-details">
                        <div className="fragrance-meta">
                          {fragrance.year && (
                            <span className="year-badge">
                              {fragrance.year}
                            </span>
                          )}
                          {fragrance.concentration && (
                            <span className="concentration-badge">
                              {fragrance.concentration}
                            </span>
                          )}
                        </div>

                        {/* Rating */}
                        {fragrance.communityRating && (
                          <div className="rating-container" style={{ marginBottom: "8px" }}>
                            <span className="rating-value" style={{
                              color: getRatingColor(fragrance.communityRating)
                            }}>
                              ★ {fragrance.communityRating.toFixed(1)}
                            </span>
                            <span style={{
                              fontSize: "12px",
                              color: "#94a3b8",
                              marginLeft: "8px"
                            }}>
                              Fragantica Rating
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="fragrance-notes">
                        <div className="notes-section">
                          <h4 className="notes-title">
                            Top Notes
                          </h4>
                          <p className="notes-content">
                            {formatNotes(fragrance.topNotes)}
                          </p>
                        </div>
                        <div className="notes-section">
                          <h4 className="notes-title">
                            Heart Notes
                          </h4>
                          <p className="notes-content">
                            {formatNotes(fragrance.middleNotes)}
                          </p>
                        </div>
                        <div className="notes-section">
                          <h4 className="notes-title">
                            Base Notes
                          </h4>
                          <p className="notes-content">
                            {formatNotes(fragrance.baseNotes)}
                          </p>
                        </div>
                      </div>

                      {/* AI Categories */}
                      {(fragrance.aiSeasons?.length > 0 || fragrance.aiOccasions?.length > 0 || fragrance.aiMoods?.length > 0) && (
                        <div>
                          <div className="ai-categories">
                            {(fragrance.aiSeasons || []).slice(0, 2).map((season) => (
                              <span
                                key={season}
                                className="category-badge category-season"
                              >
                                {season}
                              </span>
                            ))}
                            {(fragrance.aiOccasions || []).slice(0, 2).map((occasion) => (
                              <span
                                key={occasion}
                                className="category-badge category-occasion"
                              >
                                {occasion}
                              </span>
                            ))}
                            {(fragrance.aiMoods || []).slice(0, 1).map((mood) => (
                              <span
                                key={mood}
                                className="category-badge category-mood"
                              >
                                {mood}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Infinite scroll loading more */}
            {hasMore && (
              <div
                ref={loadingRef}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "32px",
                  gap: "8px"
                }}
              >
                {isLoading && (
                  <>
                    <div className="results-loading" style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid #e2e8f0",
                      borderTop: "2px solid #3b82f6",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }}></div>
                    <span style={{ color: "#64748b" }}>Loading more fragrances...</span>
                  </>
                )}
              </div>
            )}

            {/* End of results */}
            {!hasMore && fragrances.length > 0 && (
              <div style={{
                textAlign: "center",
                padding: "32px",
                borderTop: "1px solid #e2e8f0",
                marginTop: "32px"
              }}>
                <p style={{ color: "#64748b", marginBottom: "16px" }}>
                  🎉 You've viewed all {totalFragrances.toLocaleString()} fragrances!
                </p>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    margin: "0 auto"
                  }}
                >
                  ↑ Back to Top
                </button>
              </div>
            )}

            {/* No Results */}
            {fragrances.length === 0 && !isInitialLoading && (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3 className="no-results-title">
                  No fragrances found
                </h3>
                <p className="no-results-text">
                  Try adjusting your search terms or filters
                </p>
                <button
                  onClick={clearFilters}
                  className="no-results-button"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Back to top button */}
      <BackToTop showThreshold={400} />

      {/* Add spin animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};
