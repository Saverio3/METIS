import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            {this.props.fallbackTitle || 'Something went wrong with this component'}
          </h3>
          <p className="text-sm text-red-600 mb-4">
            {this.props.fallbackMessage || 'There was an error rendering this component. Please try again or contact support if the issue persists.'}
          </p>
          {this.props.showError && this.state.error && (
            <div className="text-xs text-red-500 bg-red-100 p-2 rounded overflow-auto max-h-40">
              <p>{this.state.error.toString()}</p>
              {this.state.errorInfo && (
                <pre>{this.state.errorInfo.componentStack}</pre>
              )}
            </div>
          )}
          {this.props.showReset && (
            <button
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
              Try Again
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
