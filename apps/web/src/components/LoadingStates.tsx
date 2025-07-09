import React from 'react';

// Base skeleton component
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = false,
  animate = true
}) => {
  return (
    <div
      className={`bg-gray-200 ${rounded ? 'rounded-full' : 'rounded'} ${
        animate ? 'animate-pulse' : ''
      } ${className}`}
      style={{ width, height }}
    />
  );
};

// Search loading skeleton
export const SearchSkeleton: React.FC = () => {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
          <div className="flex-shrink-0">
            <Skeleton width={20} height={20} rounded />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
};

// Fragrance card skeleton
export const FragranceCardSkeleton: React.FC = () => {
  return (
    <div className="fragrance-card">
      <div className="fragrance-card-content space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton height={20} width="80%" />
          <Skeleton height={16} width="60%" />
        </div>

        {/* Details */}
        <div className="flex space-x-2">
          <Skeleton height={24} width={60} rounded />
          <Skeleton height={24} width={80} rounded />
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-2">
          <Skeleton height={16} width={80} />
          <Skeleton height={12} width={100} />
        </div>

        {/* Notes sections */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Skeleton height={14} width={80} />
            <Skeleton height={12} width="90%" />
          </div>
          <div className="space-y-1">
            <Skeleton height={14} width={80} />
            <Skeleton height={12} width="75%" />
          </div>
          <div className="space-y-1">
            <Skeleton height={14} width={80} />
            <Skeleton height={12} width="85%" />
          </div>
        </div>

        {/* Categories */}
        <div className="flex space-x-2">
          <Skeleton height={20} width={60} rounded />
          <Skeleton height={20} width={70} rounded />
          <Skeleton height={20} width={50} rounded />
        </div>
      </div>
    </div>
  );
};

// Fragrance grid skeleton
export const FragranceGridSkeleton: React.FC<{ count?: number }> = ({ count = 12 }) => {
  return (
    <div className="fragrances-grid">
      {[...Array(count)].map((_, index) => (
        <FragranceCardSkeleton key={index} />
      ))}
    </div>
  );
};

// Battle card skeleton
export const BattleCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton height={24} width="70%" />
        <Skeleton height={16} width="50%" />
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton height={12} width={60} />
          <Skeleton height={12} width={40} />
        </div>
        <Skeleton height={8} width="100%" rounded />
      </div>

      {/* Fragrances */}
      <div className="grid grid-cols-2 gap-4">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton height={16} width="80%" />
            <Skeleton height={14} width="60%" />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <Skeleton height={36} width={100} rounded />
        <Skeleton height={36} width={80} rounded />
      </div>
    </div>
  );
};

// Filter skeleton
export const FilterSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton height={12} width={80} />
          <Skeleton height={36} width="100%" rounded />
        </div>
      ))}
    </div>
  );
};

// Page header skeleton
export const PageHeaderSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <Skeleton height={32} width="60%" className="mx-auto" />
        <Skeleton height={16} width="80%" className="mx-auto" />
      </div>

      {/* Search bar */}
      <div className="flex justify-center">
        <div className="w-full max-w-md space-y-2">
          <Skeleton height={48} width="100%" rounded />
        </div>
      </div>
    </div>
  );
};

// Collection detail skeleton
export const CollectionDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton height={36} width="50%" />
        <Skeleton height={20} width="70%" />
        <div className="flex space-x-4">
          <Skeleton height={24} width={80} rounded />
          <Skeleton height={24} width={100} rounded />
          <Skeleton height={24} width={60} rounded />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="text-center space-y-2">
            <Skeleton height={32} width={60} className="mx-auto" />
            <Skeleton height={16} width={80} className="mx-auto" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        <Skeleton height={20} width="30%" />
        <FragranceGridSkeleton count={6} />
      </div>
    </div>
  );
};

// Error boundary loading state
export const ErrorBoundaryFallback: React.FC<{
  error?: Error;
  resetError?: () => void;
}> = ({ error, resetError }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
      <div className="text-6xl">😵</div>
      <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
      <p className="text-gray-600 max-w-md">
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {resetError && (
        <button
          onClick={resetError}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

// Smart loading component that shows different states
interface SmartLoadingProps {
  type: 'page' | 'grid' | 'search' | 'card' | 'filter' | 'collection';
  count?: number;
  message?: string;
}

export const SmartLoading: React.FC<SmartLoadingProps> = ({
  type,
  count = 6,
  message
}) => {
  const renderLoading = () => {
    switch (type) {
      case 'page':
        return (
          <div className="space-y-6">
            <PageHeaderSkeleton />
            <FilterSkeleton />
            <FragranceGridSkeleton count={count} />
          </div>
        );
      case 'grid':
        return <FragranceGridSkeleton count={count} />;
      case 'search':
        return <SearchSkeleton />;
      case 'card':
        return <FragranceCardSkeleton />;
      case 'filter':
        return <FilterSkeleton />;
      case 'collection':
        return <CollectionDetailSkeleton />;
      default:
        return <FragranceGridSkeleton count={count} />;
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm">{message}</span>
          </div>
        </div>
      )}
      {renderLoading()}
    </div>
  );
};

// Progressive loading component for infinite scroll
export const ProgressiveLoading: React.FC<{
  hasMore: boolean;
  loading: boolean;
  onLoadMore?: () => void;
}> = ({ hasMore, loading, onLoadMore }) => {
  return (
    <div className="text-center py-8">
      {loading ? (
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-600">Loading more items...</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, index) => (
              <FragranceCardSkeleton key={index} />
            ))}
          </div>
        </div>
      ) : hasMore ? (
        <button
          onClick={onLoadMore}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Load More
        </button>
      ) : (
        <p className="text-gray-500">No more items to load</p>
      )}
    </div>
  );
};

// Search Results Skeleton
export const SearchResultsSkeleton: React.FC<{ count?: number; isSearching?: boolean }> = ({
  count = 6,
  isSearching = false
}) => {
  return (
    <div className="search-results-skeleton">
      {/* Search Results Header Skeleton */}
      <div className="results-header-skeleton">
        <div className="skeleton-line" style={{ width: '200px', height: '20px', marginBottom: '8px' }}></div>
        <div className="skeleton-line" style={{ width: '300px', height: '16px' }}></div>
      </div>

      {/* Search Results Grid Skeleton */}
      <div className="fragrances-grid">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="fragrance-card skeleton-card">
            {/* Card Header */}
            <div className="fragrance-header">
              <div className="fragrance-title-row">
                <div className="skeleton-line" style={{ width: '80%', height: '20px', marginBottom: '4px' }}></div>
                <div className="skeleton-line" style={{ width: '40px', height: '16px' }}></div>
              </div>
              <div className="skeleton-line" style={{ width: '60%', height: '16px' }}></div>
            </div>

            {/* Card Details */}
            <div className="fragrance-details">
              <div className="fragrance-meta">
                <div className="skeleton-line" style={{ width: '50px', height: '20px', borderRadius: '12px' }}></div>
                <div className="skeleton-line" style={{ width: '70px', height: '20px', borderRadius: '12px' }}></div>
              </div>
              <div className="skeleton-line" style={{ width: '100px', height: '16px', marginBottom: '8px' }}></div>
            </div>

            {/* Notes Skeleton */}
            <div className="fragrance-notes">
              {['Top Notes', 'Heart Notes', 'Base Notes'].map((noteType, noteIndex) => (
                <div key={noteIndex} className="notes-section">
                  <div className="skeleton-line" style={{ width: '80px', height: '14px', marginBottom: '4px' }}></div>
                  <div className="skeleton-line" style={{ width: '90%', height: '12px' }}></div>
                </div>
              ))}
            </div>

            {/* Categories Skeleton */}
            <div className="ai-categories">
              <div className="skeleton-line" style={{ width: '60px', height: '20px', borderRadius: '12px' }}></div>
              <div className="skeleton-line" style={{ width: '80px', height: '20px', borderRadius: '12px' }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Status */}
      {isSearching && (
        <div className="search-status">
          <div className="skeleton-spinner"></div>
          <span>Searching fragrances...</span>
        </div>
      )}
    </div>
  );
};
