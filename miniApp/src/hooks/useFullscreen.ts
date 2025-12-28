/**
 * useFullscreen Hook
 * 
 * Production-ready fullscreen management for videos in Telegram Mini Apps
 * Handles all platform-specific quirks and fallbacks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPlatformInfo } from '../utils/platformDetection';

export interface UseFullscreenOptions {
  /**
   * Video element ref
   */
  videoRef: React.RefObject<HTMLVideoElement>;
  
  /**
   * Container element ref (for pseudo-fullscreen)
   */
  containerRef?: React.RefObject<HTMLElement>;
  
  /**
   * Callback when entering fullscreen
   */
  onEnter?: () => void;
  
  /**
   * Callback when exiting fullscreen
   */
  onExit?: () => void;
  
  /**
   * Enable pseudo-fullscreen fallback (CSS-based)
   * Default: true
   */
  enablePseudoFullscreen?: boolean;
}

export interface UseFullscreenReturn {
  /**
   * Current fullscreen state
   */
  isFullscreen: boolean;
  
  /**
   * Whether using pseudo-fullscreen (CSS fallback)
   */
  isPseudoFullscreen: boolean;
  
  /**
   * Toggle fullscreen
   */
  toggleFullscreen: () => Promise<void>;
  
  /**
   * Enter fullscreen
   */
  enterFullscreen: () => Promise<void>;
  
  /**
   * Exit fullscreen
   */
  exitFullscreen: () => Promise<void>;
  
  /**
   * Check if fullscreen is currently active
   */
  isFullscreenActive: () => boolean;
}

/**
 * Production-ready fullscreen hook for Telegram Mini Apps
 * 
 * WHY this approach:
 * 1. Handles all browser prefixes (webkit, moz, ms)
 * 2. Detects platform capabilities and uses appropriate method
 * 3. Falls back to CSS-based pseudo-fullscreen when native APIs fail
 * 4. Properly manages Telegram WebApp interactions
 * 5. Handles orientation changes and viewport resizing
 */
export function useFullscreen(options: UseFullscreenOptions): UseFullscreenReturn {
  const {
    videoRef,
    containerRef,
    onEnter,
    onExit,
    enablePseudoFullscreen = true,
  } = options;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const platformInfo = getPlatformInfo();
  
  // Track if we're in a user gesture context (required for some fullscreen APIs)
  const userGestureRef = useRef(false);

  /**
   * Check if any fullscreen mode is currently active
   */
  const isFullscreenActive = useCallback((): boolean => {
    const doc = document as any;
    return !!(
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      isPseudoFullscreen
    );
  }, [isPseudoFullscreen]);

  /**
   * Enter native fullscreen using all available methods
   */
  const enterNativeFullscreen = useCallback(async (): Promise<boolean> => {
    const video = videoRef.current;
    if (!video) return false;

    const anyVideo = video as any;
    const anyDoc = document as any;

    // Method 1: Standard Fullscreen API (Chrome, Firefox, Edge)
    if (video.requestFullscreen) {
      try {
        await video.requestFullscreen();
        return true;
      } catch (err) {
        console.debug('[Fullscreen] Standard API failed:', err);
      }
    }

    // Method 2: WebKit Fullscreen (Safari, Chrome)
    if (anyVideo.webkitRequestFullscreen) {
      try {
        await anyVideo.webkitRequestFullscreen();
        return true;
      } catch (err) {
        console.debug('[Fullscreen] WebKit API failed:', err);
      }
    }

    // Method 3: Mozilla Fullscreen (Firefox)
    if (anyVideo.mozRequestFullScreen) {
      try {
        await anyVideo.mozRequestFullScreen();
        return true;
      } catch (err) {
        console.debug('[Fullscreen] Mozilla API failed:', err);
      }
    }

    // Method 4: MS Fullscreen (IE/Edge Legacy)
    if (anyVideo.msRequestFullscreen) {
      try {
        await anyVideo.msRequestFullscreen();
        return true;
      } catch (err) {
        console.debug('[Fullscreen] MS API failed:', err);
      }
    }

    // Method 5: iOS Safari Video Fullscreen (webkitEnterFullscreen)
    // This is iOS-specific and works differently - it's a native video player
    if (platformInfo.isIOS && anyVideo.webkitEnterFullscreen) {
      try {
        // This must be called in a user gesture context
        if (userGestureRef.current) {
          anyVideo.webkitEnterFullscreen();
          // Note: webkitEnterFullscreen doesn't trigger fullscreenchange events
          // We'll handle this separately
          return true;
        }
      } catch (err) {
        console.debug('[Fullscreen] iOS video fullscreen failed:', err);
      }
    }

    return false;
  }, [videoRef, platformInfo.isIOS]);

  /**
   * Exit native fullscreen
   */
  const exitNativeFullscreen = useCallback(async (): Promise<void> => {
    const anyDoc = document as any;

    if (document.fullscreenElement) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (anyDoc.webkitExitFullscreen) {
          await anyDoc.webkitExitFullscreen();
        } else if (anyDoc.mozCancelFullScreen) {
          await anyDoc.mozCancelFullScreen();
        } else if (anyDoc.msExitFullscreen) {
          await anyDoc.msExitFullscreen();
        }
      } catch (err) {
        console.debug('[Fullscreen] Exit failed:', err);
      }
    }
  }, []);

  /**
   * Enter pseudo-fullscreen (CSS-based fallback)
   * This works when native fullscreen APIs are blocked
   */
  const enterPseudoFullscreen = useCallback((): void => {
    if (!enablePseudoFullscreen) return;

    const video = videoRef.current;
    const container = containerRef?.current || video?.parentElement;
    
    if (!video || !container) return;

    // Mark as pseudo-fullscreen
    setIsPseudoFullscreen(true);
    setIsFullscreen(true);

    // Prevent body scrolling
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;
    const originalTop = document.body.style.top;

    // Store original scroll position
    const scrollY = window.scrollY;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.top = `-${scrollY}px`;

    // Disable Telegram WebApp gestures that might interfere
    try {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.disableVerticalSwipes?.();
      }
    } catch (err) {
      // Ignore errors
    }

    // Store cleanup function
    (container as any).__fullscreenCleanup = () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      document.body.style.top = originalTop;
      
      // Restore scroll position
      window.scrollTo(0, scrollY);

      // Re-enable Telegram WebApp gestures
      try {
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.enableVerticalSwipes?.();
        }
      } catch (err) {
        // Ignore errors
      }
    };
  }, [videoRef, containerRef, enablePseudoFullscreen]);

  /**
   * Exit pseudo-fullscreen
   */
  const exitPseudoFullscreen = useCallback((): void => {
    const video = videoRef.current;
    const container = containerRef?.current || video?.parentElement;
    
    if (container && (container as any).__fullscreenCleanup) {
      (container as any).__fullscreenCleanup();
      delete (container as any).__fullscreenCleanup;
    }

    setIsPseudoFullscreen(false);
    setIsFullscreen(false);
  }, [videoRef, containerRef]);

  /**
   * Enter fullscreen (tries native first, falls back to pseudo)
   */
  const enterFullscreen = useCallback(async (): Promise<void> => {
    // Mark that we're in a user gesture context
    userGestureRef.current = true;
    
    // Try native fullscreen first
    const nativeSuccess = await enterNativeFullscreen();
    
    if (nativeSuccess) {
      setIsFullscreen(true);
      setIsPseudoFullscreen(false);
      onEnter?.();
      return;
    }

    // Fallback to pseudo-fullscreen if enabled
    if (enablePseudoFullscreen) {
      enterPseudoFullscreen();
      onEnter?.();
    }
  }, [enterNativeFullscreen, enterPseudoFullscreen, enablePseudoFullscreen, onEnter]);

  /**
   * Exit fullscreen
   */
  const exitFullscreen = useCallback(async (): Promise<void> => {
    if (isPseudoFullscreen) {
      exitPseudoFullscreen();
    } else {
      await exitNativeFullscreen();
    }
    
    setIsFullscreen(false);
    setIsPseudoFullscreen(false);
    onExit?.();
  }, [isPseudoFullscreen, exitPseudoFullscreen, exitNativeFullscreen, onExit]);

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = useCallback(async (): Promise<void> => {
    if (isFullscreenActive()) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreenActive, enterFullscreen, exitFullscreen]);

  /**
   * Listen for native fullscreen changes
   */
  useEffect(() => {
    const anyDoc = document as any;

    const handleFullscreenChange = (): void => {
      const active = !!(
        document.fullscreenElement ||
        anyDoc.webkitFullscreenElement ||
        anyDoc.mozFullScreenElement ||
        anyDoc.msFullscreenElement
      );

      setIsFullscreen(active);
      
      // If native fullscreen exited, also exit pseudo if active
      if (!active && isPseudoFullscreen) {
        exitPseudoFullscreen();
      }
    };

    const handleWebkitEnd = (): void => {
      setIsFullscreen(false);
      if (isPseudoFullscreen) {
        exitPseudoFullscreen();
      }
    };

    // Add all fullscreen event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('webkitendfullscreen', handleWebkitEnd as any);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('webkitendfullscreen', handleWebkitEnd as any);
    };
  }, [isPseudoFullscreen, exitPseudoFullscreen]);

  /**
   * Handle orientation changes and viewport resizing
   */
  useEffect(() => {
    if (!isPseudoFullscreen) return;

    const handleResize = (): void => {
      // Recalculate pseudo-fullscreen on resize
      // This ensures video stays properly sized
      if (isPseudoFullscreen) {
        // Trigger a re-render by toggling state
        const video = videoRef.current;
        if (video) {
          // Force video to recalculate dimensions
          video.style.width = '100vw';
          video.style.height = '100vh';
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isPseudoFullscreen, videoRef]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isPseudoFullscreen) {
        exitPseudoFullscreen();
      }
    };
  }, [isPseudoFullscreen, exitPseudoFullscreen]);

  return {
    isFullscreen,
    isPseudoFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    isFullscreenActive,
  };
}

