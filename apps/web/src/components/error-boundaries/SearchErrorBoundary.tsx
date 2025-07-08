import React from 'react';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';

interface SearchErrorBoundaryProps {
  children: React.ReactNode;
  onSearchReset?: () => void;
  searchQuery?: string;
}

const SearchErrorFallback: React.FC<{
  onSearchReset?: () => void;
  searchQuery?: string;
  onRetry?: () => void;
}> = ({ onSearchReset, searchQuery, onRetry }) => {
  return (
    <div className="search-error-boundary">
      <div className="search-error-boundary__container">
        <div className="search-error-boundary__icon">
          <AlertCircle size={48} />
        </div>

        <div className="search-error-boundary__content">
          <h3 className="search-error-boundary__title">
            Search Error
          </h3>

          <p className="search-error-boundary__message">
            {searchQuery
              ? `Unable to search for "${searchQuery}". This might be due to a network issue or an invalid search query.`
              : 'The search functionality encountered an error. Please try again.'
            }
          </p>

          <div className="search-error-boundary__suggestions">
            <h4>Try these suggestions:</h4>
            <ul>
              <li>Check your internet connection</li>
              <li>Try a different search term</li>
              <li>Clear your search and try again</li>
              <li>Refresh the page</li>
            </ul>
          </div>

          <div className="search-error-boundary__actions">
            {onRetry && (
              <button
                onClick={onRetry}
                className="search-error-boundary__button search-error-boundary__button--primary"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            )}

            {onSearchReset && (
              <button
                onClick={onSearchReset}
                className="search-error-boundary__button search-error-boundary__button--secondary"
              >
                <Search size={16} />
                Clear Search
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SearchErrorBoundary: React.FC<SearchErrorBoundaryProps> = ({
  children,
  onSearchReset,
  searchQuery
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Search Error:', error);
    console.error('Search Query:', searchQuery);

    // Log search-specific error details
    if (searchQuery) {
      console.error('Failed Search Query:', searchQuery);
    }
  };

  return (
    <ErrorBoundary
      level="component"
      onError={handleError}
      fallback={
        <SearchErrorFallback
          onSearchReset={onSearchReset}
          searchQuery={searchQuery}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default SearchErrorBoundary;
