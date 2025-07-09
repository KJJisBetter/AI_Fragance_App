import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<{ error: Error; reset: () => void }>;
}

const RouteErrorFallback: React.FC<{
  error: Error;
  reset: () => void;
}> = ({ error, reset }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="route-error-boundary">
      <div className="route-error-boundary__container">
        <div className="route-error-boundary__icon">
          <AlertTriangle size={64} />
        </div>

        <div className="route-error-boundary__content">
          <h1 className="route-error-boundary__title">
            Page Error
          </h1>

          <p className="route-error-boundary__message">
            This page encountered an error and couldn't be loaded properly.
          </p>

          <div className="route-error-boundary__details">
            <p className="route-error-boundary__path">
              <strong>Path:</strong> {location.pathname}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="route-error-boundary__technical">
                <summary>Technical Details</summary>
                <pre>{error.stack}</pre>
              </details>
            )}
          </div>

          <div className="route-error-boundary__actions">
            <button
              onClick={reset}
              className="route-error-boundary__button route-error-boundary__button--primary"
            >
              <RefreshCw size={16} />
              Try Again
            </button>

            <button
              onClick={handleGoBack}
              className="route-error-boundary__button route-error-boundary__button--secondary"
            >
              <ArrowLeft size={16} />
              Go Back
            </button>

            <button
              onClick={handleGoHome}
              className="route-error-boundary__button route-error-boundary__button--secondary"
            >
              <Home size={16} />
              Go Home
            </button>

            <button
              onClick={handleReload}
              className="route-error-boundary__button route-error-boundary__button--ghost"
            >
              <RefreshCw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({
  children,
  fallbackComponent: FallbackComponent
}) => {
  const location = useLocation();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Route Error:', error);
    console.error('Route Path:', location.pathname);
    console.error('Error Info:', errorInfo);

    // Log route-specific error details
    const routeErrorReport = {
      error: error.message,
      stack: error.stack,
      path: location.pathname,
      search: location.search,
      timestamp: new Date().toISOString(),
      componentStack: errorInfo.componentStack
    };

    console.error('Route Error Report:', routeErrorReport);
  };

  // Create the fallback component as a ReactNode
  const fallbackNode = FallbackComponent ? (
    <FallbackComponent error={new Error('Route error')} reset={() => window.location.reload()} />
  ) : (
    <RouteErrorFallback error={new Error('Route error')} reset={() => window.location.reload()} />
  );

  return (
    <ErrorBoundary
      level="page"
      onError={handleError}
      showErrorDetails={process.env.NODE_ENV === 'development'}
      fallback={fallbackNode}
    >
      {children}
    </ErrorBoundary>
  );
};

export default RouteErrorBoundary;
