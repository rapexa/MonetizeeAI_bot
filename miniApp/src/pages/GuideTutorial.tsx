import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

const GuideTutorial: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const percent = (video.currentTime / video.duration) * 100;
      setProgress(percent);
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('canplay', () => setIsLoading(false));

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0e0817] via-[#1a0f2e] to-[#0e0817] flex items-center justify-center p-4">
      
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="fixed top-4 left-4 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 group"
      >
        <X size={20} className="text-white group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Main Container */}
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-2 rounded-full border border-purple-500/30 mb-4">
            <span className="text-2xl">📚</span>
            <span className="text-white/90 text-sm font-medium">راهنمای کامل پلتفرم</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            آموزش استفاده از MonetizeAI
          </h1>
          <p className="text-white/60 text-sm md:text-base">
            در این ویدیو با تمام قابلیت‌های پلتفرم آشنا می‌شوید
          </p>
        </div>

        {/* Video Container */}
        <div 
          className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-purple-500/30"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          
          {/* Video */}
          <video
            ref={videoRef}
            className="w-full aspect-video"
            onClick={togglePlay}
            preload="auto"
            autoPlay
            playsInline
          >
            <source src="/rahnama.mp4" type="video/mp4" />
          </video>

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}

          {/* Play Button Overlay (when paused) */}
          {!isPlaying && !isLoading && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition-opacity"
              onClick={togglePlay}
            >
              <div className="bg-purple-600 hover:bg-purple-700 rounded-full p-6 transition-all transform hover:scale-110">
                <Play size={48} className="text-white ml-1" fill="white" />
              </div>
            </div>
          )}

          {/* Controls */}
          <div 
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Progress Bar */}
            <div 
              className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group"
              onClick={handleProgressClick}
            >
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all relative group-hover:h-2"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              
              {/* Left Controls */}
              <div className="flex items-center gap-3">
                
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all"
                >
                  {isPlaying ? (
                    <Pause size={24} className="text-white" />
                  ) : (
                    <Play size={24} className="text-white" fill="white" />
                  )}
                </button>

                {/* Mute/Unmute */}
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all"
                >
                  {isMuted ? (
                    <VolumeX size={24} className="text-white" />
                  ) : (
                    <Volume2 size={24} className="text-white" />
                  )}
                </button>

                {/* Time */}
                <span className="text-white text-sm font-medium">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                
                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all"
                >
                  {isFullscreen ? (
                    <Minimize size={24} className="text-white" />
                  ) : (
                    <Maximize size={24} className="text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="mt-6 text-center">
          <p className="text-white/50 text-sm">
            بعد از تماشای ویدیو، می‌توانید از تمام امکانات پلتفرم استفاده کنید
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuideTutorial;
