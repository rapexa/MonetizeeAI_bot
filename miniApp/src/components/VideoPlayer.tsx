/**
 * VideoPlayer Component
 * 
 * Production-ready video player for Telegram Mini Apps
 * Handles fullscreen, platform-specific quirks, and all edge cases
 */

import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { useFullscreen } from '../hooks/useFullscreen';
import { getPlatformInfo } from '../utils/platformDetection';

export interface VideoPlayerProps {
  /**
   * Video source URL
   */
  src: string;
  
  /**
   * Video title (displayed as overlay)
   */
  title?: string;
  
  /**
   * Poster image URL
   */
  poster?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Container CSS classes (for styling the wrapper)
   */
  containerClassName?: string;
  
  /**
   * Show fullscreen button
   * Default: true
   */
  showFullscreenButton?: boolean;
  
  /**
   * Video element attributes
   */
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
  
  /**
   * Callback when video starts playing
   */
  onPlay?: () => void;
  
  /**
   * Callback when video ends
   */
  onEnded?: () => void;
  
  /**
   * Callback when video is loaded
   */
  onLoadedData?: () => void;
  
  /**
   * Custom fullscreen button renderer
   */
  renderFullscreenButton?: (props: {
    isFullscreen: boolean;
    toggleFullscreen: () => Promise<void>;
  }) => React.ReactNode;
}

/**
 * Production-ready VideoPlayer component
 * 
 * WHY this implementation:
 * 1. Uses platform detection to set correct video attributes
 * 2. Handles all fullscreen methods with proper fallbacks
 * 3. Manages Telegram WebApp interactions correctly
 * 4. Handles viewport and safe-area insets
 * 5. Prevents common mobile video issues (cropping, scaling)
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  poster,
  className = '',
  containerClassName = '',
  showFullscreenButton = true,
  videoProps = {},
  onPlay,
  onEnded,
  onLoadedData,
  renderFullscreenButton,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const platformInfo = getPlatformInfo();
  
  // Fullscreen management
  const {
    isFullscreen,
    isPseudoFullscreen,
    toggleFullscreen,
    isFullscreenActive,
  } = useFullscreen({
    videoRef,
    containerRef,
    enablePseudoFullscreen: true,
  });

  // Track if video is ready
  const [isVideoReady, setIsVideoReady] = useState(false);

  /**
   * Set correct video attributes based on platform
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // iOS-specific: playsInline is critical for inline playback
    // Without it, iOS will try to use native fullscreen player
    if (platformInfo.isIOS) {
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
    }

    // Android/Chrome: playsInline helps prevent unwanted fullscreen
    if (platformInfo.isAndroid) {
      video.setAttribute('playsinline', 'true');
    }

    // Prevent picture-in-picture (can interfere with fullscreen)
    video.setAttribute('disablePictureInPicture', 'true');
    
    // Prevent remote playback (Chromecast, etc.)
    if ('disableRemotePlayback' in video) {
      (video as any).disableRemotePlayback = true;
    }

    // Prevent right-click context menu (security)
    video.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Mark video as ready when metadata is loaded
    const handleLoadedMetadata = () => {
      setIsVideoReady(true);
      onLoadedData?.();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [platformInfo.isIOS, platformInfo.isAndroid, onLoadedData]);

  /**
   * Handle video play event
   */
  const handlePlay = () => {
    onPlay?.();
  };

  /**
   * Handle video ended event
   */
  const handleEnded = () => {
    onEnded?.();
  };

  /**
   * Default fullscreen button renderer
   */
  const defaultFullscreenButton = () => {
    if (!showFullscreenButton) return null;

    const isActive = isFullscreenActive();
    const buttonPosition = isActive || isPseudoFullscreen
      ? 'top-3 right-3'
      : 'top-3 left-3';

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFullscreen();
        }}
        className={`absolute ${buttonPosition} bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white p-2 rounded-full border border-white/30 transition-all duration-300 hover:scale-110 z-10 flex items-center gap-2`}
        title={isActive ? 'خروج از تمام صفحه' : 'تمام صفحه'}
        aria-label={isActive ? 'خروج از تمام صفحه' : 'تمام صفحه'}
      >
        {isActive ? (
          <>
            <X size={16} />
            <span className="text-xs hidden sm:inline">خروج</span>
          </>
        ) : (
          <>
            <Maximize2 size={16} />
            <span className="text-xs hidden sm:inline">تمام صفحه</span>
          </>
        )}
      </button>
    );
  };

  // Determine container classes based on fullscreen state
  const containerClasses = `
    relative
    bg-gradient-to-br from-gray-900 to-gray-800
    rounded-2xl
    overflow-hidden
    shadow-lg
    ${isPseudoFullscreen ? 'fixed inset-0 z-[99999] bg-black rounded-none' : ''}
    ${containerClassName}
  `.trim().replace(/\s+/g, ' ');

  // Determine video container classes
  const videoContainerClasses = `
    aspect-video
    relative
    flex
    items-center
    justify-center
    ${isPseudoFullscreen ? 'w-[100vw] h-[100vh] max-w-[100vw] max-h-[100vh]' : ''}
  `.trim().replace(/\s+/g, ' ');

  // Determine video element classes
  const videoClasses = `
    w-full
    h-full
    object-contain
    bg-black
    ${isPseudoFullscreen ? 'w-[100vw] h-[100vh] max-w-[100vw] max-h-[100vh]' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{
        // Ensure proper z-index in fullscreen
        zIndex: isPseudoFullscreen ? 99999 : undefined,
      }}
    >
      <div className={videoContainerClasses}>
        <video
          ref={videoRef}
          className={videoClasses}
          controls
          controlsList="nodownload"
          poster={poster}
          playsInline
          preload="metadata"
          onPlay={handlePlay}
          onEnded={handleEnded}
          style={{
            // Ensure video fills container properly
            maxWidth: '100%',
            maxHeight: '100%',
            // Prevent unwanted scaling on mobile
            objectFit: 'contain',
            // Handle safe-area insets on iOS
            paddingTop: isPseudoFullscreen && platformInfo.isIOS
              ? 'env(safe-area-inset-top)'
              : undefined,
            paddingBottom: isPseudoFullscreen && platformInfo.isIOS
              ? 'env(safe-area-inset-bottom)'
              : undefined,
            paddingLeft: isPseudoFullscreen && platformInfo.isIOS
              ? 'env(safe-area-inset-left)'
              : undefined,
            paddingRight: isPseudoFullscreen && platformInfo.isIOS
              ? 'env(safe-area-inset-right)'
              : undefined,
          }}
          {...videoProps}
        >
          <source src={src} type="video/mp4" />
          مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
        </video>

        {/* Title overlay */}
        {title && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/20 z-10">
            {title}
          </div>
        )}

        {/* Fullscreen button */}
        {renderFullscreenButton
          ? renderFullscreenButton({
              isFullscreen: isFullscreenActive(),
              toggleFullscreen,
            })
          : defaultFullscreenButton()}
      </div>
    </div>
  );
};

export default VideoPlayer;

