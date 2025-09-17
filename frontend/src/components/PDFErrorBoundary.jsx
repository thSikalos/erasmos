import React from 'react';

class PDFErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('PDF Error Boundary caught an error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Send error to monitoring service if available
        if (window.errorReporting) {
            window.errorReporting.captureException(error, {
                component: 'PDFErrorBoundary',
                errorInfo: errorInfo,
                retryCount: this.state.retryCount
            });
        }
    }

    handleRetry = () => {
        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1
        }));
    };

    handleReportProblem = () => {
        const errorDetails = {
            error: this.state.error?.message || 'Unknown error',
            stack: this.state.error?.stack || '',
            component: this.state.errorInfo?.componentStack || '',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Copy error details to clipboard
        navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
            .then(() => {
                alert('Τα στοιχεία του σφάλματος αντιγράφηκαν στο clipboard. Παρακαλώ στείλτε τα στον διαχειριστή.');
            })
            .catch(() => {
                console.log('Error details:', errorDetails);
                alert('Αδυναμία αντιγραφής. Δείτε την κονσόλα για τα στοιχεία του σφάλματος.');
            });
    };

    render() {
        if (this.state.hasError) {
            const { fallbackComponent: FallbackComponent, fallbackMessage } = this.props;

            // If a custom fallback component is provided, use it
            if (FallbackComponent) {
                return (
                    <FallbackComponent
                        error={this.state.error}
                        retry={this.handleRetry}
                        reportProblem={this.handleReportProblem}
                    />
                );
            }

            // Default error UI
            return (
                <div className="pdf-error-boundary">
                    <style>
                        {`
                            .pdf-error-boundary {
                                background: rgba(231, 76, 60, 0.1);
                                border: 1px solid rgba(231, 76, 60, 0.3);
                                border-radius: 12px;
                                padding: 25px;
                                margin: 20px 0;
                                text-align: center;
                                backdrop-filter: blur(10px);
                            }

                            .error-icon {
                                font-size: 3rem;
                                margin-bottom: 15px;
                                color: #e74c3c;
                            }

                            .error-title {
                                color: #e74c3c;
                                font-size: 1.3rem;
                                font-weight: 600;
                                margin-bottom: 10px;
                            }

                            .error-message {
                                color: rgba(255, 255, 255, 0.9);
                                font-size: 1rem;
                                margin-bottom: 20px;
                                line-height: 1.5;
                            }

                            .error-actions {
                                display: flex;
                                gap: 15px;
                                justify-content: center;
                                flex-wrap: wrap;
                            }

                            .error-btn {
                                padding: 10px 20px;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 600;
                                transition: all 0.3s ease;
                                font-size: 0.9rem;
                            }

                            .retry-btn {
                                background: linear-gradient(135deg, #27ae60, #2ecc71);
                                color: white;
                            }

                            .retry-btn:hover {
                                transform: translateY(-2px);
                                box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
                            }

                            .report-btn {
                                background: rgba(255, 255, 255, 0.2);
                                color: white;
                                border: 1px solid rgba(255, 255, 255, 0.3);
                            }

                            .report-btn:hover {
                                background: rgba(255, 255, 255, 0.3);
                                transform: translateY(-2px);
                            }

                            .error-details {
                                background: rgba(0, 0, 0, 0.3);
                                border-radius: 8px;
                                padding: 15px;
                                margin-top: 20px;
                                text-align: left;
                                font-family: monospace;
                                font-size: 0.8rem;
                                color: rgba(255, 255, 255, 0.8);
                                max-height: 200px;
                                overflow-y: auto;
                                display: ${process.env.NODE_ENV === 'development' ? 'block' : 'none'};
                            }

                            @media (max-width: 768px) {
                                .pdf-error-boundary {
                                    padding: 20px;
                                    margin: 15px 0;
                                }

                                .error-actions {
                                    flex-direction: column;
                                    align-items: center;
                                }

                                .error-btn {
                                    width: 100%;
                                    max-width: 200px;
                                }
                            }
                        `}
                    </style>

                    <div className="error-icon">⚠️</div>
                    <div className="error-title">
                        Σφάλμα στη Λειτουργία PDF
                    </div>
                    <div className="error-message">
                        {fallbackMessage || 'Προέκυψε ένα πρόβλημα κατά τη φόρτωση της λειτουργίας PDF. Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε με τον διαχειριστή.'}
                        {this.state.retryCount > 0 && (
                            <div style={{ marginTop: '10px', fontSize: '0.9rem', opacity: 0.8 }}>
                                Προσπάθειες: {this.state.retryCount}
                            </div>
                        )}
                    </div>

                    <div className="error-actions">
                        <button
                            className="error-btn retry-btn"
                            onClick={this.handleRetry}
                            disabled={this.state.retryCount >= 3}
                        >
                            🔄 {this.state.retryCount >= 3 ? 'Μέγιστες Προσπάθειες' : 'Δοκιμή Ξανά'}
                        </button>

                        <button
                            className="error-btn report-btn"
                            onClick={this.handleReportProblem}
                        >
                            📋 Αναφορά Προβλήματος
                        </button>
                    </div>

                    {process.env.NODE_ENV === 'development' && (
                        <div className="error-details">
                            <strong>Error:</strong> {this.state.error && this.state.error.toString()}
                            <br />
                            <strong>Component Stack:</strong> {this.state.errorInfo.componentStack}
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default PDFErrorBoundary;