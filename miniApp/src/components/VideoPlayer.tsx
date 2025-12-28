/**
 * VideoPlayer Component - Simple and Reliable
 * 
 * Production-ready video player for Telegram Mini Apps
 * Simple approach that works everywhere
 */

import React, { useRef, useEffect } from 'react';
import { Maximize2, X } from 'lucide-react';
import { useFullscreen } from '../hooks/useFullscreen';
import { getPlatformInfo } from '../utils/platformDetection';

export interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  className?: string;
  containerClassName?: string;
  showFullscreenButton?: boolean;
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
  onPlay?: () => void;
  onEnded?: () => void;
  onLoadedData?: () => void;
  renderFullscreenButton?: (props: {
    isFullscreen: boolean;
    toggleFullscreen: () => Promise<void>;
  }) => React.ReactNode;
}

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
  
  const {
    isPseudoFullscreen,
    toggleFullscreen,
    isFullscreenActive,
  } = useFullscreen({
    videoRef,
    containerRef,
    enablePseudoFullscreen: true,
  });

  /**
   * Set video attributes
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (platformInfo.isIOS) {
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
    }

    if (platformInfo.isAndroid) {
      video.setAttribute('playsinline', 'true');
    }

    video.setAttribute('disablePictureInPicture', 'true');
    
    if ('disableRemotePlayback' in video) {
      (video as any).disableRemotePlayback = true;
    }

    video.addEventListener('contextmenu', (e) => e.preventDefault());

    const handleLoadedMetadata = () => {
      onLoadedData?.();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [platformInfo.isIOS, platformInfo.isAndroid, onLoadedData]);

  const handlePlay = () => {
    onPlay?.();
  };

  const handleEnded = () => {
    onEnded?.();
  };

  /**
   * Default fullscreen button
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
          e.preventDefault();
          toggleFullscreen();
        }}
        className={`absolute ${buttonPosition} bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white p-2 rounded-full border border-white/30 transition-all duration-300 hover:scale-110 flex items-center gap-2`}
        style={{
          zIndex: 99999,
        }}
        title={isActive ? 'خروج از تمام صفحه' : 'تمام صفحه'}
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

  return (
    <div
      ref={containerRef}
      className={`relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-lg ${isPseudoFullscreen ? 'fixed inset-0 z-[99999] bg-black rounded-none' : ''} ${containerClassName}`}
      style={isPseudoFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 99999,
        backgroundColor: '#000',
        margin: 0,
        padding: 0,
        borderRadius: 0,
      } : {}}
    >
      <div 
        className={`aspect-video relative flex items-center justify-center ${isPseudoFullscreen ? 'w-[100vw] h-[100vh]' : ''}`}
        style={isPseudoFullscreen ? {
          width: '100vw',
          height: '100dvh',
        } : {}}
      >
        <video
          ref={videoRef}
          className={`w-full h-full object-contain bg-black ${className}`}
          controls
          controlsList="nodownload nofullscreen"
          poster={poster}
          playsInline
          preload="metadata"
          onPlay={handlePlay}
          onEnded={handleEnded}
          style={isPseudoFullscreen ? {
            width: '100vw',
            height: '100dvh',
            maxWidth: '100vw',
            maxHeight: '100dvh',
            objectFit: 'contain',
          } : {
            objectFit: 'contain',
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
