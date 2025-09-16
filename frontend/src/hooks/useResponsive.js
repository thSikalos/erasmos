import { useState, useEffect } from 'react';

// Breakpoints following common conventions
const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400
};

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  const [breakpoint, setBreakpoint] = useState('lg');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setWindowSize({ width, height });

      // Determine current breakpoint
      if (width >= BREAKPOINTS.xxl) {
        setBreakpoint('xxl');
      } else if (width >= BREAKPOINTS.xl) {
        setBreakpoint('xl');
      } else if (width >= BREAKPOINTS.lg) {
        setBreakpoint('lg');
      } else if (width >= BREAKPOINTS.md) {
        setBreakpoint('md');
      } else if (width >= BREAKPOINTS.sm) {
        setBreakpoint('sm');
      } else {
        setBreakpoint('xs');
      }
    };

    // Set initial size
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  const isTablet = breakpoint === 'md';
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === 'xxl';
  const isSmallScreen = breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md';

  return {
    windowSize,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    // Utility functions
    isBreakpointUp: (bp) => windowSize.width >= BREAKPOINTS[bp],
    isBreakpointDown: (bp) => windowSize.width < BREAKPOINTS[bp],
    isBreakpointBetween: (lower, upper) =>
      windowSize.width >= BREAKPOINTS[lower] && windowSize.width < BREAKPOINTS[upper]
  };
};

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

// Touch device detection hook
export const useTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();

    // Check again on window focus in case device capabilities change
    window.addEventListener('focus', checkTouch);

    return () => window.removeEventListener('focus', checkTouch);
  }, []);

  return isTouch;
};

// Orientation hook
export const useOrientation = () => {
  const [orientation, setOrientation] = useState('portrait');

  useEffect(() => {
    const handleOrientationChange = () => {
      if (window.innerHeight > window.innerWidth) {
        setOrientation('portrait');
      } else {
        setOrientation('landscape');
      }
    };

    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
};

// Safe area insets for devices with notches/home indicators
export const useSafeAreaInsets = () => {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const updateInsets = () => {
      const style = getComputedStyle(document.documentElement);

      setInsets({
        top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0')
      });
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    window.addEventListener('orientationchange', updateInsets);

    return () => {
      window.removeEventListener('resize', updateInsets);
      window.removeEventListener('orientationchange', updateInsets);
    };
  }, []);

  return insets;
};

// Reduced motion preference
export const usePrefersReducedMotion = () => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return prefersReducedMotion;
};

// Dark mode preference
export const usePrefersDarkMode = () => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  return prefersDarkMode;
};

// High contrast preference
export const usePrefersHighContrast = () => {
  const prefersHighContrast = useMediaQuery('(prefers-contrast: high)');
  return prefersHighContrast;
};

export default useResponsive;