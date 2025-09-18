import React, { Suspense, lazy } from 'react';

const VisualPDFMapper = lazy(() => import('./VisualPDFMapper'));

const PDFLoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    margin: '20px 0',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    flexDirection: 'column',
    gap: '15px'
  }}>
    <div style={{
      border: '3px solid rgba(255,255,255,0.3)',
      borderTop: '3px solid white',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      animation: 'spin 1s linear infinite'
    }}></div>
    <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: '500' }}>
      Φόρτωση PDF Tools...
    </div>
    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
      Αρχικοποίηση PDF.js worker
    </div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const LazyPDFMapper = (props) => {
  return (
    <Suspense fallback={<PDFLoadingFallback />}>
      <VisualPDFMapper {...props} />
    </Suspense>
  );
};

export default LazyPDFMapper;