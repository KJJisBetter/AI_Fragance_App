import { AlertTriangle, Bug, Home, RefreshCw } from 'lucide-react'
import type React from 'react'
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  level?: 'page' | 'component' | 'critical'
  showErrorDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })

    // Log error to console and external service
    console.error('Error Boundary caught an error:', error)
    console.error('Error Info:', errorInfo)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // This would integrate with services like Sentry, LogRocket, etc.
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        level: this.props.level || 'component',
      }

      // In a real app, send to your error tracking service
      console.log('Error Report:', errorReport)

      // Example: fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) })
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      })
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReportBug = () => {
    const { error, errorId } = this.state
    const subject = encodeURIComponent(`Bug Report - Error ID: ${errorId}`)
    const body = encodeURIComponent(`
Error Details:
- Error ID: ${errorId}
- Message: ${error?.message}
- Page: ${window.location.href}
- Time: ${new Date().toISOString()}

Steps to reproduce:
1.
2.
3.

Expected behavior:


Actual behavior:


Additional context:

`)

    window.open(`mailto:support@fragrancebattle.com?subject=${subject}&body=${body}`)
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { level = 'component', showErrorDetails = false } = this.props
      const { error, errorId } = this.state
      const canRetry = this.retryCount < this.maxRetries

      return (
        <div className={`error-boundary ${level}`}>
          <div className="error-boundary__container">
            <div className="error-boundary__icon">
              <AlertTriangle size={level === 'critical' ? 64 : level === 'page' ? 48 : 32} />
            </div>

            <div className="error-boundary__content">
              <h2 className="error-boundary__title">
                {level === 'critical'
                  ? 'Application Error'
                  : level === 'page'
                    ? 'Page Error'
                    : 'Something went wrong'}
              </h2>

              <p className="error-boundary__message">
                {level === 'critical'
                  ? 'The application encountered a critical error and needs to be reloaded.'
                  : level === 'page'
                    ? 'This page encountered an error. You can try refreshing or go back to the home page.'
                    : 'This component failed to load. You can try again or continue using the rest of the app.'}
              </p>

              {showErrorDetails && error && (
                <details className="error-boundary__details">
                  <summary>Technical Details</summary>
                  <div className="error-boundary__technical">
                    <p>
                      <strong>Error ID:</strong> {errorId}
                    </p>
                    <p>
                      <strong>Message:</strong> {error.message}
                    </p>
                    {error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre>{error.stack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="error-boundary__actions">
                {canRetry && level !== 'critical' && (
                  <button
                    onClick={this.handleRetry}
                    className="error-boundary__button error-boundary__button--primary"
                  >
                    <RefreshCw size={16} />
                    Try Again ({this.maxRetries - this.retryCount} attempts left)
                  </button>
                )}

                {level === 'critical' && (
                  <button
                    onClick={this.handleReload}
                    className="error-boundary__button error-boundary__button--primary"
                  >
                    <RefreshCw size={16} />
                    Reload Application
                  </button>
                )}

                {level !== 'component' && (
                  <button
                    onClick={this.handleGoHome}
                    className="error-boundary__button error-boundary__button--secondary"
                  >
                    <Home size={16} />
                    Go Home
                  </button>
                )}

                <button
                  onClick={this.handleReportBug}
                  className="error-boundary__button error-boundary__button--ghost"
                >
                  <Bug size={16} />
                  Report Bug
                </button>
              </div>

              {errorId && <p className="error-boundary__error-id">Error ID: {errorId}</p>}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for easier use
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

export default ErrorBoundary
