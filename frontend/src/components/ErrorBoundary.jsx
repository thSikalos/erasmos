import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626'
        }}>
          <h2>⚠️ Κάτι πήγε στραβά</h2>
          <p>Παρουσιάστηκε σφάλμα στην εφαρμογή. Παρακαλώ δοκιμάστε να ανανεώσετε τη σελίδα.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Ανανέωση Σελίδας
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '10px' }}>
              <summary>Error Details (Development)</summary>
              <pre style={{ fontSize: '12px', marginTop: '10px' }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack || 'Component stack not available'}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;