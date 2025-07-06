import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fragrancesApi } from "../lib/api";
import { Fragrance, FragranceSearchFilters } from "@fragrance-battle/types";

const cardStyle = {
  background: "white",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  transition: "all 0.3s ease",
  border: "1px solid rgba(0,0,0,0.05)",
  cursor: "pointer"
};

const cardHoverStyle = {
  transform: "translateY(-2px)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)"
};

export const FragrancesPage = () => {
  const [searchParams] = useSearchParams();
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [filters, setFilters] = useState<FragranceSearchFilters>({});
  const [brandSearch, setBrandSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'brand' | 'year' | 'rating' | 'createdAt'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFragrances, setTotalFragrances] = useState(0);

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

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      const options = await fragrancesApi.getFilters() as {
        brands: string[];
        seasons: string[];
        occasions: string[];
        moods: string[];
        concentrations: string[];
        yearRange: { min: number; max: number };
      };
      setFilterOptions(options);
    } catch (err) {
      console.error('❌ Error fetching filter options:', err);
    } finally {
      setFiltersLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce for search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch fragrances
  const fetchFragrances = async () => {
    try {
      // Show search loading for quick searches, regular loading for initial/filter changes
      if (debouncedSearchQuery.trim() && fragrances.length > 0) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('🔍 Fetching fragrances with params:', {
        searchQuery: debouncedSearchQuery,
        filters,
        page: currentPage,
        sortBy,
        sortOrder
      });

      let result;

      // Use search if there's a query, otherwise get all with filters
      if (debouncedSearchQuery.trim()) {
        console.log('🔍 Using search API');
        result = await fragrancesApi.search({
          query: debouncedSearchQuery,
          filters,
          page: currentPage,
          limit: 20,
          sortBy,
          sortOrder
        });
      } else {
        console.log('🔍 Using getAll API');
        result = await fragrancesApi.getAll({
          page: currentPage,
          limit: 20,
          sortBy,
          sortOrder,
          ...filters
        });
      }

      console.log('✅ API Response:', result);
      setFragrances((result as any).fragrances);
      setTotalPages((result as any).totalPages);
      setTotalFragrances((result as any).total);
    } catch (err) {
      console.error('❌ Error fetching fragrances:', err);
      setError(`Failed to load fragrances: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

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
      const result = await fragrancesApi.searchBrands(query, 10) as { brands: Array<{ name: string; originalName: string; count: number }> };
      setBrandSuggestions(result.brands);
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

  // Effect to fetch fragrances when dependencies change
  useEffect(() => {
    fetchFragrances();
  }, [debouncedSearchQuery, filters, sortBy, sortOrder, currentPage]);

  // Effect to handle URL search params
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    // Don't call fetchFragrances here - let the debounced effect handle it
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof FragranceSearchFilters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value === '' ? undefined : value
    }));
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setBrandSearch('');
    setSelectedBrandOriginal('');
    setCurrentPage(1);
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
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Section */}
      <div style={{
        backgroundColor: "white",
        padding: "32px",
        borderBottom: "1px solid #e2e8f0",
        marginBottom: "32px"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1 style={{
              fontSize: "2.5rem",
              fontWeight: "bold",
              color: "#1e293b",
              marginBottom: "16px"
            }}>
              Discover Fragrances
            </h1>
            <p style={{
              fontSize: "1.1rem",
              color: "#64748b",
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              Explore our collection of {totalFragrances.toLocaleString()} fragrances from the world's finest perfumers
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ marginBottom: "24px" }}>
            <div style={{
              display: "flex",
              gap: "12px",
              maxWidth: "600px",
              margin: "0 auto",
              position: "relative"
            }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search fragrances, brands, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "16px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = "#1e293b"}
                  onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = "#e2e8f0"}
                />
                {searchLoading && (
                  <div style={{
                    position: "absolute",
                    right: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "16px",
                    height: "16px",
                    border: "2px solid #e2e8f0",
                    borderTop: "2px solid #1e293b",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }}></div>
                )}
              </div>
              <button
                type="submit"
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#1e293b",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = "#0f172a"}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = "#1e293b"}
              >
                Search
              </button>
            </div>
          </form>

          {/* Filters */}
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
                <option value="name">Sort by Name</option>
                <option value="brand">Sort by Brand</option>
                <option value="year">Sort by Year</option>
                <option value="rating">Sort by Rating</option>
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
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 32px" }}>
        {loading && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e2e8f0",
              borderTop: "4px solid #1e293b",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "16px"
            }}></div>
            <p style={{ color: "#64748b", fontSize: "14px" }}>Loading fragrances...</p>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "32px",
            textAlign: "center",
            color: "#dc2626"
          }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Results Count */}
            <div style={{ marginBottom: "24px" }}>
              <p style={{ color: "#64748b", fontSize: "14px" }}>
                Showing {fragrances.length} of {totalFragrances.toLocaleString()} fragrances
                {searchQuery && ` for "${searchQuery}"`}
                {searchLoading && (
                  <span style={{ marginLeft: "8px" }}>
                    <span style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      border: "2px solid #e2e8f0",
                      borderTop: "2px solid #64748b",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }}></span>
                  </span>
                )}
              </p>
            </div>

            {/* Fragrances Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "24px",
              marginBottom: "48px"
            }}>
              {fragrances.map((fragrance) => (
                <Link
                  key={fragrance.id}
                  to={`/fragrances/${fragrance.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit"
                  }}
                >
                  <div
                    style={cardStyle}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, cardHoverStyle);
                    }}
                    onMouseLeave={(e) => {
                      Object.assign(e.currentTarget.style, cardStyle);
                    }}
                  >
                    {/* Fragrance Header */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "8px"
                      }}>
                        <h3 style={{
                          fontSize: "1.25rem",
                          fontWeight: "bold",
                          color: "#1e293b",
                          margin: 0,
                          lineHeight: 1.2
                        }}>
                          {fragrance.name}
                        </h3>
                        {fragrance.verified && (
                          <span style={{
                            backgroundColor: "#22c55e",
                            color: "white",
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "600"
                          }}>
                            VERIFIED
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: "1rem",
                        color: "#64748b",
                        margin: 0,
                        fontWeight: "500"
                      }}>
                        {fragrance.brand}
                      </p>
                    </div>

                    {/* Details */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px"
                      }}>
                        {fragrance.year && (
                          <span style={{
                            fontSize: "14px",
                            color: "#64748b",
                            backgroundColor: "#f1f5f9",
                            padding: "4px 8px",
                            borderRadius: "4px"
                          }}>
                            {fragrance.year}
                          </span>
                        )}
                        {fragrance.concentration && (
                          <span style={{
                            fontSize: "14px",
                            color: "#1e293b",
                            backgroundColor: "#e2e8f0",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontWeight: "500"
                          }}>
                            {fragrance.concentration}
                          </span>
                        )}
                      </div>

                      {/* Rating */}
                      {fragrance.communityRating && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "8px"
                        }}>
                          <span style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: getRatingColor(fragrance.communityRating)
                          }}>
                            ★ {fragrance.communityRating.toFixed(1)}
                          </span>
                          <span style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                            marginLeft: "8px"
                          }}>
                            Community Rating
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ marginBottom: "8px" }}>
                        <h4 style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          margin: "0 0 4px 0",
                          textTransform: "uppercase"
                        }}>
                          Top Notes
                        </h4>
                        <p style={{
                          fontSize: "14px",
                          color: "#1e293b",
                          margin: 0,
                          lineHeight: 1.4
                        }}>
                          {formatNotes(fragrance.topNotes)}
                        </p>
                      </div>
                      <div style={{ marginBottom: "8px" }}>
                        <h4 style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          margin: "0 0 4px 0",
                          textTransform: "uppercase"
                        }}>
                          Heart Notes
                        </h4>
                        <p style={{
                          fontSize: "14px",
                          color: "#1e293b",
                          margin: 0,
                          lineHeight: 1.4
                        }}>
                          {formatNotes(fragrance.middleNotes)}
                        </p>
                      </div>
                      <div>
                        <h4 style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                          margin: "0 0 4px 0",
                          textTransform: "uppercase"
                        }}>
                          Base Notes
                        </h4>
                        <p style={{
                          fontSize: "14px",
                          color: "#1e293b",
                          margin: 0,
                          lineHeight: 1.4
                        }}>
                          {formatNotes(fragrance.baseNotes)}
                        </p>
                      </div>
                    </div>

                    {/* AI Categories */}
                    {(fragrance.aiSeasons?.length > 0 || fragrance.aiOccasions?.length > 0 || fragrance.aiMoods?.length > 0) && (
                      <div>
                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px"
                        }}>
                          {(fragrance.aiSeasons || []).slice(0, 2).map((season) => (
                            <span
                              key={season}
                              style={{
                                fontSize: "10px",
                                backgroundColor: "#dbeafe",
                                color: "#1e40af",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "500"
                              }}
                            >
                              {season}
                            </span>
                          ))}
                          {(fragrance.aiOccasions || []).slice(0, 2).map((occasion) => (
                            <span
                              key={occasion}
                              style={{
                                fontSize: "10px",
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "500"
                              }}
                            >
                              {occasion}
                            </span>
                          ))}
                          {(fragrance.aiMoods || []).slice(0, 1).map((mood) => (
                            <span
                              key={mood}
                              style={{
                                fontSize: "10px",
                                backgroundColor: "#dcfce7",
                                color: "#166534",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "500"
                              }}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                marginBottom: "48px"
              }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: currentPage === 1 ? "#f1f5f9" : "#1e293b",
                    color: currentPage === 1 ? "#94a3b8" : "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Previous
                </button>

                <span style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  color: "#64748b"
                }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: currentPage === totalPages ? "#f1f5f9" : "#1e293b",
                    color: currentPage === totalPages ? "#94a3b8" : "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  Next
                </button>
              </div>
            )}

            {/* No Results */}
            {fragrances.length === 0 && (
              <div style={{
                textAlign: "center",
                padding: "48px",
                color: "#64748b"
              }}>
                <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🔍</div>
                <h3 style={{
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  marginBottom: "8px"
                }}>
                  No fragrances found
                </h3>
                <p style={{ fontSize: "1rem", marginBottom: "24px" }}>
                  Try adjusting your search terms or filters
                </p>
                <button
                  onClick={clearFilters}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#1e293b",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

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
