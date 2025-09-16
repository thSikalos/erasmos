import React from 'react';
import { useResponsive } from '../hooks/useResponsive';

const MobileTest = () => {
  const { isMobile, isTablet, isDesktop, breakpoint, windowSize } = useResponsive();

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div>📱 Mobile: {isMobile ? '✅' : '❌'}</div>
      <div>📟 Tablet: {isTablet ? '✅' : '❌'}</div>
      <div>💻 Desktop: {isDesktop ? '✅' : '❌'}</div>
      <div>📏 Breakpoint: {breakpoint}</div>
      <div>📐 Size: {windowSize.width}x{windowSize.height}</div>
    </div>
  );
};

export default MobileTest;