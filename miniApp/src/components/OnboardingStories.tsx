import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const storyVideos = [
  '/1.mp4',
  '/2.mp4',
  '/3.mp4',
  '/4.mp4',
  '/5.mp4'
];

interface OnboardingStoriesProps {
  onClose: () => void;
}

const OnboardingStories: React.FC<OnboardingStoriesProps> = ({ onClose }) => {
  const [currentStory, setCurrentStory] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle video progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration && !isNaN(video.duration)) {
        const percent = (video.currentTime / video.duration) * 100;
        setProgress(Math.min(percent, 100));
      }
    };

    const handleEnded = () => {
      if (currentStory < storyVideos.length - 1) {
        setProgress(100);
        setTimeout(() => {
          setCurrentStory(currentStory + 1);
          setProgress(0);
        }, 200);
      } else {
        onClose();
      }
    };


    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentStory, onClose]);

  // Ensure video plays with loading state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    console.log(`Loading story ${currentStory + 1}/${storyVideos.length}: ${storyVideos[currentStory]}`);
    setProgress(0);
    
    // Show loading if video not ready
    if (video.readyState < 2) {
      setIsLoading(true);
      console.log(`Showing loading for story ${currentStory + 1}`);
    }
    
    // Try to play as soon as possible
    const attemptPlay = () => {
      console.log(`Attempting to play story ${currentStory + 1}`);
      setIsLoading(false);
      video.play()
        .then(() => console.log(`Successfully playing story ${currentStory + 1}`))
        .catch((error) => {
          console.log(`Autoplay failed for story ${currentStory + 1}:`, error);
          // If autoplay fails, try again on user interaction
          const playOnClick = () => {
            console.log('Playing on user click');
            video.play();
            document.removeEventListener('click', playOnClick);
          };
          document.addEventListener('click', playOnClick);
        });
    };
    
    // Try immediately if loaded, otherwise wait
    if (video.readyState >= 2) {
      console.log(`Video ${currentStory + 1} already loaded, playing now`);
      attemptPlay();
    } else {
      console.log(`Waiting for video ${currentStory + 1} to load...`);
      video.addEventListener('canplay', attemptPlay, { once: true });
    }
    
    // Safety timeout - hide loading after 10 seconds max
    const safetyTimeout = setTimeout(() => {
      console.log(`Safety timeout: hiding loading for story ${currentStory + 1}`);
      setIsLoading(false);
    }, 10000);
    
    return () => {
      clearTimeout(safetyTimeout);
      video.removeEventListener('canplay', attemptPlay);
    };
  }, [currentStory]);

  const handleNext = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    
    if (currentStory < storyVideos.length - 1) {
      setProgress(0);
      setCurrentStory(currentStory + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    
    if (currentStory > 0) {
      setProgress(0);
      setCurrentStory(currentStory - 1);
    }
  };

  const handleTouchStart = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
  };

  const handleTouchEnd = () => {
    const video = videoRef.current;
    if (video) {
      video.play();
    }
  };


  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">
      {/* Story Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative w-full h-full max-w-[500px]">
          
          {/* Video */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain"
            playsInline
            autoPlay
            muted
            preload="auto"
            key={currentStory}
          >
            <source src={storyVideos[currentStory]} type="video/mp4" />
          </video>

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          )}

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />

          {/* UI Overlay */}
          <div className="absolute inset-0 flex flex-col">
            
            {/* Progress Bars */}
            <div className="flex gap-1.5 px-3 pt-3 pb-2 z-30">
              {storyVideos.map((_, index) => (
                <div key={index} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full shadow-sm transition-all duration-100 ease-linear"
                    style={{
                      width: index < currentStory ? '100%' : index === currentStory ? `${progress}%` : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 left-3 z-50 p-2.5 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 transition-all active:scale-90"
            >
              <X size={18} className="text-white" strokeWidth={2.5} />
            </button>

            {/* Navigation Zones */}
            <div className="absolute inset-0 flex z-20">
              <div 
                className="flex-1"
                onClick={handlePrevious}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              />
              <div 
                className="flex-1"
                onClick={handleNext}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom Button */}
            <div className="relative z-30 px-5 pb-16">
              <button
                onClick={currentStory === storyVideos.length - 1 ? onClose : handleNext}
                className="w-full px-8 py-4 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/10"
              >
                {currentStory === storyVideos.length - 1 ? 'شروع کن 🚀' : 'بعدی'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnboardingStories;
