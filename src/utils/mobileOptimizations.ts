/**
 * Mobile optimization utilities for DTI calculator
 */

/**
 * Detect if user is on a mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detect if user is on a touch-enabled device
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get viewport dimensions
 */
export function getViewportDimensions() {
  return {
    width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
  };
}

/**
 * Detect if keyboard is visible (approximate)
 */
export function isKeyboardVisible(): boolean {
  const viewport = getViewportDimensions();
  // On mobile, keyboard typically reduces viewport height by 40-60%
  return isMobileDevice() && viewport.height < window.screen.height * 0.7;
}

/**
 * Prevent body scroll when modal is open
 */
export function lockBodyScroll(): void {
  const scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
}

/**
 * Restore body scroll when modal is closed
 */
export function unlockBodyScroll(): void {
  const scrollY = document.body.style.top;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, parseInt(scrollY || '0') * -1);
}

/**
 * Focus input without zooming on iOS
 */
export function focusWithoutZoom(element: HTMLInputElement): void {
  if (!isMobileDevice()) {
    element.focus();
    return;
  }

  // Temporarily set font size to prevent zoom
  const originalFontSize = element.style.fontSize;
  element.style.fontSize = '16px';
  element.focus();
  
  // Restore original font size after a brief delay
  setTimeout(() => {
    element.style.fontSize = originalFontSize;
  }, 100);
}

/**
 * Handle orientation change
 */
export function onOrientationChange(callback: () => void): () => void {
  const handleChange = () => {
    // Wait for orientation change to complete
    setTimeout(callback, 200);
  };

  window.addEventListener('orientationchange', handleChange);
  window.addEventListener('resize', handleChange);

  return () => {
    window.removeEventListener('orientationchange', handleChange);
    window.removeEventListener('resize', handleChange);
  };
}

/**
 * Detect if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Apply mobile-specific classes to element
 */
export function applyMobileClasses(element: HTMLElement): void {
  if (isMobileDevice()) {
    element.classList.add('is-mobile');
  }
  
  if (isTouchDevice()) {
    element.classList.add('is-touch');
  }
  
  if (prefersReducedMotion()) {
    element.classList.add('reduce-motion');
  }
}

/**
 * Format number for mobile display (shorter format)
 */
export function formatNumberMobile(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Debounce function optimized for mobile
 */
export function mobileDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}