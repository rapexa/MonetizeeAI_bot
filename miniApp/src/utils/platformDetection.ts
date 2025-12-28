/**
 * Platform Detection Utility
 * 
 * Reliably detects platform, browser, and Telegram WebView context
 * Used for conditional fullscreen behavior and video handling
 */

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isTelegramWebView: boolean;
  isSafari: boolean;
  isChrome: boolean;
  supportsNativeFullscreen: boolean;
  supportsWebkitFullscreen: boolean;
  supportsVideoFullscreen: boolean; // iOS-specific video fullscreen
}

/**
 * Detect if running inside Telegram WebView
 * Multiple detection methods for reliability
 */
function detectTelegramWebView(): boolean {
  if (typeof window === 'undefined') return false;

  // Method 1: Check for Telegram WebApp object
  if (window.Telegram?.WebApp) {
    // Additional check: Telegram WebApp has initData or user info
    const webApp = window.Telegram.WebApp;
    if (webApp.initData || webApp.initDataUnsafe?.user) {
      return true;
    }
  }

  // Method 2: Check User-Agent for Telegram patterns
  const userAgent = navigator.userAgent || '';
  const telegramPatterns = [
    'Telegram',
    'TelegramBot',
    'tdesktop',
    'Telegram Desktop',
    'Telegram Web',
  ];
  if (telegramPatterns.some(pattern => userAgent.includes(pattern))) {
    return true;
  }

  // Method 3: Check referrer for Telegram domains
  const referrer = document.referrer || '';
  if (referrer.includes('t.me') || 
      referrer.includes('telegram.org') || 
      referrer.includes('telegram.me')) {
    return true;
  }

  // Method 4: Check if URL contains Telegram domain
  if (window.location.href.includes('t.me') || 
      window.location.href.includes('telegram.org')) {
    return true;
  }

  return false;
}

/**
 * Detect iOS device
 * More reliable than user-agent parsing
 */
function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;

  // Method 1: User-Agent check
  const userAgent = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return true;
  }

  // Method 2: Platform check (more reliable)
  if (/iPad|iPhone|iPod/.test(navigator.platform || '')) {
    return true;
  }

  // Method 3: Check for iOS-specific APIs
  // iOS Safari has touch events and specific vendor prefixes
  if ('ontouchstart' in window && 
      /Mac/.test(navigator.platform) && 
      !(window as any).MSStream) {
    // This is likely iPad on iOS 13+
    return true;
  }

  return false;
}

/**
 * Detect Android device
 */
function detectAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent || '');
}

/**
 * Detect Safari browser (not just iOS)
 */
function detectSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  return /^((?!chrome|android).)*safari/i.test(userAgent);
}

/**
 * Detect Chrome browser
 */
function detectChrome(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  return /Chrome/.test(userAgent) && !/Edg|OPR|Safari/.test(userAgent);
}

/**
 * Check fullscreen API support
 */
function checkFullscreenSupport(): {
  native: boolean;
  webkit: boolean;
  video: boolean; // iOS video-specific
} {
  if (typeof document === 'undefined') {
    return { native: false, webkit: false, video: false };
  }

  const doc = document as any;
  const video = document.createElement('video') as any;

  return {
    // Standard Fullscreen API
    native: !!(doc.fullscreenEnabled || 
               doc.webkitFullscreenEnabled || 
               doc.mozFullScreenEnabled || 
               doc.msFullscreenEnabled),
    
    // WebKit fullscreen (Safari, Chrome)
    webkit: !!(video.webkitRequestFullscreen || 
               doc.webkitFullscreenEnabled),
    
    // iOS video-specific fullscreen (webkitEnterFullscreen)
    video: !!(video.webkitEnterFullscreen),
  };
}

/**
 * Get comprehensive platform information
 * Cached for performance (platform doesn't change during session)
 */
let cachedPlatformInfo: PlatformInfo | null = null;

export function getPlatformInfo(): PlatformInfo {
  if (cachedPlatformInfo) {
    return cachedPlatformInfo;
  }

  const isIOS = detectIOS();
  const isAndroid = detectAndroid();
  const isMobile = isIOS || isAndroid;
  const isTelegramWebView = detectTelegramWebView();
  const isSafari = detectSafari();
  const isChrome = detectChrome();
  
  const fullscreenSupport = checkFullscreenSupport();

  cachedPlatformInfo = {
    isIOS,
    isAndroid,
    isMobile,
    isTelegramWebView,
    isSafari,
    isChrome,
    supportsNativeFullscreen: fullscreenSupport.native,
    supportsWebkitFullscreen: fullscreenSupport.webkit,
    supportsVideoFullscreen: fullscreenSupport.video,
  };

  return cachedPlatformInfo;
}

/**
 * Reset cached platform info (useful for testing)
 */
export function resetPlatformCache(): void {
  cachedPlatformInfo = null;
}

