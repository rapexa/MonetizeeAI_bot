/**
 * useFullscreen Hook
 * 
 * Production-ready fullscreen management for videos in Telegram Mini Apps
 * Handles all platform-specific quirks and fallbacks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPlatformInfo, type PlatformInfo } from '../utils/platformDetection';

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
  const platformInfoRef = useRef<PlatformInfo>(getPlatformInfo());
  
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
    if (platformInfoRef.current.isIOS && anyVideo.webkitEnterFullscreen) {
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
  }, [videoRef]);

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
   * CRITICAL for Android WebView compatibility
   */
  const enterPseudoFullscreen = useCallback((): void => {
    if (!enablePseudoFullscreen) return;

    const video = videoRef.current;
    const container = containerRef?.current || video?.parentElement;
    
    if (!video || !container) return;

    // Mark as pseudo-fullscreen
    setIsPseudoFullscreen(true);
    setIsFullscreen(true);

    // Store original styles for cleanup
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;
    const originalTop = document.body.style.top;
    const originalLeft = document.body.style.left;
    const originalRight = document.body.style.right;
    const originalBottom = document.body.style.bottom;

    // Store original scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // CRITICAL: For Mobile (Android & iOS), we need to prevent all scrolling and fix viewport
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.height = '100dvh'; // Dynamic viewport for mobile
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = `-${scrollX}px`;
      document.body.style.right = '0';
      document.body.style.bottom = '0';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      
      // Add class for CSS targeting
      document.body.classList.add('video-fullscreen-active');
      document.documentElement.classList.add('video-fullscreen-active');
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100vh';
      document.documentElement.style.height = '100dvh';
    });

    // Make container fullscreen
    const containerElement = container as HTMLElement;
    
    // CRITICAL: Fix parent containers that might block fullscreen (Android issue)
    const parents: HTMLElement[] = [];
    let parent = containerElement.parentElement;
    while (parent && parent !== document.body) {
      parents.push(parent);
      // Store original overflow
      (parent as any).__originalOverflow = (parent as any).__originalOverflow || window.getComputedStyle(parent).overflow;
      // Force overflow visible for fullscreen
      parent.style.overflow = 'visible';
      parent.style.position = 'relative';
      parent = parent.parentElement;
    }
    
    // CRITICAL: Store original container styles
    const originalContainerStyles = {
      position: containerElement.style.position,
      top: containerElement.style.top,
      left: containerElement.style.left,
      right: containerElement.style.right,
      bottom: containerElement.style.bottom,
      width: containerElement.style.width,
      height: containerElement.style.height,
      maxWidth: containerElement.style.maxWidth,
      maxHeight: containerElement.style.maxHeight,
      zIndex: containerElement.style.zIndex,
      backgroundColor: containerElement.style.backgroundColor,
      margin: containerElement.style.margin,
      padding: containerElement.style.padding,
      borderRadius: containerElement.style.borderRadius,
      overflow: containerElement.style.overflow,
    };
    
    // Apply fullscreen styles - CRITICAL for Mobile (Android & iOS)
    // Use requestAnimationFrame to ensure DOM is ready before applying styles
    requestAnimationFrame(() => {
      containerElement.style.setProperty('position', 'fixed', 'important');
      containerElement.style.setProperty('top', '0', 'important');
      containerElement.style.setProperty('left', '0', 'important');
      containerElement.style.setProperty('right', '0', 'important');
      containerElement.style.setProperty('bottom', '0', 'important');
      containerElement.style.setProperty('width', '100vw', 'important');
      containerElement.style.setProperty('height', '100vh', 'important');
      containerElement.style.setProperty('height', '100dvh', 'important'); // Dynamic viewport for mobile
      containerElement.style.setProperty('max-width', '100vw', 'important');
      containerElement.style.setProperty('max-height', '100vh', 'important');
      containerElement.style.setProperty('max-height', '100dvh', 'important');
      containerElement.style.setProperty('z-index', '99999', 'important');
      containerElement.style.setProperty('background-color', '#000', 'important');
      containerElement.style.setProperty('margin', '0', 'important');
      containerElement.style.setProperty('padding', '0', 'important');
      containerElement.style.setProperty('border-radius', '0', 'important');
      containerElement.style.setProperty('overflow', 'hidden', 'important');
      // Force hardware acceleration
      containerElement.style.setProperty('transform', 'translateZ(0)', 'important');
      containerElement.style.setProperty('-webkit-transform', 'translateZ(0)', 'important');
      containerElement.classList.add('video-pseudo-fullscreen');
    });
    
    // Store original styles and parent fixes for cleanup
    (containerElement as any).__originalContainerStyles = originalContainerStyles;
    (containerElement as any).__fixedParents = parents;

    // Make video fullscreen - CRITICAL for Android
    const originalVideoStyles = {
      width: video.style.width,
      height: video.style.height,
      maxWidth: video.style.maxWidth,
      maxHeight: video.style.maxHeight,
      objectFit: video.style.objectFit,
      display: video.style.display,
      margin: video.style.margin,
    };
    
    // Apply video fullscreen styles with requestAnimationFrame
    requestAnimationFrame(() => {
      video.style.setProperty('width', '100vw', 'important');
      video.style.setProperty('height', '100vh', 'important');
      video.style.setProperty('height', '100dvh', 'important'); // Dynamic viewport for mobile
      video.style.setProperty('max-width', '100vw', 'important');
      video.style.setProperty('max-height', '100vh', 'important');
      video.style.setProperty('max-height', '100dvh', 'important');
      video.style.setProperty('object-fit', 'contain', 'important');
      video.style.setProperty('display', 'block', 'important');
      video.style.setProperty('margin', 'auto', 'important');
      // Force hardware acceleration
      video.style.setProperty('transform', 'translateZ(0)', 'important');
      video.style.setProperty('-webkit-transform', 'translateZ(0)', 'important');
    });
    
    // Store original styles for cleanup
    (video as any).__originalVideoStyles = originalVideoStyles;

    // Disable Telegram WebApp gestures that might interfere
    try {
      if (window.Telegram?.WebApp) {
        // @ts-ignore - Telegram WebApp API may have these methods
        window.Telegram.WebApp.disableVerticalSwipes?.();
      }
    } catch (err) {
      // Ignore errors
    }

    // Store cleanup function
    (container as any).__fullscreenCleanup = () => {
      // Restore body and html styles
      requestAnimationFrame(() => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        document.body.style.top = originalTop;
        document.body.style.left = originalLeft;
        document.body.style.right = originalRight;
        document.body.style.bottom = originalBottom;
        document.body.style.margin = '';
        document.body.style.padding = '';
        
        // Remove classes
        document.body.classList.remove('video-fullscreen-active');
        document.documentElement.classList.remove('video-fullscreen-active');
        document.documentElement.style.overflow = '';
        document.documentElement.style.height = '';
        
        // Restore scroll position
        window.scrollTo(scrollX, scrollY);
      });

      // Restore parent containers
      const fixedParents = (containerElement as any).__fixedParents;
      if (fixedParents && Array.isArray(fixedParents)) {
        fixedParents.forEach((parent: HTMLElement) => {
          const originalOverflow = (parent as any).__originalOverflow;
          if (originalOverflow !== undefined) {
            parent.style.overflow = originalOverflow;
            delete (parent as any).__originalOverflow;
          }
          parent.style.position = '';
        });
      }
      
      // Restore container styles from stored original
      const originalStyles = (containerElement as any).__originalContainerStyles;
      if (originalStyles) {
        containerElement.style.removeProperty('position');
        containerElement.style.removeProperty('top');
        containerElement.style.removeProperty('left');
        containerElement.style.removeProperty('right');
        containerElement.style.removeProperty('bottom');
        containerElement.style.removeProperty('width');
        containerElement.style.removeProperty('height');
        containerElement.style.removeProperty('max-width');
        containerElement.style.removeProperty('max-height');
        containerElement.style.removeProperty('z-index');
        containerElement.style.removeProperty('background-color');
        containerElement.style.removeProperty('margin');
        containerElement.style.removeProperty('padding');
        containerElement.style.removeProperty('border-radius');
        containerElement.style.removeProperty('overflow');
        
        // Restore original values if they existed
        if (originalStyles.position) containerElement.style.position = originalStyles.position;
        if (originalStyles.top) containerElement.style.top = originalStyles.top;
        if (originalStyles.left) containerElement.style.left = originalStyles.left;
        if (originalStyles.right) containerElement.style.right = originalStyles.right;
        if (originalStyles.bottom) containerElement.style.bottom = originalStyles.bottom;
        if (originalStyles.width) containerElement.style.width = originalStyles.width;
        if (originalStyles.height) containerElement.style.height = originalStyles.height;
        if (originalStyles.maxWidth) containerElement.style.maxWidth = originalStyles.maxWidth;
        if (originalStyles.maxHeight) containerElement.style.maxHeight = originalStyles.maxHeight;
        if (originalStyles.zIndex) containerElement.style.zIndex = originalStyles.zIndex;
        if (originalStyles.backgroundColor) containerElement.style.backgroundColor = originalStyles.backgroundColor;
        if (originalStyles.margin) containerElement.style.margin = originalStyles.margin;
        if (originalStyles.padding) containerElement.style.padding = originalStyles.padding;
        if (originalStyles.borderRadius) containerElement.style.borderRadius = originalStyles.borderRadius;
        if (originalStyles.overflow) containerElement.style.overflow = originalStyles.overflow;
        
        delete (containerElement as any).__originalContainerStyles;
        delete (containerElement as any).__fixedParents;
      }
      containerElement.classList.remove('video-pseudo-fullscreen');

      // Restore video styles from stored original
      const originalVideoStyles = (video as any).__originalVideoStyles;
      if (originalVideoStyles) {
        video.style.width = originalVideoStyles.width;
        video.style.height = originalVideoStyles.height;
        video.style.maxWidth = originalVideoStyles.maxWidth;
        video.style.maxHeight = originalVideoStyles.maxHeight;
        video.style.objectFit = originalVideoStyles.objectFit;
        video.style.display = originalVideoStyles.display;
        video.style.margin = originalVideoStyles.margin;
        delete (video as any).__originalVideoStyles;
      }

      // Re-enable Telegram WebApp gestures
      try {
        if (window.Telegram?.WebApp) {
          // @ts-ignore - Telegram WebApp API may have these methods
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
   * CRITICAL: For mobile, always use pseudo-fullscreen (native doesn't work in WebView)
   */
  const enterFullscreen = useCallback(async (): Promise<void> => {
    // Mark that we're in a user gesture context
    userGestureRef.current = true;
    
    // CRITICAL FIX: For ALL mobile devices (Android & iOS), use pseudo-fullscreen
    // Native fullscreen API doesn't work reliably in Telegram WebView
    if (platformInfoRef.current.isMobile && enablePseudoFullscreen) {
      enterPseudoFullscreen();
      onEnter?.();
      return;
    }
    
    // Only for Desktop: Try native fullscreen first
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

