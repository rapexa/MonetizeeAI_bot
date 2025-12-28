/**
 * useFullscreen Hook - Simple and Reliable
 * 
 * Production-ready fullscreen management for videos in Telegram Mini Apps
 * Simple approach: Always use pseudo-fullscreen for Android, native for others
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPlatformInfo } from '../utils/platformDetection';

export interface UseFullscreenOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  containerRef?: React.RefObject<HTMLElement>;
  onEnter?: () => void;
  onExit?: () => void;
  enablePseudoFullscreen?: boolean;
}

export interface UseFullscreenReturn {
  isFullscreen: boolean;
  isPseudoFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  isFullscreenActive: () => boolean;
}

/**
 * Simple and reliable fullscreen hook
 * For Android: Always use pseudo-fullscreen (CSS-based)
 * For others: Try native first, fallback to pseudo
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
  const scrollPositionRef = useRef({ x: 0, y: 0 });

  /**
   * Check if fullscreen is active
   */
  const isFullscreenActive = useCallback((): boolean => {
    return isFullscreen || isPseudoFullscreen;
  }, [isFullscreen, isPseudoFullscreen]);

  /**
   * Enter pseudo-fullscreen - Simple CSS-based approach
   * This ALWAYS works on Android
   */
  const enterPseudoFullscreen = useCallback((): void => {
    if (!enablePseudoFullscreen) return;

    const video = videoRef.current;
    const container = containerRef?.current;
    
    if (!video || !container) return;

    // Save scroll position
    scrollPositionRef.current = {
      x: window.scrollX,
      y: window.scrollY,
    };

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.top = `-${scrollPositionRef.current.y}px`;
    document.body.style.left = `-${scrollPositionRef.current.x}px`;

    // Make container fullscreen
    const containerEl = container as HTMLElement;
    containerEl.style.position = 'fixed';
    containerEl.style.top = '0';
    containerEl.style.left = '0';
    containerEl.style.right = '0';
    containerEl.style.bottom = '0';
    containerEl.style.width = '100vw';
    containerEl.style.height = '100dvh'; // Android dynamic viewport
    containerEl.style.zIndex = '99999';
    containerEl.style.backgroundColor = '#000';
    containerEl.style.margin = '0';
    containerEl.style.padding = '0';
    containerEl.style.borderRadius = '0';

    // Make video fullscreen
    video.style.width = '100vw';
    video.style.height = '100dvh';
    video.style.maxWidth = '100vw';
    video.style.maxHeight = '100dvh';
    video.style.objectFit = 'contain';

    // Disable Telegram gestures
    try {
      window.Telegram?.WebApp?.disableVerticalSwipes?.();
    } catch {}

    setIsPseudoFullscreen(true);
    setIsFullscreen(true);
    onEnter?.();
  }, [videoRef, containerRef, enablePseudoFullscreen, onEnter]);

  /**
   * Exit pseudo-fullscreen
   */
  const exitPseudoFullscreen = useCallback((): void => {
    const video = videoRef.current;
    const container = containerRef?.current;
    
    if (!video || !container) return;

    // Restore body
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.top = '';
    document.body.style.left = '';

    // Restore scroll
    window.scrollTo(scrollPositionRef.current.x, scrollPositionRef.current.y);

    // Restore container
    const containerEl = container as HTMLElement;
    containerEl.style.position = '';
    containerEl.style.top = '';
    containerEl.style.left = '';
    containerEl.style.right = '';
    containerEl.style.bottom = '';
    containerEl.style.width = '';
    containerEl.style.height = '';
    containerEl.style.zIndex = '';
    containerEl.style.backgroundColor = '';
    containerEl.style.margin = '';
    containerEl.style.padding = '';
    containerEl.style.borderRadius = '';

    // Restore video
    video.style.width = '';
    video.style.height = '';
    video.style.maxWidth = '';
    video.style.maxHeight = '';
    video.style.objectFit = '';

    // Re-enable Telegram gestures
    try {
      window.Telegram?.WebApp?.enableVerticalSwipes?.();
    } catch {}

    setIsPseudoFullscreen(false);
    setIsFullscreen(false);
    onExit?.();
  }, [videoRef, containerRef, onExit]);

  /**
   * Enter native fullscreen (for iOS and Desktop)
   */
  const enterNativeFullscreen = useCallback(async (): Promise<boolean> => {
    const video = videoRef.current;
    if (!video) return false;

    const anyVideo = video as any;

    // Try standard API
    if (video.requestFullscreen) {
      try {
        await video.requestFullscreen();
        return true;
      } catch {}
    }

    // Try webkit
    if (anyVideo.webkitRequestFullscreen) {
      try {
        await anyVideo.webkitRequestFullscreen();
        return true;
      } catch {}
    }

    // Try iOS video fullscreen
    if (platformInfo.isIOS && anyVideo.webkitEnterFullscreen) {
      try {
        anyVideo.webkitEnterFullscreen();
        return true;
      } catch {}
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
        }
      } catch {}
    }
  }, []);

  /**
   * Enter fullscreen
   */
  const enterFullscreen = useCallback(async (): Promise<void> => {
    // For Android: Always use pseudo-fullscreen
    if (platformInfo.isAndroid && enablePseudoFullscreen) {
      enterPseudoFullscreen();
      return;
    }

    // For others: Try native first
    const nativeSuccess = await enterNativeFullscreen();
    if (nativeSuccess) {
      setIsFullscreen(true);
      setIsPseudoFullscreen(false);
      onEnter?.();
      return;
    }

    // Fallback to pseudo
    if (enablePseudoFullscreen) {
      enterPseudoFullscreen();
    }
  }, [platformInfo.isAndroid, enablePseudoFullscreen, enterNativeFullscreen, enterPseudoFullscreen, onEnter]);

  /**
   * Exit fullscreen
   */
  const exitFullscreen = useCallback(async (): Promise<void> => {
    if (isPseudoFullscreen) {
      exitPseudoFullscreen();
    } else {
      await exitNativeFullscreen();
      setIsFullscreen(false);
      setIsPseudoFullscreen(false);
      onExit?.();
    }
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
        anyDoc.webkitFullscreenElement
      );

      if (!active && isFullscreen && !isPseudoFullscreen) {
        setIsFullscreen(false);
        onExit?.();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, isPseudoFullscreen, onExit]);

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
