import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { /* Clock, */ CheckCircle2, ArrowLeft, Maximize2, Minimize2, Lock, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CourseSubscriptionCard from '../components/CourseSubscriptionCard';

type Session = {
  id: string;
  title: string;
  duration: string;
  src: string;
};

type Course = {
  id: string;
  title: string;
  description: string;
  sessions: Session[];
};

const COURSES: Record<string, Course> = {
  'real-dollar-income': {
    id: 'real-dollar-income',
    title: 'دوره درآمد دلاری واقعی',
    description: 'مسیر عملی درآمد ارزی با نمونه سناریو',
    sessions: [
      { id: 's1', title: 'قسمت اول', duration: '00:00', src: 'https://dl.sianmarketing.com/dollardore/dollar1.mp4' },
      { id: 's2', title: 'قسمت دوم', duration: '00:00', src: 'https://dl.sianmarketing.com/dollardore/dollar2.mp4' },
      { id: 's3', title: 'قسمت سوم', duration: '00:00', src: 'https://dl.sianmarketing.com/dollardore/dollar3.mp4' },
      { id: 's4', title: 'قسمت چهارم', duration: '00:00', src: 'https://dl.sianmarketing.com/dollardore/dollar4.mp4' },
      { id: 's5', title: 'قسمت پنجم', duration: '00:00', src: 'https://dl.sianmarketing.com/dollardore/dollar5.mp4' },
      { id: 's6', title: 'قسمت ششم', duration: '00:00', src: 'https://dl.sianmarketing.com/dollardore/dollar6.mp4' },
      { id: 's7', title: 'قسمت هفتم', duration: '00:00', src: 'https://dl.sianmarketing.com/dollardore/dollar7.mp4' },
      { id: 's8', title: 'قسمت هشتم', duration: '00:00', src: 'https://dl.sianmarketing.com/dollardore/dollar8.mp4' },
      { id: 's9', title: 'قسمت نهم', duration: '00:00', src: 'https://dl.sianmarketing.com/dollardore/dollar9.mp4' },
      { id: 's10', title: 'قسمت دهم', duration: '00:00', src: 'https://dl.sianmarketing.com/dollardore/dollar10.mp4' },
    ]
  },
  'no-code-web-design': {
    id: 'no-code-web-design',
    title: 'دوره طراحی سایت بدون کدنویسی',
    description: 'ساخت وب‌سایت مدرن با ابزارهای No-Code',
    sessions: [
      { id: 's1', title: 'قسمت اول', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site1.mp4' },
      { id: 's2', title: 'قسمت دوم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site2.mp4' },
      { id: 's3', title: 'قسمت سوم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site3as1.mp4' },
      { id: 's4', title: 'قسمت چهارم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site3as2.mp4' },
      { id: 's5', title: 'قسمت پنجم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site4.mp4' },
      { id: 's6', title: 'قسمت ششم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site5.mp4' },
      { id: 's7', title: 'قسمت هفتم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site6.mp4' },
      { id: 's8', title: 'قسمت هشتم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site7.mp4' },
      { id: 's9', title: 'قسمت نهم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site8.mp4' },
      { id: 's10', title: 'قسمت دهم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site9.mp4' },
      { id: 's11', title: 'قسمت یازدهم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site10.mp4' },
      { id: 's12', title: 'قسمت دوازدهم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site11.mp4' },
      { id: 's13', title: 'قسمت سیزدهم', duration: '00:00', src: 'https://dl.sianmarketing.com/saitedore/Site12.mp4' },
    ]
  }
};

const CoursePlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { userData, addPoints } = useApp();
  const course = courseId ? COURSES[courseId] : undefined;
  const [current, setCurrent] = React.useState<Session | null>(course ? course.sessions[0] : null);
  
  // Load completed sessions from localStorage
  const [completed, setCompleted] = React.useState<Record<string, boolean>>(() => {
    if (courseId) {
      const saved = localStorage.getItem(`course-completed-${courseId}`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  // Track sessions that have already given points to prevent duplicate rewards
  const [pointsGiven, setPointsGiven] = React.useState<Record<string, boolean>>(() => {
    if (courseId) {
      const saved = localStorage.getItem(`course-points-given-${courseId}`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [showSubscriptionCard, setShowSubscriptionCard] = React.useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = React.useState(false);
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [confetti, setConfetti] = React.useState(false);

  // Celebration function
  const triggerCelebration = () => {
    setConfetti(true);
    setShowCelebration(true);
    
    // Add 20 points to user's total
    addPoints(20);
    
    // Hide confetti after 3 seconds
    setTimeout(() => {
      setConfetti(false);
    }, 3000);
    
    // Hide celebration popup after 4 seconds
    setTimeout(() => {
      setShowCelebration(false);
    }, 4000);
  };

  // Check if user can access session
  const canAccessSession = (sessionIndex: number) => {
    // If user has paid subscription, they can access all sessions
    if (userData.subscriptionType === 'paid') {
      return true;
    }
    
    // If user has free trial, they can only access first session (index 0)
    if (userData.subscriptionType === 'free_trial') {
      return sessionIndex === 0;
    }
    
    // Legacy users (verified but no subscription type set) - limit to first session too
    if (userData.subscriptionType === 'none' || !userData.subscriptionType) {
      return sessionIndex === 0; // Legacy users also limited to first session
    }
    
    // If user has no subscription, they can't access any sessions
    return false;
  };

  // Save completed sessions to localStorage whenever it changes
  React.useEffect(() => {
    if (courseId) {
      localStorage.setItem(`course-completed-${courseId}`, JSON.stringify(completed));
    }
  }, [completed, courseId]);

  // Save points given to localStorage whenever it changes
  React.useEffect(() => {
    if (courseId) {
      localStorage.setItem(`course-points-given-${courseId}`, JSON.stringify(pointsGiven));
    }
  }, [pointsGiven, courseId]);

  React.useEffect(() => {
    if (course && (!current || !course.sessions.find(s => s.id === current.id))) {
      // Always set first session for display (limitation checked when accessing content)
      setCurrent(course.sessions[0]);
    }
  }, [courseId]);

  const toggleFullscreen = async () => {
    const el = videoRef.current;
    if (!el) return;

    const anyDoc: any = document as any;
    const active = !!document.fullscreenElement || 
                   !!anyDoc.webkitFullscreenElement || 
                   !!anyDoc.mozFullScreenElement || 
                   !!anyDoc.msFullscreenElement ||
                   pseudoFullscreen;
    
    if (!active) {
      // Try all fullscreen methods for maximum compatibility
      const anyVideo: any = el as any;
      
      // Method 1: Standard Fullscreen API
      if (el.requestFullscreen) {
        try {
          await el.requestFullscreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          console.debug('requestFullscreen failed:', err);
        }
      }
      
      // Method 2: WebKit (Safari, Chrome)
      if (anyVideo.webkitRequestFullscreen) {
        try {
          anyVideo.webkitRequestFullscreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          console.debug('webkitRequestFullscreen failed:', err);
        }
      }
      
      // Method 3: Mozilla (Firefox)
      if (anyVideo.mozRequestFullScreen) {
        try {
          anyVideo.mozRequestFullScreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          console.debug('mozRequestFullScreen failed:', err);
        }
      }
      
      // Method 4: MS (IE/Edge)
      if (anyVideo.msRequestFullscreen) {
        try {
          anyVideo.msRequestFullscreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          console.debug('msRequestFullscreen failed:', err);
        }
      }
      
      // Method 5: iOS Safari native fullscreen
      if (anyVideo.webkitEnterFullscreen) {
        try {
          anyVideo.webkitEnterFullscreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          console.debug('webkitEnterFullscreen failed:', err);
        }
      }
      
      // Method 6: Fallback to pseudo-fullscreen (works on all devices)
      setPseudoFullscreen(true);
      setIsFullscreen(true);
    } else {
      // Exit fullscreen - try all methods
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
          console.debug('exitFullscreen failed:', err);
        }
      }
      
      setIsFullscreen(false);
      setPseudoFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  React.useEffect(() => {
    const anyDoc: any = document as any;
    
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        anyDoc.webkitFullscreenElement ||
        anyDoc.mozFullScreenElement ||
        anyDoc.msFullscreenElement
      );
      setIsFullscreen(isFullscreen);
      if (!isFullscreen) {
        setPseudoFullscreen(false);
      }
    };
    
    const handleWebkitEnd = () => {
      setIsFullscreen(false);
      setPseudoFullscreen(false);
    };
    
    // Add all fullscreen event listeners for maximum compatibility
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
  }, []);

  React.useEffect(() => {
    if (pseudoFullscreen) {
      // Prevent scrolling and ensure fullscreen overlay
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      // Prevent Telegram WebApp from interfering
      try {
        // @ts-ignore
        if (window?.Telegram?.WebApp) {
          // @ts-ignore
          window.Telegram.WebApp.disableVerticalSwipes();
        }
      } catch (_) {}
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      // Re-enable Telegram WebApp features
      try {
        // @ts-ignore
        if (window?.Telegram?.WebApp) {
          // @ts-ignore
          window.Telegram.WebApp.enableVerticalSwipes();
        }
      } catch (_) {}
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [pseudoFullscreen]);

  React.useEffect(() => {
    try {
      // @ts-ignore
      window?.Telegram?.WebApp?.expand?.();
    } catch (_) {}
  }, []);

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: '#0e0817' }}>
        دوره یافت نشد
      </div>
    );
  }

  return (
    <>
      <CourseSubscriptionCard show={showSubscriptionCard} onClose={() => setShowSubscriptionCard(false)} />
      
      {/* Professional Confetti Animation */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden">
          {[...Array(100)].map((_, i) => {
            const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
            const shapes = ['circle', 'square', 'triangle'];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 8 + 4; // 4-12px
            const startX = Math.random() * window.innerWidth;
            const startY = -20;
            const endY = window.innerHeight + 20;
            const drift = (Math.random() - 0.5) * 200; // Side drift
            const rotation = Math.random() * 720; // 0-720 degrees
            const duration = Math.random() * 2 + 2; // 2-4 seconds
            const delay = Math.random() * 1; // 0-1 second delay
            
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: startX,
                  top: startY,
                  width: size,
                  height: size,
                  backgroundColor: shape === 'circle' ? color : 'transparent',
                  borderRadius: shape === 'circle' ? '50%' : '0',
                  animation: `confettiFall ${duration}s ${delay}s ease-out forwards`,
                  '--end-y': `${endY}px`,
                  '--drift': `${drift}px`,
                  '--rotation': `${rotation}deg`
                } as React.CSSProperties}
              >
                {shape === 'square' && (
                  <div 
                    className="w-full h-full"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${Math.random() * 45}deg)`
                    }}
                  />
                )}
                {shape === 'triangle' && (
                  <div 
                    className="w-0 h-0"
                    style={{ 
                      borderLeft: `${size/2}px solid transparent`,
                      borderRight: `${size/2}px solid transparent`,
                      borderBottom: `${size}px solid ${color}`,
                      transform: `rotate(${Math.random() * 180}deg)`
                    }}
                  />
                )}
              </div>
            );
          })}
          <style>{`
            @keyframes confettiFall {
              to {
                transform: translateY(var(--end-y)) translateX(var(--drift)) rotate(var(--rotation));
                opacity: 0;
              }
            }
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes scaleIn {
              from {
                transform: scale(0.8);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
            .animate-fadeIn {
              animation: fadeIn 0.3s ease-out forwards;
            }
            .animate-scaleIn {
              animation: scaleIn 0.4s ease-out forwards;
            }
          `}</style>
        </div>
      )}
      
      {/* Professional Celebration Popup - Platform Style */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none animate-fadeIn">
          <div className="relative overflow-hidden backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-2xl max-w-sm mx-4 animate-scaleIn" style={{ backgroundColor: '#10091c' }}>
            {/* Animated Background Pattern */}
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-xl bg-emerald-500/20 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full blur-lg bg-yellow-400/15 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-2xl bg-purple-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            
            {/* Geometric Accent Lines */}
            <div className="absolute top-4 left-4 opacity-40">
              <div className="w-8 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-transparent"></div>
              <div className="w-6 h-0.5 rounded-full mt-1 bg-gradient-to-r from-yellow-400 to-transparent"></div>
            </div>
            
            {/* Bottom Right Dot Pattern */}
            <div className="absolute bottom-4 right-4 opacity-30">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                <div className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 p-8 text-center">
              {/* Icon Container */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
                <div className="text-2xl">🎉</div>
              </div>
              
              {/* Title */}
              <h3 className="text-white font-bold text-xl mb-2">عالی!</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                جلسه با موفقیت تکمیل شد
              </p>
              
              {/* Points Badge */}
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500/20 to-yellow-600/30 backdrop-blur-sm rounded-2xl px-4 py-3 border border-yellow-500/30">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-yellow-900 font-bold text-sm">+20</span>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-bold text-base">امتیاز دریافت شد</div>
                  <div className="text-yellow-300/80 text-xs">به کیف امتیاز اضافه شد</div>
                </div>
              </div>
              
              {/* Subtle accent line */}
              <div className="w-12 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-yellow-400 mx-auto mt-4"></div>
            </div>
          </div>
        </div>
      )}
      
      <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: '#0e0817' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#2c189a]/95 via-[#5a189a]/95 to-[#7222F2]/95 backdrop-blur-xl border-b border-gray-700/60 shadow-2xl">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-110 border border-white/30"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="text-right flex-1 mr-4">
            <h1 className="text-xl font-bold text-white mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{course.title}</h1>
            <p className="text-xs text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis">{course.description}</p>
          </div>
          <div className="w-12"></div>
        </div>
      </div>

      <div className={`pt-24 mx-auto p-4 space-y-6 ${isFullscreen ? 'max-w-6xl' : 'max-w-md'}`}>
        {/* Video Player Card */}
        <div className={`${pseudoFullscreen ? 'fixed inset-0 z-[99999] bg-black rounded-none' : ''} backdrop-blur-xl rounded-3xl border border-gray-700/60 shadow-lg overflow-hidden transition-all duration-300 ${isFullscreen || pseudoFullscreen ? 'shadow-2xl' : ''}`} style={{ backgroundColor: pseudoFullscreen ? '#000000' : '#10091c' }}>
          <div className={`relative flex items-center justify-center ${pseudoFullscreen ? 'w-[100vw] h-[100vh] max-w-[100vw] max-h-[100vh]' : ''}`}>
            {/* Check if user can access current session */}
            {current && canAccessSession(course.sessions.findIndex(s => s.id === current.id)) ? (
              <video
                ref={videoRef}
                key={current?.id}
                controls
                playsInline
                className={`w-full bg-black transition-all duration-300 ${(isFullscreen || pseudoFullscreen) ? 'h-[100vh] w-[100vw] object-contain' : 'h-52'}`}
                controlsList="nodownload"
                disablePictureInPicture
                // @ts-ignore - non-standard but supported in Chromium
                disableRemotePlayback
                onContextMenu={(e) => e.preventDefault()}
              >
                <source src={current?.src} type="video/mp4" />
              </video>
            ) : (
              <div className="w-full bg-black flex items-center justify-center text-white text-center p-8 h-52">
                <div>
                  <Lock size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-bold mb-2">این قسمت قفل است</p>
                  <p className="text-sm text-gray-400">برای مشاهده این قسمت، اشتراک پولی تهیه کنید.</p>
                </div>
              </div>
            )}
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/20">
              {current?.title}
            </div>
            {/* <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/20 flex items-center gap-1">
              <Clock size={12} />
              {current?.duration}
            </div> */}
            <button
              onClick={toggleFullscreen}
              className={`absolute ${pseudoFullscreen ? 'top-3 right-3' : 'top-3 left-3'} bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white p-2 rounded-full border border-white/30 transition-all duration-300 hover:scale-110 z-10`}
              title={(isFullscreen || pseudoFullscreen) ? 'خروج از تمام صفحه' : 'تمام صفحه'}
            >
              {(isFullscreen || pseudoFullscreen) ? <X size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Progress Section */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">پیشرفت دوره</h3>
            <div className="text-sm text-gray-300">
              {Object.values(completed).filter(Boolean).length} از {course.sessions.length}
            </div>
          </div>
          <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#8A00FF] to-[#C738FF] transition-all duration-1000 rounded-full"
              style={{ width: `${(Object.values(completed).filter(Boolean).length / course.sessions.length) * 100}%` }}
            ></div>
          </div>
          <div className="text-center mt-3">
            <span className="text-sm text-gray-300">
              {Math.round((Object.values(completed).filter(Boolean).length / course.sessions.length) * 100)}% تکمیل شده
            </span>
          </div>
        </div>

        {/* Sessions List */}
        <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">جلسات دوره</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#8A00FF] to-[#C738FF]"></div>
              <span className="text-xs text-gray-300">{course.sessions.length} جلسه</span>
            </div>
          </div>
          
          <div className="space-y-3">
          {course.sessions.map((s, idx) => {
            const isActive = current?.id === s.id;
            const isDone = completed[s.id];
            const canAccess = canAccessSession(idx);
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (canAccess) {
                    setCurrent(s);
                  } else {
                    setShowSubscriptionCard(true);
                  }
                }}
                  className={`w-full p-4 rounded-2xl border transition-all duration-300 ${
                    canAccess ? 'hover:scale-[1.01] active:scale-[0.99] cursor-pointer' : 'opacity-50 cursor-pointer'
                  } ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#8A00FF]/20 to-[#C738FF]/20 border-[#8A00FF]/50 shadow-[0_0_20px_rgba(139,0,255,0.2)]' 
                      : canAccess
                        ? 'bg-gray-800/40 border-gray-700/60 hover:border-gray-600/60'
                        : 'bg-gray-800/20 border-gray-700/30'
                  }`}
              >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-br from-[#8A00FF] to-[#C738FF] shadow-lg' 
                        : isDone 
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                          : !canAccess
                            ? 'bg-gray-600/40'
                            : 'bg-gray-700/60'
                    }`}>
                      {!canAccess ? (
                        <Lock size={20} className="text-gray-400" />
                      ) : isDone ? (
                        <CheckCircle2 size={20} className="text-white" />
                      ) : (
                        <span className="text-white font-bold text-sm">{idx + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 text-right">
                      <div className={`text-base font-bold mb-1 ${isActive ? 'text-white' : 'text-gray-200'}`}>
                        {s.title}
                  </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {/* <Clock size={14} />
                        <span>{s.duration}</span> */}
                        {!canAccess && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                            🔒 نیاز به اشتراک پولی
                          </span>
                        )}
                        {isActive && canAccess && (
                          <span className="px-2 py-1 bg-[#8A00FF]/20 text-[#8A00FF] rounded-full text-xs font-medium">
                            در حال پخش
                          </span>
                        )}
                  </div>
                </div>
                    
                <label
                  onClick={(e) => {
                    e.stopPropagation();
                    const wasCompleted = completed[s.id];
                    const newCompleted = !wasCompleted;
                    
                    setCompleted(prev => ({ ...prev, [s.id]: newCompleted }));
                    
                    // Trigger celebration only when marking as completed (not when unchecking)
                    // AND only if points haven't been given for this session yet
                    if (newCompleted && !wasCompleted && !pointsGiven[s.id]) {
                      // Mark that points have been given for this session
                      setPointsGiven(prev => ({ ...prev, [s.id]: true }));
                      triggerCelebration();
                    }
                  }}
                      className={`cursor-pointer w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                    isDone
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-transparent border-gray-600 hover:border-emerald-400/60'
                  }`}
                >
                  {isDone && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </label>
                  </div>
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default CoursePlayer;


