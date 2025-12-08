// @ts-nocheck - Some unused imports are kept for future use
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import apiService from '../services/api';
import ChatModal from '../components/ChatModal';
// SubscriptionModal removed per request
import NextLevelPaywall from '../components/NextLevelPaywall';
import AIMessage from '../components/AIMessage';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { logger } from '../utils/logger';
import { 
  Trophy, 
  Star, 
  Lock, 
  Play, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Target, 
  Lightbulb,
  Rocket,
  Palette,
  Globe,
  Users,
  BarChart3,
  Cog,
  TrendingUp,
  X,

  Video,
  ArrowRight,
  Sparkles,
  Brain,
  ClipboardCheck,
  ChevronLeft,
  Award,
  Maximize2,
  Crown
} from 'lucide-react';

interface Video {
  title: string;
  duration: string;
  url: string;
}

interface Stage {
  id: number;
  title: string;
  description: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  exercise: string;
  checklist: string[];
  videos?: Video[];
  // Legacy support for single video
  videoTitle?: string;
  videoDuration?: string;
  videoUrl?: string;
  prompts?: string[];
}

interface Level {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  goal: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  stages: Stage[];
  isUnlocked: boolean;
  progress: number; // 0-100
}

const Levels: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, isAPIConnected, refreshUserData: refreshUserDataFromContext } = useApp();
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'stage-detail'>('list');
  const videoRefs = React.useRef<{[key: number]: HTMLVideoElement | null}>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pseudoFullscreenIdx, setPseudoFullscreenIdx] = useState<number | null>(null);
  
  // Free trial countdown timer - محاسبه بر اساس subscriptionExpiry واقعی
  const [freeTrialTimeLeft, setFreeTrialTimeLeft] = useState(0);

  // محاسبه زمان باقیمانده بر اساس subscriptionExpiry
  useEffect(() => {
    if (userData.subscriptionType === 'free_trial' && userData.subscriptionExpiry) {
      const calculateTimeLeft = () => {
        const expiryDate = new Date(userData.subscriptionExpiry!);
        const now = new Date();
        const diffInSeconds = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000));
        return diffInSeconds;
      };

      // تنظیم اولیه
      setFreeTrialTimeLeft(calculateTimeLeft());

      // آپدیت هر ثانیه
      const interval = setInterval(() => {
        setFreeTrialTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [userData.subscriptionType, userData.subscriptionExpiry]);

  const toggleFullscreen = async (videoIndex: number) => {
    const el = videoRefs.current[videoIndex];
    if (!el) return;

    const active = !!document.fullscreenElement || 
                   !!(document as any).webkitFullscreenElement || 
                   !!(document as any).mozFullScreenElement || 
                   !!(document as any).msFullscreenElement ||
                   pseudoFullscreenIdx !== null;
    
    if (!active) {
      // Try all fullscreen methods for maximum compatibility
      const anyVideo: any = el as any;
      const anyDoc: any = document as any;
      
      // Method 1: Standard Fullscreen API
      if (el.requestFullscreen) {
        try {
          await el.requestFullscreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          logger.debug('requestFullscreen failed:', err);
        }
      }
      
      // Method 2: WebKit (Safari, Chrome)
      if (anyVideo.webkitRequestFullscreen) {
        try {
          anyVideo.webkitRequestFullscreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          logger.debug('webkitRequestFullscreen failed:', err);
        }
      }
      
      // Method 3: Mozilla (Firefox)
      if (anyVideo.mozRequestFullScreen) {
        try {
          anyVideo.mozRequestFullScreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          logger.debug('mozRequestFullScreen failed:', err);
        }
      }
      
      // Method 4: MS (IE/Edge)
      if (anyVideo.msRequestFullscreen) {
        try {
          anyVideo.msRequestFullscreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          logger.debug('msRequestFullscreen failed:', err);
        }
      }
      
      // Method 5: iOS Safari native fullscreen
      if (anyVideo.webkitEnterFullscreen) {
        try {
          anyVideo.webkitEnterFullscreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          logger.debug('webkitEnterFullscreen failed:', err);
        }
      }
      
      // Method 6: Fallback to pseudo-fullscreen (works on all devices)
      setPseudoFullscreenIdx(videoIndex);
      setIsFullscreen(true);
    } else {
      // Exit fullscreen - try all methods
      const anyDoc: any = document as any;
      
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
          logger.debug('exitFullscreen failed:', err);
        }
      }
      
      setIsFullscreen(false);
      setPseudoFullscreenIdx(null);
    }
  };

  // Listen for fullscreen changes and manage pseudo state/body overflow
  useEffect(() => {
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
        setPseudoFullscreenIdx(null);
      }
    };
    
    const handleWebkitEnd = () => {
      setIsFullscreen(false);
      setPseudoFullscreenIdx(null);
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

  useEffect(() => {
    if (pseudoFullscreenIdx !== null) {
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
  }, [pseudoFullscreenIdx]);

  useEffect(() => {
    try {
      // @ts-ignore
      window?.Telegram?.WebApp?.expand?.();
    } catch (_) {}
  }, []);

  // Chat and edit mode states
  const [chatMessage, setChatMessage] = useState<string>('');
  const [isEditingPrompt, setIsEditingPrompt] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: number, text: string, sender: 'user' | 'ai', timestamp: string, isNew?: boolean}>>([]);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isNextLevelPopupOpen, setIsNextLevelPopupOpen] = useState(false);
  const [showSubscriptionCard, setShowSubscriptionCard] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { messagesEndRef, scrollToBottom } = useAutoScroll([chatMessages]);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Check if user is at bottom of chat
  const checkScrollPosition = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10; // 10px tolerance
      setShowScrollButton(!isAtBottom && chatMessages.length > 0);
    }
  };


  // Format time for display
  const formatTrialTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return { days, hours, minutes, seconds: secs };
  };

  // Debug modal state changes (removed in production)
  // useEffect(() => {
  //   logger.debug('🔥 Modal state changed to:', isChatModalOpen);
  // }, [isChatModalOpen]);

  // Debug subscription card state changes (removed in production)
  // useEffect(() => {
  //   logger.debug('🎴 [Levels] showSubscriptionCard state changed to:', showSubscriptionCard);
  // }, [showSubscriptionCard]);

  // Confetti utility (no external deps)
  const confettiRef = React.useRef<HTMLDivElement | null>(null);
  const launchConfetti = useCallback(() => {
    const container = confettiRef.current;
    if (!container) return;
    const colors = ['#10b981','#22c55e','#60a5fa','#a78bfa','#f59e0b','#ef4444'];
    const count = 80;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.style.position = 'absolute';
      el.style.top = '-10px';
      el.style.left = Math.random() * 100 + '%';
      el.style.width = '6px';
      el.style.height = '10px';
      el.style.background = colors[i % colors.length];
      el.style.opacity = '0.9';
      el.style.transform = `rotate(${Math.random()*360}deg)`;
      const duration = 1200 + Math.random()*1200;
      el.animate([
        { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
        { transform: `translateY(120vh) rotate(${Math.random()*720}deg)`, opacity: 0.7 }
      ], { duration, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      container.appendChild(el);
      setTimeout(() => { try { container.removeChild(el); } catch {} }, duration + 100);
    }
  }, []);

  // When quiz passed, grant reward once and launch confetti (declared after points state below)

  const goToNextStage = async () => {
    const currentId = selectedStage?.id || 1;
    const nextId = currentId + 1;
    
    logger.debug('🔍 goToNextStage called:', {
      currentId,
      nextId,
      userCurrentSession: userData.currentSession,
      subscriptionType: userData.subscriptionType
    });
    
    // Close quiz modal immediately for better UX
    setShowQuiz(false);
    
    // Free trial guard: block moving beyond Level 1 (stage 5)
    if (
      (userData.subscriptionType === 'free_trial' || !userData.subscriptionType || userData.subscriptionType === 'none') &&
      nextId > 5
    ) {
      logger.debug('⛔ Free trial - blocking navigation to stage', nextId, 'from quiz modal');
      setIsNextLevelPopupOpen(true);
      return;
    }
    
    // First, refresh user data to ensure we have the latest currentSession from backend
    // This is important because the backend has already updated CurrentSession++
    if (isAPIConnected) {
      logger.debug('🔄 Refreshing user data before navigation...');
      await refreshUserDataFromContext();
      // Wait for React state to update (refreshUserData updates context state)
      // The useEffect watching userData.currentSession will automatically regenerate levels
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // find next stage - levels should already be updated by useEffect
    let nextLevel: Level | null = null;
    let nextStage: Stage | null = null;
    
    // Search in current levels
    for (const lvl of levels) {
      const st = lvl.stages.find(s => s.id === nextId);
      if (st) { 
        nextLevel = lvl; 
        nextStage = st; 
        break; 
      }
    }
    
    // If still not found, force regenerate as last resort
    if (!nextLevel || !nextStage) {
      logger.warn('⚠️ Next stage not found in current levels, force regenerating...', {
        nextId,
        currentSession: userData.currentSession,
        levelsCount: levels.length
      });
      
      // Force regenerate with explicit wait
      await new Promise(resolve => setTimeout(resolve, 500));
      const freshLevels = generateLevels();
      setLevels(freshLevels);
      
      for (const lvl of freshLevels) {
        const st = lvl.stages.find(s => s.id === nextId);
        if (st) { nextLevel = lvl; nextStage = st; break; }
      }
    }
    
    if (nextLevel && nextStage) {
      const stageStatus = getStageStatus(nextStage.id);
      
      logger.debug('✅ Found next stage:', {
        nextStageId: nextStage.id,
        nextStageTitle: nextStage.title,
        nextLevelTitle: nextLevel.title,
        nextStageStatus: stageStatus,
        nextStageObjectStatus: nextStage.status,
        currentSession: userData.currentSession,
        completedStages: (userData.currentSession || 1) - 1
      });
      
      // Verify that the stage is actually available
      if (stageStatus === 'locked') {
        logger.error('⚠️ Next stage is still locked after quiz pass!', {
          nextStageId: nextStage.id,
          currentSession: userData.currentSession,
          expectedCurrentSession: nextStage.id,
          completedStages: (userData.currentSession || 1) - 1
        });
        
        // Try one more time with forced refresh
        logger.debug('🔄 Forcing one more refresh...');
        if (isAPIConnected) {
          await refreshUserDataFromContext();
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          logger.debug('🔄 After forced refresh:', {
            currentSession: userData.currentSession,
            completedStages: (userData.currentSession || 1) - 1
          });
          
          const finalLevels = generateLevels();
          setLevels(finalLevels);
          
          // Find stage again
          for (const lvl of finalLevels) {
            const st = lvl.stages.find(s => s.id === nextId);
            if (st) { 
              nextLevel = lvl; 
              nextStage = st;
              logger.debug('🔄 Found stage after forced refresh:', {
                stageId: st.id,
                status: st.status,
                recalculatedStatus: getStageStatus(st.id)
              });
              break; 
            }
          }
        }
      }
      
      logger.debug('🚀 Setting selected stage and navigating:', {
        stageId: nextStage.id,
        stageTitle: nextStage.title,
        stageStatus: nextStage.status,
        hasVideos: !!nextStage.videos,
        videosCount: nextStage.videos?.length || 0,
        videoUrl: nextStage.videoUrl
      });
      
      // Close quiz modal FIRST
      setShowQuiz(false);
      
      // Reset quiz states for next stage BEFORE updating selected stage
      setCurrentQuestion(0);
      setUserAnswers({});
      setQuizCompleted(false);
      setQuizResult(null);
      setRewardGranted(false);
      
      // Use setTimeout to ensure modal is closed before navigation
      setTimeout(() => {
        // CRITICAL: Reset all video-related states
        videoRefs.current = {};
        setPseudoFullscreenIdx(null);
        setIsFullscreen(false);
        
        // Update selected level and stage
        setSelectedLevel(nextLevel);
        setSelectedStage(nextStage);
        
        // IMPORTANT: Stay in stage-detail view
        setViewMode('stage-detail');
        
        // Scroll to top after a small delay to ensure DOM is updated
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          logger.debug('📜 Scrolled to top');
        }, 100);
        
        logger.debug('✅ Successfully navigated to next stage:', {
          stageId: nextStage.id,
          stageTitle: nextStage.title,
          videos: nextStage.videos,
          videoUrl: nextStage.videoUrl
        });
      }, 100);
    } else {
      logger.error('❌ Next stage not found after all attempts!', {
        nextId,
        currentSession: userData.currentSession
      });
      
      // IMPORTANT: Don't go back to list, just close the quiz modal
      // User stays on current stage detail view
      setShowQuiz(false);
      
      logger.debug('ℹ️ Staying on current stage detail view');
    }
  };

  // Debug userData changes
  useEffect(() => {
    logger.debug('👤 [Levels] userData changed:', {
      subscriptionType: userData?.subscriptionType,
      planName: userData?.planName,
      currentSession: userData?.currentSession,
      isVerified: userData?.isVerified,
      fullUserData: userData
    });
  }, [userData]);

  // Debug: Log localStorage contents
  useEffect(() => {
    try {
      const saved = localStorage.getItem('monetize-quiz-results');
      if (saved) {
        logger.debug('🔍 Current localStorage quiz results:', JSON.parse(saved));
      }
    } catch (error) {
      logger.error('❌ Error reading localStorage:', error);
    }
  }, []);



  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: any}>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quizResult, setQuizResult] = useState<{passed: boolean, score: number, feedback: string} | null>(null);
  // Gamification: points and celebration
  const [totalPoints, setTotalPoints] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('monetize-total-points') || '0', 10) || 0; } catch { return 0; }
  });
  const [rewardGranted, setRewardGranted] = useState(false);

  // Track stages that have already given points to prevent duplicate rewards
  const [stagePointsGiven, setStagePointsGiven] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('stage-points-given');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });



  // Initialize stages based on user progress from API
  const [passedStages, setPassedStages] = useState<Set<number>>(new Set([1])); // Only first stage unlocked by default
  // Initialize quiz results from localStorage and user progress
  const [stageQuizResults, setStageQuizResults] = useState<{[key: number]: {passed: boolean, score: number, attempts: number}}>(() => {
    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem('monetize-quiz-results');
      if (saved) {
        const parsed = JSON.parse(saved);
        logger.debug('📱 Loaded quiz results from localStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      logger.error('❌ Error loading quiz results from localStorage:', error);
    }
    return {};
  });

  // Helper function to get stage status based on user progress and subscription
  const getStageStatus = (stageId: number): 'locked' | 'available' | 'in_progress' | 'completed' => {
    const currentSession = userData.currentSession || 1;
    const completedStages = currentSession - 1;
    
    // CRITICAL FIX: Check if previous stage was passed in quiz results
    // This ensures that even if backend didn't update, frontend can unlock next stage
    const previousStageId = stageId - 1;
    const previousStagePassed = stageQuizResults[previousStageId]?.passed === true;
    
    // Check subscription limits
    const canAccessStage = () => {
      // If user has paid subscription, they can access all stages
      if (userData.subscriptionType === 'paid') {
        return true;
      }
      
      // For free trial users AND users without subscription (legacy/none): allow all Level 1 (first 5 stages)
      if (userData.subscriptionType === 'free_trial' || 
          !userData.subscriptionType || 
          userData.subscriptionType === 'none') {
        return stageId <= 5;
      }
      
      // If user has no subscription, they can't access any stages
      return false;
    };
    
    if (!canAccessStage()) {
      return 'locked';
    }
    
    let status: 'locked' | 'available' | 'in_progress' | 'completed';
    
    // CRITICAL FIX: If previous stage was passed, unlock next stage
    // This ensures that even if backend didn't update CurrentSession, frontend can still unlock
    if (previousStagePassed && stageId === previousStageId + 1) {
      status = 'available';
      logger.debug(`🔓 Unlocking stage ${stageId} because previous stage ${previousStageId} was passed:`, {
        stageId,
        previousStageId,
        previousStagePassed,
        currentSession,
        completedStages
      });
    } else if (stageId <= completedStages) {
      status = 'completed';
    } else if (stageId === completedStages + 1) {
      status = 'available'; // Current stage user can work on
    } else {
      status = 'locked';
    }
    
    // Log for debugging (only for stages 1-15 to avoid spam)
    if (stageId <= 15) {
      logger.debug(`🔍 getStageStatus(${stageId}):`, {
        currentSession,
        completedStages,
        status,
        previousStageId,
        previousStagePassed,
        calculation: `${stageId} vs ${completedStages}`,
        unlockedByQuiz: previousStagePassed && stageId === previousStageId + 1
      });
    }
    
    return status;
  };

  // Sync passed stages with user's actual progress from backend
  useEffect(() => {
    if (userData.currentSession && userData.currentSession > 1) {
      // User's current session means they have completed sessions up to currentSession - 1
      const completedStages = userData.currentSession - 1;
      
      // CRITICAL FIX: Allow access to stages up to completed + 1 (next available stage)
      // This ensures that if user is at stage 11, they can access stage 12
      const availableStages = [];
      for (let i = 1; i <= Math.min(completedStages + 1, 29); i++) {
        availableStages.push(i);
      }
      
      setPassedStages(new Set(availableStages));
      
      // CRITICAL: Force regenerate levels when currentSession changes
      // This ensures stages are immediately updated with correct status
      const updatedLevels = generateLevels();
      setLevels(updatedLevels);
      
      logger.debug('🔓 Updated available stages and regenerated levels based on user progress:', {
        currentSession: userData.currentSession,
        completedStages,
        availableStages: availableStages.length,
        nextAvailableStage: completedStages + 1,
        levelsRegenerated: true
      });
    }
  }, [userData.currentSession]);

  // Generate quiz results based on user's current session and merge with localStorage
  useEffect(() => {
    if (userData.currentSession && userData.currentSession > 1) {
      // User has completed stages up to currentSession - 1
      const completedStages = userData.currentSession - 1;
      
      // Create quiz results based on completed stages
      const generatedResults: {[key: number]: {passed: boolean, score: number, attempts: number}} = {};
      
      for (let i = 1; i <= completedStages; i++) {
        generatedResults[i] = {
          passed: true,  // If user is at stage 6, they must have passed stages 1-5
          score: 85,     // Default score for completed stages
          attempts: 1    // Default attempts
        };
      }
      
      // Merge with existing localStorage results (preserve failed attempts and real scores)
      const mergedResults = { ...stageQuizResults, ...generatedResults };
      
      logger.debug('📊 Merged quiz results:', {
        currentSession: userData.currentSession,
        completedStages,
        generatedResults,
        existingResults: stageQuizResults,
        mergedResults
      });
      
      setStageQuizResults(mergedResults);
    } else {
      // User is at stage 1, no completed stages - keep localStorage results
      logger.debug('📱 User at stage 1, keeping localStorage results:', stageQuizResults);
    }
  }, [userData.currentSession]);

  // Save quiz results to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('monetize-quiz-results', JSON.stringify(stageQuizResults));
      logger.debug('💾 Saved quiz results to localStorage:', stageQuizResults);
    } catch (error) {
      logger.error('❌ Error saving quiz results to localStorage:', error);
    }
  }, [stageQuizResults]);

  // Save stage points given to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('stage-points-given', JSON.stringify(stagePointsGiven));
      logger.debug('💾 Saved stage points given to localStorage:', stagePointsGiven);
    } catch (error) {
      logger.error('❌ Error saving stage points given to localStorage:', error);
    }
  }, [stagePointsGiven]);

  // Award points when quiz is passed (only once per stage)
  useEffect(() => {
    if (quizResult?.passed && selectedStage && !stagePointsGiven[selectedStage.id] && !rewardGranted) {
      const stageId = selectedStage.id;
      
      // Mark that points have been given for this stage
      setStagePointsGiven(prev => ({ ...prev, [stageId]: true }));
      
      // Add 50 points to total
      setTotalPoints(prev => {
        const newTotal = prev + 50;
        localStorage.setItem('monetize-total-points', newTotal.toString());
        return newTotal;
      });
      
      // Mark reward as granted to prevent duplicate
      setRewardGranted(true);
      
      // Launch confetti celebration
      launchConfetti();
      
        logger.debug('🎉 Awarded 50 points for stage', stageId, 'quiz completion!');
    }
  }, [quizResult, selectedStage, stagePointsGiven, rewardGranted, launchConfetti]);

  // Define levels state - will be initialized after generateLevels function definition
  const [levels, setLevels] = useState<Level[]>([]);
  
  // Initialize levels only when userData is ready
  useEffect(() => {
    // Only initialize if we have real user data (not defaults)
    if (userData.currentSession && userData.currentSession > 1) {
      logger.debug('📱 Initializing levels with real user data...');
      setLevels(generateLevels());
    } else if (!userData.currentSession || userData.currentSession === 1) {
      logger.debug('📱 Initializing levels with default data...');
      setLevels(generateLevels());
    }
  }, []);

  // CRITICAL: Regenerate levels when currentSession changes (after quiz pass)
  // This is a separate effect to ensure levels are always up-to-date
  useEffect(() => {
    if (userData.currentSession) {
      logger.debug('🔄 userData.currentSession changed, regenerating levels...', {
        currentSession: userData.currentSession,
        levelsCount: levels.length,
        selectedStageId: selectedStage?.id,
        completedStages: userData.currentSession - 1,
        nextAvailableStage: userData.currentSession
      });
      
      // Generate new levels with updated status
      const updatedLevels = generateLevels();
      setLevels(updatedLevels);
      
      // Log level generation result for debugging
      const level1 = updatedLevels[0];
      if (level1) {
        const currentStageId = userData.currentSession;
        const nextStageId = userData.currentSession + 1;
        logger.debug('📊 Level 1 stages after regeneration:', {
          currentStageId,
          nextStageId,
          currentStageStatus: level1.stages.find(s => s.id === currentStageId)?.status,
          nextStageStatus: level1.stages.find(s => s.id === nextStageId)?.status,
          stages: level1.stages.slice(0, 15).map(s => ({ 
            id: s.id, 
            status: s.status,
            isCurrent: s.id === currentStageId,
            isNext: s.id === nextStageId
          }))
        });
      }
      
      // If we have a selected stage, update it with new status from regenerated levels
      if (selectedStage) {
        logger.debug('🔄 Updating selected stage with new status...', {
          selectedStageId: selectedStage.id,
          selectedStageCurrentStatus: selectedStage.status,
          currentSession: userData.currentSession
        });
        
        let updatedStage: Stage | null = null;
        for (const level of updatedLevels) {
          const foundStage = level.stages.find(s => s.id === selectedStage.id);
          if (foundStage) {
            updatedStage = foundStage;
            break;
          }
        }
        
        if (updatedStage) {
          setSelectedStage(updatedStage);
          logger.debug('✅ Selected stage updated:', {
            stageId: updatedStage.id,
            oldStatus: selectedStage.status,
            newStatus: updatedStage.status,
            statusChanged: selectedStage.status !== updatedStage.status
          });
        } else {
          logger.warn('⚠️ Could not find selected stage in updated levels', {
            selectedStageId: selectedStage.id
          });
        }
      }
    }
  }, [userData.currentSession]); // Only trigger when currentSession changes

  // Auto-select current level based on user progress
  useEffect(() => {
    if (levels.length > 0 && !selectedLevel && userData.currentSession) {
      // Find the level containing the current session
      const currentStage = userData.currentSession;
      let targetLevel = levels[0]; // Default to first level
      
      for (const level of levels) {
        for (const stage of level.stages) {
          if (stage.id === currentStage) {
            targetLevel = level;
            break;
          }
        }
        if (targetLevel !== levels[0]) break;
      }
      
      setSelectedLevel(targetLevel);
      logger.debug('🎯 Auto-selected level based on current session:', {
        currentSession: userData.currentSession,
        selectedLevel: targetLevel.title
      });
    }
  }, [levels, selectedLevel, userData.currentSession]);

  // Quiz Questions based on current stage
  const getQuizQuestions = (stage: Stage) => {
    // Custom questions for stages 1-7
    const stageSpecificQuestions = {
      1: [
        {
          id: 1,
          type: 'short',
          question: 'به نظرت اگه ایده اشتباه انتخاب کنی، اولین مشکلی که سر راهت پیش میاد چیه؟',
          placeholder: 'مثال: وقت و انرژی هدر میره...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک جمله ساده بگو که چرا انتخاب ایده برات مهمه.',
          placeholder: 'مثال: چون مسیر کارم رو تعیین می‌کنه...'
        },
        {
          id: 3,
          type: 'long',
          question: 'تصور کن ایده اشتباه انتخاب کردی. مسیر کارت رو تا ۶ ماه بعدش توصیف کن، چه اتفاقی میفته؟',
          placeholder: 'مسیر احتمالی با ایده اشتباه...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'به نظرت مهم‌ترین دلیل انتخاب درست ایده کدومه؟',
          options: [
            'مسیرت رو روشن می‌کنه.',
            'سریع‌تر معروف میشی.',
            'پول بیشتری میاری.',
            'مشتری‌ها رو خوشحال می‌کنه.'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'اسم یکی از ایده‌هایی که تو ذهنت داری رو همینجا بنویس، حتی اگه هنوز مطمئن نیستی.',
          placeholder: 'نام ایده...'
        }
      ],
      2: [
        {
          id: 1,
          type: 'short',
          question: 'دو تا ویژگی مهمی که امروز فهمیدی یک ایده خوب باید داشته باشه رو بنویس.',
          placeholder: 'مثال: حل مشکل واقعی، قابلیت اجرا...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک مثال واقعی از یک ایده خوب که دیدی یا شنیدی رو بگو.',
          placeholder: 'مثال ایده موفق...'
        },
        {
          id: 3,
          type: 'long',
          question: 'یک ایده‌ای که داری رو انتخاب کن و با ویژگی‌های ایده خوب مقایسه کن. نتیجه‌اش رو بنویس.',
          placeholder: 'مقایسه ایده با معیارهای ایده خوب...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم ویژگی باعث میشه ایده‌ات واقعا پولساز باشه؟',
          options: [
            'مشکل واقعی رو حل کنه.',
            'فقط سرگرم‌کننده باشه.',
            'خیلی گرون باشه.',
            'پیچیده و عجیب باشه.'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'ویژگی‌های ایده‌ات را به صورت فهرست‌وار (۳ تا ۵ مورد) بنویس.',
          placeholder: 'مثال: حل یک مشکل مشخص، بازار هدف واضح، قابلیت اجرا...'
        }
      ],
      3: [
        {
          id: 1,
          type: 'short',
          question: 'سه تا مهارت مهم خودت رو بنویس.',
          placeholder: 'مثال: طراحی، برنامه‌نویسی، فروش...'
        },
        {
          id: 2,
          type: 'short',
          question: 'سه تا موضوعی که بهش علاقه داری رو بنویس.',
          placeholder: 'مثال: تکنولوژی، هنر، ورزش...'
        },
        {
          id: 3,
          type: 'long',
          question: 'با استفاده از این مهارت‌ها و علاقه‌ها، سه ایده کسب‌وکار با AI که بهت میخوره رو پیشنهاد بده.',
          placeholder: 'سه ایده بر اساس مهارت‌ها و علاقه‌ها...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'اگه بلد باشی طراحی کنی، کدوم ایده برات بهتره؟',
          options: [
            'ساخت سایت فروشگاهی.',
            'طراحی لوگو با AI.',
            'فروش کتاب‌های دست دوم.',
            'آموزش آشپزی.'
          ],
          correct: 1
        },
        {
          id: 5,
          type: 'short',
          question: 'اسم ۳ ایده‌ای که بیشتر از همه بهت انگیزه میدن رو اینجا یادداشت کن.',
          placeholder: 'نام سه ایده انگیزه‌بخش...'
        }
      ],
      4: [
        {
          id: 1,
          type: 'short',
          question: 'اسم سه ایده‌ای که الان داری رو بنویس.',
          placeholder: 'نام سه ایده...'
        },
        {
          id: 2,
          type: 'short',
          question: 'اسم ایده‌ای که حس می‌کنی بهترینه رو بنویس.',
          placeholder: 'نام بهترین ایده...'
        },
        {
          id: 3,
          type: 'long',
          question: 'دو تا دلیل اصلی که باعث شد این ایده رو انتخاب کنی رو توضیح بده.',
          placeholder: 'دو دلیل اصلی برای انتخاب...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم معیار از همه مهم‌تره؟',
          options: [
            'علاقه‌ات به ایده.',
            'ارزون بودن اجراش.',
            'تعداد رقباش کم باشه.',
            'پیچیده باشه.'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'برای هر ایده امتیاز علاقه، سود و آسانی اجرا را (از ۱ تا ۵) بنویس و در یک جمله نتیجه نهایی را جمع‌بندی کن.',
          placeholder: 'مثال: ایده A (علاقه ۵، سود ۴، آسانی ۳) — جمع‌بندی: ایده A بهتره.'
        }
      ],
      5: [
        {
          id: 1,
          type: 'short',
          question: 'یک جمله ساده که سرویس تو رو معرفی کنه بنویس.',
          placeholder: 'معرفی ساده سرویس...'
        },
        {
          id: 2,
          type: 'short',
          question: 'به نظرت اولین مشتری تو کیه؟',
          placeholder: 'شناسایی اولین مشتری...'
        },
        {
          id: 3,
          type: 'long',
          question: 'یک برنامه قدم‌به‌قدم برای رسیدن به اولین درآمدت در ۳۰ روز آینده بنویس.',
          placeholder: 'برنامه ۳۰ روزه برای اولین درآمد...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم ویژگی مسیر سریع مهم‌تره؟',
          options: [
            'قابل اجرا بودن.',
            'پر از ایده‌های پیچیده باشه.',
            'نیاز به بودجه زیاد داشته باشه.',
            'مبهم باشه.'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'سه راه سریع و کم‌هزینه برای پیدا کردن اولین مشتری رو اینجا بنویس.',
          placeholder: 'سه راه پیدا کردن مشتری...'
        }
      ],
      6: [
        {
          id: 1,
          type: 'short',
          question: 'اسم برندت رو بنویس.',
          placeholder: 'نام برند...'
        },
        {
          id: 2,
          type: 'short',
          question: 'شعاری که انتخاب کردی رو بنویس.',
          placeholder: 'شعار برند...'
        },
        {
          id: 3,
          type: 'long',
          question: 'توضیح بده چرا این اسم و شعار رو انتخاب کردی و چطور به سرویس‌ات ربط داره.',
          placeholder: 'دلیل انتخاب اسم و شعار...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم شعار برای برند بازاریابی با AI بهتره؟',
          options: [
            '«با ما بیشتر بفروشید»',
            '«بازاریابی هوشمند با هوش مصنوعی»',
            '«از طبیعت لذت ببرید»',
            '«ارزان و سریع»'
          ],
          correct: 1
        },
        {
          id: 5,
          type: 'short',
          question: 'در یک جمله، موقعیت برند خودت رو برای مشتری تعریف کن.',
          placeholder: 'تعریف موقعیت برند...'
        }
      ],
      7: [
        {
          id: 1,
          type: 'short',
          question: 'یک ویژگی اصلی MVP خودت رو بنویس.',
          placeholder: 'ویژگی اصلی MVP...'
        },
        {
          id: 2,
          type: 'short',
          question: 'چند نفر رو برای تست MVP انتخاب می‌کنی؟',
          placeholder: 'تعداد افراد تست...'
        },
        {
          id: 3,
          type: 'long',
          question: 'توضیح بده چطور MVP رو به این افراد معرفی می‌کنی و ازشون بازخورد می‌گیری.',
          placeholder: 'روش معرفی و دریافت بازخورد...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'بهترین MVP کدومه؟',
          options: [
            'شامل همه امکانات نسخه نهایی باشه.',
            'فقط امکانات اصلی و حیاتی رو داشته باشه.',
            'خیلی گرون باشه.',
            'استفاده ازش سخت باشه.'
          ],
          correct: 1
        },
        {
          id: 5,
          type: 'short',
          question: 'سه سوالی که میخوای از تست‌کننده‌ها بپرسی رو اینجا بنویس.',
          placeholder: 'سه سوال برای تست‌کنندگان...'
        }
      ],
      8: [
        {
          id: 1,
          type: 'short',
          question: 'یک جمله معرفی جذاب برای سرویس‌ت بنویس.',
          placeholder: 'معرفی جذاب سرویس...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک پیشنهاد اولیه بده که مشتری رو وسوسه کنه امتحان کنه.',
          placeholder: 'پیشنهاد وسوسه‌کننده...'
        },
        {
          id: 3,
          type: 'long',
          question: 'پیشنهاد اولیه‌ات رو کامل توضیح بده: شامل چه چیزیه؟ چطور تحویل میدی؟ چه قیمتی داره؟',
          placeholder: 'توضیح کامل پیشنهاد اولیه...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم پیشنهاد اولیه جذاب‌تره؟',
          options: [
            '«10٪ تخفیف برای اولین خرید»',
            '«تست رایگان یک‌روزه + مشاوره رایگان»',
            '«پرداخت کامل قبل از استفاده»',
            '«تخفیف برای خرید بیش از ۱۰ عدد»'
          ],
          correct: 1
        },
        {
          id: 5,
          type: 'short',
          question: 'سه دلیل بنویس که چرا مشتری باید همین حالا پیشنهادت رو قبول کنه.',
          placeholder: 'سه دلیل قانع‌کننده...'
        }
      ],
      9: [
        {
          id: 1,
          type: 'short',
          question: 'یک جمله احساسی که پیام برندت رو منتقل کنه بنویس.',
          placeholder: 'پیام احساسی برند...'
        },
        {
          id: 2,
          type: 'short',
          question: 'سه کلمه که دوست داری با شنیدن برندت یادش بیفتن رو بنویس.',
          placeholder: 'سه کلمه کلیدی...'
        },
        {
          id: 3,
          type: 'long',
          question: 'داستان برندت رو در ۵ تا ۷ جمله تعریف کن. از شروع تا هدفی که داری.',
          placeholder: 'داستان برند...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم جمله شروع بهتری برای داستان برند داره؟',
          options: [
            '«ما یک شرکت جدید هستیم.»',
            '«همه‌چیز از یک مشکل واقعی شروع شد…»',
            '«محصولات ما بهترین هستن.»',
            '«ما ارزان‌ترینیم.»'
          ],
          correct: 1
        },
        {
          id: 5,
          type: 'short',
          question: 'یک پست اینستاگرامی کوتاه برای معرفی داستان برندت بنویس.',
          placeholder: 'پست معرفی داستان برند...'
        }
      ],
      10: [
        {
          id: 1,
          type: 'short',
          question: 'پالت رنگ برندت رو بنویس.',
          placeholder: 'رنگ‌های برند...'
        },
        {
          id: 2,
          type: 'short',
          question: 'فونتی که انتخاب کردی رو بگو.',
          placeholder: 'فونت برند...'
        },
        {
          id: 3,
          type: 'long',
          question: 'توضیح بده این رنگ و فونت چطور شخصیت برندت رو نشون میدن.',
          placeholder: 'رابطه رنگ و فونت با شخصیت برند...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم رنگ برای برند آموزشی مناسب‌تره؟',
          options: [
            'قرمز تند',
            'آبی آرام',
            'مشکی پررنگ',
            'سبز فسفری'
          ],
          correct: 1
        },
        {
          id: 5,
          type: 'short',
          question: 'یک نمونه پست با رنگ و فونت برندت طراحی کن (حتی ساده).',
          placeholder: 'نمونه پست با هویت بصری...'
        }
      ],
      11: [
        {
          id: 1,
          type: 'short',
          question: 'اسم برندت رو به همون شکلی که میخوای تو لوگو باشه بنویس.',
          placeholder: 'نام برند در لوگو...'
        },
        {
          id: 2,
          type: 'short',
          question: 'دو تا نماد یا شکل که به کارت میاد رو بگو.',
          placeholder: 'نمادهای لوگو...'
        },
        {
          id: 3,
          type: 'long',
          question: 'توضیح بده لوگوت باید چه پیامی رو به مشتری منتقل کنه.',
          placeholder: 'پیام لوگو...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'لوگوی خوب باید…',
          options: [
            'ساده و ماندگار باشه',
            'پر از جزئیات باشه',
            'شبیه بقیه باشه',
            'رنگ‌های زیادی داشته باشه'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک اتود اولیه لوگو (حتی با قلم و کاغذ) بکش.',
          placeholder: 'توضیح اتود لوگو...'
        }
      ],
      12: [
        {
          id: 1,
          type: 'multiple',
          question: 'به‌نظرت مهم‌ترین چیز توی رشد پیج چیه؟',
          options: [
            'تعداد فالوئر',
            'تعامل واقعی',
            'رنگ و قالب'
          ],
          correct: 1
        },
        {
          id: 2,
          type: 'short',
          question: 'مخاطب ایده‌آل پیجت کیه؟ (تو یک جمله بنویس)',
          placeholder: 'مخاطب ایده‌آل...'
        },
        {
          id: 3,
          type: 'short',
          question: 'برای کارت کدوم شبکه اجتماعی بهترینه؟ (اینستا، لینکدین، یوتیوب یا …؟)',
          placeholder: 'بهترین شبکه اجتماعی...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'توی پروفایل پیجت، به نظرت کدوم مهم‌تره؟',
          options: [
            'بایوی واضح',
            'تعداد پست زیاد'
          ],
          correct: 0
        }
      ],
      13: [
        {
          id: 1,
          type: 'short',
          question: 'مسیر رشد پیج رو کامل کن 👇\nAwareness → … → …',
          placeholder: 'مراحل رشد پیج...'
        },
        {
          id: 2,
          type: 'multiple',
          question: 'چرا یه پست وایرال میشه؟',
          options: [
            'فقط شانس',
            'قلاب و CTA درست',
            'رنگ قشنگ'
          ],
          correct: 1
        },
        {
          id: 3,
          type: 'short',
          question: 'لحن محتوای پیجت رو با سه کلمه بگو (مثلاً صمیمی، الهام‌بخش، آموزشی)',
          placeholder: 'سه کلمه برای لحن...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'داشتن تقویم محتوایی چه کمکی می‌کنه؟',
          options: [
            'نظم و صرفه‌جویی',
            'سخت‌تر شدن کار'
          ],
          correct: 0
        }
      ],
      14: [
        {
          id: 1,
          type: 'short',
          question: 'یه استوری ساده برای آموزش یا پشت‌صحنه کارت بگو چی می‌تونه باشه؟',
          placeholder: 'ایده استوری آموزشی...'
        },
        {
          id: 2,
          type: 'multiple',
          question: 'کدوم CTA قوی‌تره؟',
          options: [
            '«روی لینک کلیک کن»',
            '«می‌خوای نسخه رایگان رو بگیری؟ روی لینک بزن»'
          ],
          correct: 1
        },
        {
          id: 3,
          type: 'short',
          question: 'اگه یکی زیر پستت کامنت «عالی بود» گذاشت، چی جواب میدی که مکالمه ادامه پیدا کنه؟',
          placeholder: 'پاسخ برای ادامه مکالمه...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'دایرکت فروش نرم رو انتخاب کن:',
          options: [
            '«محصول ما رو بخر»',
            '«می‌خوای یه نمونه رایگان برات بفرستم؟»'
          ],
          correct: 1
        }
      ],
      15: [
        {
          id: 1,
          type: 'short',
          question: 'تیتر اصلی صفحه فرودت رو بنویس.',
          placeholder: 'تیتر اصلی...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک جمله برای دعوت به اقدام (CTA) بنویس.',
          placeholder: 'دعوت به اقدام...'
        },
        {
          id: 3,
          type: 'long',
          question: 'ساختار صفحه‌ات رو توضیح بده: چه بخش‌هایی داره و هر کدوم چه کاری می‌کنه.',
          placeholder: 'ساختار صفحه فرود...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم CTA بهتره؟',
          options: [
            '«اینجا کلیک کن»',
            '«همین حالا رایگان شروع کن»',
            '«اطلاعات بیشتر»',
            '«خرید»'
          ],
          correct: 1
        },
        {
          id: 5,
          type: 'short',
          question: 'یک متن کوتاه برای بالای صفحه‌ات بنویس.',
          placeholder: 'متن بالای صفحه...'
        }
      ],
      16: [
        {
          id: 1,
          type: 'short',
          question: 'اسم درگاه پرداختی که انتخاب کردی رو بگو.',
          placeholder: 'نام درگاه پرداخت...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک دلیل برای انتخاب این درگاه بنویس.',
          placeholder: 'دلیل انتخاب درگاه...'
        },
        {
          id: 3,
          type: 'long',
          question: 'توضیح بده روند پرداخت مشتری چطور قراره انجام بشه.',
          placeholder: 'روند پرداخت...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'مهم‌ترین ویژگی درگاه پرداخت؟',
          options: [
            'امنیت',
            'ارزونی',
            'تبلیغات زیاد',
            'پیچیدگی'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک تست تراکنش آزمایشی انجام بده.',
          placeholder: 'نتیجه تست تراکنش...'
        }
      ],
      17: [
        {
          id: 1,
          type: 'short',
          question: 'کانال پشتیبانی اصلی‌ت رو بگو.',
          placeholder: 'کانال پشتیبانی...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک کانال دیگه برای جذب مشتری رو نام ببر.',
          placeholder: 'کانال جذب مکمل...'
        },
        {
          id: 3,
          type: 'long',
          question: 'توضیح بده چطور با مشتری بعد از خرید در ارتباط می‌مونی.',
          placeholder: 'روش ارتباط بعد از خرید...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم گزینه پشتیبانی بهتریه؟',
          options: [
            'پاسخ سریع',
            'پاسخ دیر',
            'فقط پاسخ آماده',
            'بدون پاسخ'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک پیام خوشامدگویی برای مشتری جدیدت بنویس.',
          placeholder: 'پیام خوشامدگویی...'
        }
      ],
      18: [
        {
          id: 1,
          type: 'short',
          question: 'اولین گروهی که احتمال میدی مشتری‌ت باشن رو نام ببر.',
          placeholder: 'گروه هدف اولیه...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک روش رایگان برای پیدا کردن مشتری رو بگو.',
          placeholder: 'روش رایگان جذب...'
        },
        {
          id: 3,
          type: 'long',
          question: 'یک برنامه ۷ روزه برای رسیدن به اولین مشتری‌ت بنویس.',
          placeholder: 'برنامه ۷ روزه جذب...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'بهترین روش شروع جذب مشتری؟',
          options: [
            'معرفی به دوستان و آشنایان',
            'تبلیغ گران‌قیمت فوری',
            'منتظر موندن تا خودش پیدا بشه',
            'فرستادن پیام تبلیغی به همه'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'سه نفر رو همین الان لیست کن و پیام معرفی سرویس‌ت رو براشون بفرست.',
          placeholder: 'لیست و پیام معرفی...'
        }
      ],
      19: [
        {
          id: 1,
          type: 'short',
          question: 'یک جمله کوتاه برای معرفی پیشنهادت بنویس.',
          placeholder: 'معرفی پیشنهاد...'
        },
        {
          id: 2,
          type: 'short',
          question: 'دو مزیت مهم پیشنهادت رو بگو.',
          placeholder: 'دو مزیت اصلی...'
        },
        {
          id: 3,
          type: 'long',
          question: 'یک پیشنهاد فروش کامل شامل قیمت، مزایا، و محدودیت زمانی طراحی کن.',
          placeholder: 'پیشنهاد فروش کامل...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم روش باعث میشه مشتری سریع‌تر خرید کنه؟',
          options: [
            'محدودیت زمانی',
            'قیمت بالا بدون دلیل',
            'توضیح زیاد بدون مزیت',
            'تخفیف همیشگی'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک تصویر یا پست معرفی پیشنهادت رو آماده کن.',
          placeholder: 'محتوای معرفی پیشنهاد...'
        }
      ],
      20: [
        {
          id: 1,
          type: 'short',
          question: 'یک سوال کلیدی که از مشتری میپرسی رو بنویس.',
          placeholder: 'سوال کلیدی...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک جمله برای بستن فروش بگو.',
          placeholder: 'جمله بستن فروش...'
        },
        {
          id: 3,
          type: 'long',
          question: 'یک اسکریپت کوتاه مکالمه فروش بنویس.',
          placeholder: 'اسکریپت مکالمه فروش...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'بهترین شروع مکالمه فروش؟',
          options: [
            'معرفی خودت و پرسیدن نیاز مشتری',
            'مستقیم گفتن قیمت',
            'تعریف طولانی از خودت',
            'سوالات بی‌ربط'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'سه اعتراض رایج مشتری رو بنویس و جواب آماده کن.',
          placeholder: 'اعتراضات و جواب‌ها...'
        }
      ],
      21: [
        {
          id: 1,
          type: 'short',
          question: 'دو دسته مشتری اصلی‌ت رو بگو.',
          placeholder: 'دسته‌های مشتری...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک روش برای ثبت اطلاعات مشتری رو نام ببر.',
          placeholder: 'روش ثبت اطلاعات...'
        },
        {
          id: 3,
          type: 'long',
          question: 'اقلام اطلاعاتی لازم برای ثبت مشتری را فهرست کن (مثلاً: نام، راه ارتباط، وضعیت، یادداشت).',
          placeholder: 'نام مشتری، راه ارتباط، وضعیت، یادداشت...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم ابزار برای مدیریت مشتری مناسبه؟',
          options: [
            'CRM ساده',
            'کاغذ پاره',
            'حافظه شخصی',
            'پیام‌رسان عمومی'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: '۵ مشتری احتمالی را لیست کن و برای هرکدام یک راه ارتباط و وضعیت فعلی بنویس.',
          placeholder: 'نام مشتری، راه ارتباط، وضعیت...'
        }
      ],
      22: [
        {
          id: 1,
          type: 'short',
          question: 'یک پیام کوتاه برای یادآوری پیشنهادت بنویس.',
          placeholder: 'پیام یادآوری...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک ابزار برای ارسال خودکار پیام نام ببر.',
          placeholder: 'ابزار ارسال خودکار...'
        },
        {
          id: 3,
          type: 'long',
          question: 'یک برنامه ۳ مرحله‌ای فالوآپ طراحی کن.',
          placeholder: 'برنامه فالوآپ...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'بهترین زمان برای فالوآپ؟',
          options: [
            'یک تا سه روز بعد',
            'همون لحظه',
            'یک ماه بعد',
            'اصلاً نه'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک پیام فالوآپ رو همین الان آماده کن.',
          placeholder: 'پیام فالوآپ...'
        }
      ],
      23: [
        {
          id: 1,
          type: 'short',
          question: 'یک بخش از کارت که میشه خودکار کرد رو بگو.',
          placeholder: 'بخش قابل اتوماسیون...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک ابزار اتوماسیون نام ببر.',
          placeholder: 'ابزار اتوماسیون...'
        },
        {
          id: 3,
          type: 'long',
          question: 'یک سناریوی ساده اتوماسیون فروش رو توضیح بده.',
          placeholder: 'سناریوی اتوماسیون...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم کار رو اول خودکار کنیم؟',
          options: [
            'پاسخ به سوالات تکراری',
            'طراحی لوگو',
            'ساخت محصول',
            'مذاکره دستی'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک نقشه ساده از فرآیند اتوماسیون کارت بکش.',
          placeholder: 'نقشه اتوماسیون...'
        }
      ],
      24: [
        {
          id: 1,
          type: 'short',
          question: 'یک کشور که فکر میکنی مشتری خوبی داره رو بگو.',
          placeholder: 'کشور هدف...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک دلیل انتخابت رو بنویس.',
          placeholder: 'دلیل انتخاب کشور...'
        },
        {
          id: 3,
          type: 'long',
          question: 'سه بازار بین‌المللی رو مقایسه کن.',
          placeholder: 'مقایسه بازارها...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'بهترین معیار انتخاب بازار؟',
          options: [
            'تقاضای بالا',
            'زیبایی پرچم کشور',
            'فاصله جغرافیایی',
            'سلیقه شخصی'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک لیست ۵ کشوری تهیه کن که پتانسیل مشتری‌ت رو دارن.',
          placeholder: 'لیست کشورهای هدف...'
        }
      ],
      25: [
        {
          id: 1,
          type: 'short',
          question: 'یک نقش مهم که در تیم نیاز داری رو بگو.',
          placeholder: 'نقش کلیدی تیم...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک ابزار برای مدیریت تیم نام ببر.',
          placeholder: 'ابزار مدیریت تیم...'
        },
        {
          id: 3,
          type: 'long',
          question: 'ساختار تیمی ایده‌آلت رو توضیح بده.',
          placeholder: 'ساختار تیم ایده‌آل...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم بخش برای رشد سریع ضروریه؟',
          options: [
            'تیم فروش',
            'میز کار شیک',
            'گیاه تزئینی',
            'لوگوی بزرگ'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'سه نقش کلیدی رو همین الان مشخص کن.',
          placeholder: 'سه نقش کلیدی...'
        }
      ],
      26: [
        {
          id: 1,
          type: 'short',
          question: 'یک هدف اصلی برای سه ماه آینده رو بگو.',
          placeholder: 'هدف سه‌ماهه...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک شاخص برای سنجش پیشرفت نام ببر.',
          placeholder: 'شاخص پیشرفت...'
        },
        {
          id: 3,
          type: 'long',
          question: 'برنامه هفتگی برای رسیدن به هدفت رو توضیح بده.',
          placeholder: 'برنامه هفتگی...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'بهترین شاخص پیشرفت؟',
          options: [
            'تعداد مشتری',
            'رنگ سایت',
            'تعداد پست‌های بی‌هدف',
            'طول کپشن‌ها'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'برنامه ۹۰ روزه رشدت را به صورت خلاصه هفتگی (۵ تا ۷ خط) بنویس.',
          placeholder: 'هفته ۱: ... هفته ۲: ... هفته ۳: ...'
        }
      ],
      27: [
        {
          id: 1,
          type: 'short',
          question: 'یک روش برای فروش تکراری رو نام ببر.',
          placeholder: 'روش فروش تکراری...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک محصول یا خدمت مکمل پیشنهاد بده.',
          placeholder: 'محصول/خدمت مکمل...'
        },
        {
          id: 3,
          type: 'long',
          question: 'برنامه‌ای برای نگه داشتن مشتری‌ها و خرید دوباره‌شون طراحی کن.',
          placeholder: 'برنامه وفادارسازی...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم روش فروش تکراری‌تره؟',
          options: [
            'اشتراک ماهانه',
            'فروش یک‌باره',
            'پیشنهاد سالی یک‌بار',
            'فروش تصادفی'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک پکیج اشتراکی طراحی کن.',
          placeholder: 'پکیج اشتراکی...'
        }
      ],
      28: [
        {
          id: 1,
          type: 'short',
          question: 'یک ایده برای پیشنهاد به مشتری فعلی بده.',
          placeholder: 'ایده پیشنهاد جدید...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک روش شخصی‌سازی تجربه مشتری بگو.',
          placeholder: 'روش شخصی‌سازی...'
        },
        {
          id: 3,
          type: 'long',
          question: 'یک برنامه وفادارسازی مشتری طراحی کن.',
          placeholder: 'برنامه وفادارسازی...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'بهترین زمان معرفی محصول جدید به مشتری قدیمی؟',
          options: [
            'بعد از رضایت از خرید قبلی',
            'قبل از خرید اول',
            'وسط شکایت',
            'تصادفی'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک پیام معرفی محصول جدید برای مشتری قدیمی‌ت بنویس.',
          placeholder: 'پیام معرفی محصول جدید...'
        }
      ],
      29: [
        {
          id: 1,
          type: 'short',
          question: 'یک ایده نوآورانه با AI بگو.',
          placeholder: 'ایده نوآورانه AI...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک حوزه جدید که میخوای واردش بشی رو نام ببر.',
          placeholder: 'حوزه جدید...'
        },
        {
          id: 3,
          type: 'long',
          question: 'یک برنامه کوتاه‌مدت و بلندمدت برای اجرای نوآوری با AI بنویس.',
          placeholder: 'برنامه نوآوری AI...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'بهترین زمان نوآوری؟',
          options: [
            'وقتی بازار آماده‌ست',
            'وقتی مشتری نداری',
            'وسط بحران بدون برنامه',
            'فقط وقتی رقبا کار جدید کنن'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک ایده AI رو انتخاب و اولین قدم اجرایی‌ش رو بردار.',
          placeholder: 'اولین قدم اجرایی...'
        }
      ]
    };

    // Return stage-specific questions if available, otherwise default questions
    if (stageSpecificQuestions[stage.id as keyof typeof stageSpecificQuestions]) {
      return stageSpecificQuestions[stage.id as keyof typeof stageSpecificQuestions];
    }

    // Default questions for other stages
    const defaultQuestions = [
      {
        id: 1,
        type: 'multiple',
        question: `در مرحله "${stage.title}"، مهم‌ترین اولویت چیست؟`,
        options: [
          'جمع‌آوری اطلاعات کامل',
          'شروع سریع اجرا',
          'تحلیل دقیق بازار',
          'ساخت پروتوتایپ'
        ],
        correct: 0
      },
      {
        id: 2,
        type: 'short',
        question: 'در یک جمله، هدف اصلی این مرحله را بنویسید:',
        placeholder: 'مثال: شناسایی مشتریان هدف و نیازهایشان...'
      },
      {
        id: 3,
        type: 'multiple',
        question: 'کدام ابزار AI در این مرحله بیشترین کمک را می‌کند؟',
        options: [
          'ChatGPT برای تحقیق',
          'Midjourney برای طراحی',
          'Claude برای تحلیل',
          'Google Bard برای ایده‌یابی'
        ],
        correct: 0
      },
      {
        id: 4,
        type: 'long',
        question: 'یک استراتژی عملی برای تکمیل موفق این مرحله ارائه دهید:',
        placeholder: 'استراتژی خود را با جزئیات بنویسید...'
      }
    ];
    
    return defaultQuestions;
  };

  // Quiz Functions
  const handleAnswerSelect = (questionId: number, answer: any) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const nextQuestion = () => {
    const questions = getQuizQuestions(selectedStage!);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Start AI analysis
      setIsAnalyzing(true);
      analyzeQuizResults();
    }
  };

  const analyzeQuizResults = async () => {
    if (!selectedStage) return;
    
    try {
      setIsAnalyzing(true);
      
      if (isAPIConnected) {
        // Use real ChatGPT evaluation via API
        logger.debug('🧠 Evaluating quiz with ChatGPT...');
        const response = await apiService.evaluateQuiz({
          stage_id: selectedStage.id,
          answers: userAnswers
        });
        
        if (response.success && response.data) {
          const { passed, score, feedback, next_stage_unlocked } = response.data;
          
          setQuizResult({ passed, score, feedback });
          setIsAnalyzing(false);
          setQuizCompleted(true);
          
          // Save quiz result for this stage
          setStageQuizResults(prev => ({
            ...prev,
            [selectedStage.id]: {
              passed,
              score,
              attempts: (prev[selectedStage.id]?.attempts || 0) + 1
            }
          }));
          
          // CRITICAL FIX: If quiz passed, ALWAYS unlock next stage and refresh
          // Even if next_stage_unlocked is false from backend, we should still try to unlock
          if (passed) {
            logger.debug('🎉 Quiz passed! Unlocking next stage...', {
              stageId: selectedStage.id,
              nextStageId: selectedStage.id + 1,
              currentSessionBefore: userData.currentSession,
              nextStageUnlocked: next_stage_unlocked
            });
            
            // Always add next stage to passed stages if quiz passed
            setPassedStages(prev => new Set([...prev, selectedStage.id + 1]));
            
            // CRITICAL: Always refresh user data to get latest currentSession from backend
            // This ensures that even if backend updated CurrentSession, we get the latest value
            logger.debug('🔄 Refreshing user data from API (forcing cache clear)...');
            try {
              // Clear cache first to ensure fresh data
              apiService.clearCache();
              
              // Refresh user data
              await refreshUserDataFromContext();
              
              // Wait for React state to update after refresh
              // The useEffect watching userData.currentSession will automatically regenerate levels
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Force regenerate levels immediately after refresh
              const updatedLevels = generateLevels();
              setLevels(updatedLevels);
              
              // Update selected stage if it exists in updated levels
              if (selectedStage) {
                for (const level of updatedLevels) {
                  const updatedStage = level.stages.find(s => s.id === selectedStage.id);
                  if (updatedStage) {
                    setSelectedStage(updatedStage);
                    break;
                  }
                }
              }
              
              logger.debug('✅ User progress updated and levels regenerated:', {
                currentSession: userData.currentSession,
                nextStageId: selectedStage.id + 1,
                nextStageUnlocked: next_stage_unlocked,
                levelsRegenerated: true
              });
            } catch (refreshError) {
              logger.error('❌ Error refreshing user data after quiz pass:', refreshError);
              
              // FALLBACK: Even if refresh fails, manually unlock next stage
              // This ensures user can continue even if there's a temporary API issue
              logger.warn('⚠️ Refresh failed, manually unlocking next stage as fallback');
              const fallbackLevels = generateLevels();
              setLevels(fallbackLevels);
            }
            
            // If next_stage_unlocked is false but passed is true, log warning
            if (!next_stage_unlocked) {
              logger.warn('⚠️ Quiz passed but backend did not unlock next stage. Forcing unlock on frontend.', {
                stageId: selectedStage.id,
                passed,
                next_stage_unlocked
              });
            }
          }
          
          logger.debug('✅ Quiz evaluated successfully:', { passed, score, next_stage_unlocked });
        } else {
          throw new Error(response.error || 'Failed to evaluate quiz');
        }
      } else {
        // Fallback to local simulation when API not connected
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        
        const questions = getQuizQuestions(selectedStage);
    let score = 0;
    let correctAnswers = 0;
    
    // Calculate score based on answers
    questions.forEach(question => {
      const userAnswer = userAnswers[question.id];
      if (question.type === 'multiple' && userAnswer === question.correct) {
        correctAnswers++;
        score += 25;
      } else if ((question.type === 'short' || question.type === 'long') && userAnswer && userAnswer.trim().length > 10) {
        // Simple validation for text answers
        correctAnswers++;
        score += 25;
      }
    });

    const passed = score >= 70; // 70% to pass
    
    const feedbacks = {
      excellent: "🎉 عالی! مانیتایزر عزیز، شما درک کاملی از این مرحله دارید. پاسخ‌هایتان نشان می‌دهد که آماده پیشرفت به مرحله بعد هستید. ادامه دهید!",
      good: "👍 خوب! مانیتایزر عزیز، شما اساس این مرحله را درک کرده‌اید. با کمی مرور بیشتر، می‌تونید به راحتی به مرحله بعد بروید.",
      needsWork: "📚 نیاز به مطالعه بیشتر! مانیتایزر عزیز، پیشنهاد می‌کنم ویدئو آموزشی را دوباره مشاهده کنید و با AI Coach بیشتر صحبت کنید.",
      failed: "🔄 تلاش مجدد! مانیتایزر عزیز، این بار زمان بیشتری برای یادگیری صرف کنید. من آماده کمک به شما هستم!"
    };

    let feedback = feedbacks.failed;
    if (score >= 90) feedback = feedbacks.excellent;
    else if (score >= 80) feedback = feedbacks.good;
    else if (score >= 70) feedback = feedbacks.needsWork;

    setQuizResult({ passed, score, feedback });
    setIsAnalyzing(false);
    setQuizCompleted(true);
    
    // Save quiz result for this stage
      setStageQuizResults(prev => ({
        ...prev,
        [selectedStage.id]: {
          passed,
          score,
          attempts: (prev[selectedStage.id]?.attempts || 0) + 1
        }
      }));
      
      // If passed, unlock next stage
      if (passed) {
        setPassedStages(prev => new Set([...prev, selectedStage.id + 1]));
          // Re-generate levels to reflect the updated status
          setTimeout(() => {
            setLevels(generateLevels());
          }, 500);
        }
      }
    } catch (error) {
      logger.error('❌ Error evaluating quiz:', error);
      setIsAnalyzing(false);
      
      // Show error message
      setQuizResult({ 
        passed: false, 
        score: 0, 
        feedback: 'خطا در ارزیابی آزمون. مانیتایزر عزیز، لطفاً دوباره تلاش کنید.' 
      });
      setQuizCompleted(true);
    }
  };

  const resetQuiz = async () => {
    // Close the quiz modal
    setShowQuiz(false);
    
    // Reset quiz states
    setCurrentQuestion(0);
    setUserAnswers({});
    setQuizCompleted(false);
    setIsAnalyzing(false);
    setQuizResult(null);
    
    // If quiz was passed, refresh data to update UI (show checkmark on completed stage)
    if (quizResult?.passed && isAPIConnected) {
      logger.debug('🔄 Quiz passed - refreshing data to update UI...');
      try {
        await refreshUserDataFromContext();
        // Wait for state to update
        await new Promise(resolve => setTimeout(resolve, 500));
        // Regenerate levels to show updated status
        const updatedLevels = generateLevels();
        setLevels(updatedLevels);
        
        logger.debug('✅ Data refreshed after closing quiz modal');
      } catch (error) {
        logger.error('❌ Error refreshing data after quiz:', error);
      }
    }
  };

  // Note: refreshUserData is now imported from AppContext
  // This local function has been removed to use the context version
  // which properly updates currentSession from the API

  // Function to clear quiz results (for testing/debugging) - unused, kept for future use
  const clearQuizResults = () => {
    try {
      localStorage.removeItem('monetize-quiz-results');
      setStageQuizResults({});
      logger.debug('🧹 Quiz results cleared from localStorage');
    } catch (error) {
      logger.error('❌ Error clearing quiz results:', error);
    }
  };

  // Function to navigate to next stage/level
  const navigateToNext = () => {
    if (!selectedStage || !selectedLevel) return;
    
    logger.debug('🔍 Navigating to next stage/level:', {
      currentStage: selectedStage.title,
      currentLevel: selectedLevel.title
    });
    
    // Try to find next stage in current level
    const nextStageId = selectedStage.id + 1;
    // Free trial guard: block moving beyond Level 1 (stage 5)
    if (
      (userData.subscriptionType === 'free_trial' || !userData.subscriptionType || userData.subscriptionType === 'none') &&
      nextStageId > 5
    ) {
      logger.debug('⛔ Free trial - blocking navigation to stage', nextStageId);
      setIsNextLevelPopupOpen(true);
      return;
    }
    const nextStage = selectedLevel.stages.find(s => s.id === nextStageId);
    
    if (nextStage) {
      // CRITICAL: Reset all video-related states
      videoRefs.current = {};
      setPseudoFullscreenIdx(null);
      setIsFullscreen(false);
      
      // Move to next stage in same level
      setSelectedStage(nextStage);
      
      // Scroll to top with instant behavior for better UX
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 50);
      
      logger.debug('✅ Moved to next stage:', {
        stageId: nextStage.id,
        stageTitle: nextStage.title,
        hasVideos: !!nextStage.videos,
        videoUrl: nextStage.videoUrl
      });
    } else {
      // Try to move to next level
      const currentLevelIndex = levels.findIndex(l => l.id === selectedLevel.id);
      if (currentLevelIndex < levels.length - 1) {
        // Free trial guard: block moving into next level entirely
        if (userData.subscriptionType === 'free_trial' || !userData.subscriptionType || userData.subscriptionType === 'none') {
          logger.debug('⛔ Free trial - blocking navigation to next level');
          setIsNextLevelPopupOpen(true);
          return;
        }
        const nextLevel = levels[currentLevelIndex + 1];
        const firstStageOfNextLevel = nextLevel.stages[0];
        if (firstStageOfNextLevel) {
          // CRITICAL: Reset all video-related states
          videoRefs.current = {};
          setPseudoFullscreenIdx(null);
          setIsFullscreen(false);
          
          setSelectedLevel(nextLevel);
          setSelectedStage(firstStageOfNextLevel);
          
          // Scroll to top with instant behavior for better UX
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }, 50);
          
          logger.debug('✅ Moved to next level:', {
            levelTitle: nextLevel.title,
            stageId: firstStageOfNextLevel.id,
            stageTitle: firstStageOfNextLevel.title,
            hasVideos: !!firstStageOfNextLevel.videos,
            videoUrl: firstStageOfNextLevel.videoUrl
          });
        }
      } else {
        logger.debug('🎉 User has completed all levels!');
        alert('🎉 تبریک! شما تمام مراحل را تکمیل کرده‌اید!');
      }
    }
  };

  // Chat functions
  const handleCancelPromptEdit = () => {
    setIsEditingPrompt(false);
    setChatMessage('');
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = {
      id: chatMessages.length + 1,
      text: chatMessage,
      sender: 'user' as const,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    const messageToProcess = chatMessage;
    setChatMessage('');
    
    // Exit editing mode if we were editing a prompt
    if (isEditingPrompt) {
      setIsEditingPrompt(false);
    }
    
    try {
      if (isAPIConnected) {
        // Use real ChatGPT API
        const response = await apiService.sendChatMessage(messageToProcess);
        
        if (response.success && response.data) {
          const aiResponse = {
            id: chatMessages.length + 2,
            text: response.data.response,
            sender: 'ai' as const,
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            isNew: true
          };
          setChatMessages(prev => [...prev, aiResponse]);
          setTimeout(() => {
            checkScrollPosition();
          }, 100);
        } else {
          throw new Error(response.error || 'Failed to get response');
        }
      } else {
        // Fallback to simulated response
        const aiResponse = {
          id: chatMessages.length + 2,
          text: generateAIResponse(messageToProcess),
          sender: 'ai' as const,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          isNew: true
        };
        setChatMessages(prev => [...prev, aiResponse]);
        setTimeout(() => {
          checkScrollPosition();
        }, 100);
      }
    } catch (error) {
      logger.error('Error sending message:', error);
      const errorResponse = {
        id: chatMessages.length + 2,
        text: '❌ متأسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفا دوباره تلاش کنید.',
        sender: 'ai' as const,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        isNew: true
      };
      setChatMessages(prev => [...prev, errorResponse]);
      setTimeout(() => {
        checkScrollPosition();
      }, 100);
    }
  };

  const generateAIResponse = (_userMessage: string) => {
    // Simple AI response generation
    const responses = [
      'عالی! این ایده خیلی خوبیه. بیا بیشتر رویش کار کنیم.',
      'من می‌تونم کمکت کنم این مرحله رو بهتر انجام بدی.',
      'این قدم مهمیه. بیا با جزئیات بیشتر بررسیش کنیم.',
      'خوب پیش میریم! حالا بیا مرحله بعدی رو شروع کنیم.',
      'این نکته خیلی مهمیه. بیا بیشتر توضیح بده.'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };





  // Helper function to calculate level progress
  const calculateLevelProgress = (levelStages: Stage[]): number => {
    const currentSession = userData.currentSession || 1;
    const completedStages = levelStages.filter(stage => stage.id < currentSession).length;
    const progress = Math.round((completedStages / levelStages.length) * 100);
    
    // Only log for first level to avoid spam
    if (levelStages[0]?.id === 1) {
      logger.debug('🔢 Level progress calculation:', {
        currentSession,
        level1_stages: levelStages.map(s => s.id),
        completedStages,
        progress: `${progress}%`
      });
    }
    
    return progress;
  };

  // Generate levels data with dynamic status based on user progress
  const generateLevels = (): Level[] => {
    
    // First, define the level structures without progress
    const levelDefinitions = [
    {
      id: 1,
      title: "انتخاب ایده و ساخت اولین دارایی",
      subtitle: "",
      description: "پایه‌گذاری کسب‌وکار موفق با انتخاب ایده درست و ساخت اولین دارایی",
      goal: "شناسایی و انتخاب ایده‌ای که با کمک هوش مصنوعی قابل تبدیل به درآمد دلاری باشد",
      icon: <Lightbulb className="w-6 h-6" />,
      color: "text-green-600",
      gradient: "from-[#2c189a] to-[#5a189a]",
      isUnlocked: true,
      stages: [
        {
          id: 1,
          title: "چرا انتخاب ایده مهم‌ترین قدمه",
          description: "درک اهمیت انتخاب ایده درست برای موفقیت کسب‌وکار",
          status: getStageStatus(1),
          exercise: "تحلیل ۵ کسب‌وکار موفق و شناسایی ایده‌های پشت آن‌ها",
          checklist: [
            "مطالعه موردی ۵ کسب‌وکار موفق",
            "شناسایی مشکلی که هر کدام حل می‌کنند",
            "بررسی چگونگی استفاده از AI در این کسب‌وکارها"
          ],
          videoTitle: "اهمیت انتخاب ایده",
          videoDuration: "40:38",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az1sth1.mp4",
          prompts: [
            "می‌خوام سه ایده‌ای که قبلاً امتحان کردم ولی شکست خوردن رو تحلیل کنی. اطلاعات زیر رو دارم:\n\nایده اول: [توضیح ایده]\nایده دوم: [توضیح ایده]\nایده سوم: [توضیح ایده]\n\nلطفاً برای هر ایده مشخص کن:\n۱. آیا علاقه کافی داشتم؟\n۲. آیا تقاضای واقعی در بازار برای اون بود؟\n۳. آیا قابل اجرا با هوش مصنوعی بود؟\n۴. بزرگ‌ترین اشتباهی که مرتکب شدم چی بود؟\n۵. اگه الان بخوام دوباره روی اون ایده کار کنم، چه تغییری باید بدم؟\n\nدر نهایت کمکم کن الگوی شکست‌هامو بفهمم و یک پیشنهاد بده که با چه دیدگاهی برم سراغ ایده بعدی.",
            "می‌خوام با کمک تو چند ایده اولیه تولید کنم که هم منطبق با علایق شخصی‌م باشه، هم قابل اجرا با ابزارهای AI، هم پتانسیل درآمدزایی داشته باشه.\n\n🔹 علایق اصلی من: [مثلاً: آموزش، سلامت، سبک زندگی]\n🔹 مهارت‌هایی که دارم: [مثلاً: نویسندگی، گرافیک، تولید محتوا]\n🔹 تجربه‌هام: [مثلاً: مدیریت پیج اینستاگرام، تدریس خصوصی]\n🔹 شخصیت من: [مثلاً: درون‌گرا، علاقه‌مند به یادگیری، دقیق و تحلیل‌گر]\n🔹 هدف من: راه‌اندازی یک سرویس دیجیتال یا فریلنسری با کمک AI\n\nبر اساس این داده‌ها، لطفاً ۵ ایده به من پیشنهاد بده که:\n✅ با هوش مصنوعی قابل اجرا باشن\n✅ با علاقه و مهارت من هم‌راستا باشن\n✅ بتونن طی ۱-۳ ماه پول بسازن\nو برای هر ایده توضیح بده چه مشکلی رو حل می‌کنن و با چه ابزار AI قابل پیاده‌سازی هستن.",
            "می‌خوام این ایده رو با مدل سه‌بعدی بررسی کنی:\n💡 ایده: [توضیح کامل ایده]\n\nلطفاً برای هر بُعد از این سه بُعد، امتیاز بین ۱ تا ۵ بده و بعد تحلیل کن:\n\n🔸 علاقه واقعی من به این ایده چقدره؟ آیا انگیزه کافی دارم که چند ماه روی اون وقت بذارم؟\n🔸 بازار چقدر پتانسیل پولسازی داره؟ آیا تقاضای واقعی برای این ایده هست؟\n🔸 آیا با ابزارهای AI مثل ChatGPT، Midjourney یا اتوماسیون‌ها قابل اجراست؟\n\nدر نهایت بهم بگو آیا این ایده مناسبه برای ادامه مسیر یا باید ایده‌ام رو بهبود بدم؟",
            "می‌خوام بفهمم آیا علاقه من به این ایده واقعیه یا فقط هیجانی موقته.\n\nلطفاً با پرسیدن این ۳ سؤال کمکم کن تحلیل کنم:\n۱. آیا حاضرم حداقل ۳ ماه روی این ایده کار کنم حتی اگر هنوز درآمد نداشته باشه؟\n۲. آیا از صحبت کردن درباره این موضوع، انرژی می‌گیرم یا حس خستگی می‌کنم؟\n۳. اگه هیچ‌کس منو تشویق نکنه یا نتیجه سریع نبینم، ادامه می‌دم یا رها می‌کنم؟\n\nبر اساس پاسخ‌هام تحلیل کن که آیا علاقه‌ام به این ایده عمیق و ماندگاره یا باید دوباره فکر کنم.",
            "می‌خوام چند نمونه واقعی از ایده‌هایی که با کمک AI پیاده‌سازی شدن و درآمد ساختن رو ببینم.\n\nلطفاً ۷ ایده واقعی به من معرفی کن که برای هر کدوم این اطلاعات رو کامل بدی:\n\n۱. عنوان ایده\n۲. چه مشکلی رو حل کرده؟\n۳. مخاطب هدف کی بوده؟\n۴. با چه ابزارهای AI اجرا شده؟\n۵. چطور درآمدزایی کرده؟ (مثلاً خدمات، اشتراک، پروژه‌محور)\n\nهدفم اینه که الگو بگیرم و بتونم ایده مشابه یا الهام‌گرفته طراحی کنم.",
            "بین دو ایده مردد هستم. یکی رو واقعاً دوست دارم ولی سودش کمه. اون یکی درآمدش زیاده ولی انگیزه‌ی زیادی براش ندارم.\n\n🔹 ایده اول (علاقه‌محور): [توضیح کامل ایده]\n🔹 ایده دوم (سودآورتر): [توضیح کامل ایده]\n\nلطفاً کمکم کن:\n۱. تحلیل کنی که کدوم انتخاب بلندمدت به‌صرفه‌تره\n۲. آیا راهی برای ترکیب این دو وجود داره؟\n۳. یا اینکه کدومش رو اول اجرا کنم و چرا؟\n\nتصمیم نهایی‌م باید استراتژیک و پایداری مالی داشته باشه."
          ]
        },
        {
          id: 2,
          title: "ویژگی‌های یک ایده پول‌ساز قابل اجرا با AI",
          description: "معیارهای ارزیابی ایده‌ها برای قابلیت اجرا با هوش مصنوعی",
          status: getStageStatus(2),
          exercise: "ایجاد چک‌لیست ارزیابی ایده بر اساس معیارهای آموخته‌شده",
          checklist: [
            "تعریف مشکل واقعی و قابل حل",
            "بررسی امکان استفاده از AI",
            "ارزیابی بازار هدف و تقاضا"
          ],
          videoTitle: "ویژگی‌های ایده پول‌ساز",
          videoDuration: "38:07",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az2sth1.mp4",
          prompts: [
            "می‌خوام یک چک‌لیست کاملاً شخصی‌سازی‌شده برای غربال ایده‌های AI داشته باشم، بر اساس موقعیت و توانایی‌های من.\n\n🔹 حوزه مورد علاقه‌م: [مثلاً آموزش، سلامت، مشاوره]\n🔹 هدف من: ساخت یک سرویس پول‌ساز با کمک AI\n🔹 منابع فعلی: [مثلاً زمان متوسط، دسترسی به GPT، تجربه تولید محتوا]\n\nلطفاً یک چک‌لیست ۴ تا ۶ معیاری برایم طراحی کن که بتونم باهاش ایده‌هام رو فیلتر کنم و فقط ایده‌هایی که ارزش اجرا دارن رو نگه دارم.\n\nبرای هر معیار:\n✔️ عنوان بده\n✔️ تعریف کاربردی\n✔️ روش امتیازدهی ۱ تا ۵\n✔️ حداقل امتیاز برای عبور از فیلتر",
            "سه ایده دارم و می‌خوام بدونم کدوم‌یکی ارزش ادامه داره. لطفاً براساس این ۴ معیار به هر کدوم از ۱ تا ۵ امتیاز بده و تحلیل کن:\n\n۱. نیاز فوری در بازار\n۲. قابلیت اجرا با AI\n۳. مزیت شخصی من\n۴. قابلیت مقیاس‌پذیری\n\nایده اول: [توضیح کامل]\nایده دوم: [توضیح کامل]\nایده سوم: [توضیح کامل]\n\nدر پایان، بگو کدوم ایده مناسب‌ترینه برای شروع و چرا.",
            "می‌خوام این ایده رو عمیق بررسی کنیم تا مطمئن شم ارزش ادامه دادن داره:\n\n💡 ایده: [توضیح کامل]\n\nلطفاً این ۴ معیار رو بررسی کن و امتیاز بده:\n۱. نیاز فوری در بازار → چه شواهدی برای وجود تقاضای واقعی هست؟\n۲. آیا اجرای این ایده با AI واقعاً امکان‌پذیره؟ (با ابزارهای موجود)\n۳. مزیت من چیه که باعث می‌شه از رقبا جلوتر باشم؟\n۴. آیا این ایده برای ۱۰۰ مشتری هم جواب می‌ده یا محدود می‌مونه؟\n\nدر نهایت بگو این ایده رو باید حفظ کنم، تغییر بدم یا کنار بذارم.",
            "برای این ایده، فقط می‌خوام بررسی کنیم آیا \"نیاز فوری در بازار\" داره یا نه:\n\nایده: [توضیح کامل]\n\nلطفاً بررسی کن:\n۱. آیا الآن کسی داره برای این مشکل پول می‌ده؟\n۲. این مشکل چقدر آزاردهنده و حیاتی هست برای مخاطب؟\n۳. رقبای موجود برای این مشکل چه راه‌حل‌هایی دادن؟\n\nدر پایان بهم بگو امتیاز نیاز فوری از ۱ تا ۵ چند می‌شه و چرا.",
            "احساس می‌کنم همه ایده‌هام خوبن و نمی‌دونم کدوم رو حذف کنم. ذهنم شلوغه.\n\nکمکم کن با ۴ سؤال ساده بفهمم آیا دارم منطقی انتخاب می‌کنم یا صرفاً به همه ایده‌ها وابسته‌م. سؤالاتت باید کمک کنه اولویت‌ها رو روشن کنم و با جرأت بتونم ایده‌های ضعیف رو کنار بذارم.\n\nبعدش کمکم کن یک تمرین اجرا کنم که فقط یک ایده رو انتخاب کنم برای ادامه."
          ]
        },
        {
          id: 3,
          title: "تولید ایده‌های شخصی‌سازی‌شده با کمک GPT",
          description: "استفاده از GPT برای تولید ایده‌های منحصر به فرد",
          status: getStageStatus(3),
          exercise: "تولید ۱۰ ایده کسب‌وکار با استفاده از پرامپت‌های GPT",
          checklist: [
            "نوشتن پرامپت موثر برای تولید ایده",
            "تولید حداقل ۱۰ ایده متنوع",
            "دسته‌بندی ایده‌ها بر اساس حوزه کاری"
          ],
          videoTitle: "تولید ایده شخصی سازی شده با هوش مصنوعی",
          videoDuration: "44:32",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az3sth1.mp4",
          prompts: [
            "می‌خوام چند ایده قابل اجرا و پول‌ساز برای شروع کسب‌وکار با کمک هوش مصنوعی داشته باشم.\n\n🔹 مهارت‌هام: [مثلاً: نویسندگی، طراحی، کوچینگ]\n🔹 علاقه‌هام: [مثلاً: آموزش، سلامت، روان‌شناسی]\n🔹 محدودیت‌ها: [مثلاً: بودجه کم، زمان روزانه محدود]\n🔹 ابزارهایی که بلدم یا دارم: [مثلاً: ChatGPT، Canva، Notion]\n\nبا توجه به این اطلاعات، لطفاً ۵ ایده ساده، قابل اجرا با AI و کم‌هزینه بهم پیشنهاد بده.\nبرای هر ایده، توضیح بده:\n۱. دقیقاً چه مشکلی رو حل می‌کنه؟\n۲. برای چه گروهی مناسبه؟\n۳. چطور اجرا می‌شه (با کدوم ابزارها)؟\n۴. چرا فکر می‌کنی این ایده برای من خوبه؟",
            "این پرامپتیه که نوشتم برای تولید ایده‌های AI:\n\n\"[پرامپت خام کاربر]\"\n\nبه‌عنوان یک مشاور حرفه‌ای GPT، لطفاً همین پرامپت رو بازنویسی کن تا:\n✔️ دقیق‌تر\n✔️ دارای جزئیات بیشتر\n✔️ قابل درک برای GPT\n✔️ و دارای قالب خروجی مشخص\n\nدر نهایت کمکم کن یه خروجی خیلی بهتر بگیرم.",
            "من نمی‌خوام ایده‌های تکراری مثل \"تولید محتوا با GPT\" یا \"ترجمه متن با هوش مصنوعی\".\nبه‌عنوان یک متخصص GPT، لطفاً ۳ ایده جدید و خلاق پیشنهاد بده که:\n\n✔️ کمتر شنیده شده باشن\n✔️ مشکلی واقعی رو حل کنن\n✔️ با ابزارهای رایج AI قابل اجرا باشن\n✔️ منطبق با علاقه‌م به [مثلاً توسعه فردی + آموزش + تولید محتوا]\n\nبرای هر ایده یک پاراگراف توضیح بده که چرا خاصه.",
            "می‌خوام چند ایده بسازم که هم با شخصیت من هماهنگ باشه، هم بازار هدف خاصی رو هدف بگیره.\n\n🔹 سبک شخصیت من: [مثلاً: آرام، تحلیل‌گر، دوست‌دار نوشتن]\n🔹 بازار هدفی که علاقه دارم: [مثلاً کوچ‌های تازه‌کار، دانشجوها، کلینیک‌ها]\n\nبر اساس این دو عامل، لطفاً ۳ ایده پیشنهاد بده که قابل اجرا با AI باشن و برای این بازار هدف واقعاً ارزش‌آفرین باشن.",
            "۳ ایده رو انتخاب کردم اما هنوز نمی‌دونم کدوم رو شروع کنم. لطفاً هر ایده رو با این ۵ معیار ارزیابی کن و امتیاز بده:\n\n۱. علاقه واقعی به موضوع\n۲. مهارت یا توان یادگیری برای اجرا\n۳. پتانسیل درآمدزایی\n۴. سرعت رسیدن به درآمد اولیه\n۵. مقیاس‌پذیری (برای بیش از ۱۰۰ نفر)\n\nبعد از امتیازدهی، تحلیل نهایی بده که کدوم ایده بهترین انتخاب برای شروعه.",
            "یکی از ایده‌هایی که انتخاب کردم اینه: [توضیح ایده]\n\nمی‌خوام یه تصویر مفهومی براش بسازم با Midjourney یا Canva. لطفاً کمکم کن یک پرامپت تصویری بنویسم که این موارد رو دربر بگیره:\n\n✔️ سبک تصویر (مدرن، دیجیتال، نیمه‌واقعی)\n✔️ فضای اجرا (مثلاً کلینیک، موبایل، کامپیوتر)\n✔️ ابزارهای مرتبط (مثلاً چت‌بات، داشبورد)\n✔️ حس کلی (مثلاً آینده‌نگر، ساده، هوشمندانه)\n\nدر پایان یه پرامپت تصویری برای Midjourney هم بده."
          ]
        },
        {
          id: 4,
          title: "مقایسه و انتخاب ایده نهایی",
          description: "روش‌های علمی مقایسه و انتخاب بهترین ایده",
          status: getStageStatus(4),
          exercise: "مقایسه ۳ ایده برتر با ماتریس تصمیم‌گیری",
          checklist: [
            "ایجاد ماتریس مقایسه ایده‌ها",
            "امتیازدهی بر اساس معیارهای تعریف‌شده",
            "انتخاب ایده نهایی با دلیل"
          ],
          videoTitle: "مقایسه و انتخاب ایده نهایی",
          videoDuration: "19:23",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az4ath1.mp4",
          prompts: [
            "می‌خوام بین چند ایده‌م تصمیم نهایی بگیرم. لطفاً برام یک جدول حرفه‌ای طراحی کن که بتونم این ایده‌ها رو بر اساس ۴ معیار اصلی مقایسه کنم:\n\nایده‌ها:\n۱. [عنوان ایده اول]\n۲. [عنوان ایده دوم]\n۳. [عنوان ایده سوم]\n\nمعیارها:\n✅ نیاز فوری در بازار\n✅ قابلیت اجرا با AI\n✅ مزیت شخصی\n✅ پتانسیل رشد و مقیاس‌پذیری\n\nبرای هر مورد، جدول امتیاز از ۱ تا ۱۰ داشته باشه و در پایان جمع کل و تحلیل نهایی. اگر دو ایده امتیاز نزدیک داشتن، به من کمک کن براساس شهود و احساس هم تصمیم بگیرم.",
            "من بین چند ایده موندم که امتیازشون تقریباً برابره. حالا می‌خوام بر اساس احساس و معنا تصمیم بگیرم.\n\nبرای هر ایده این ۳ سؤال رو ازم بپرس و کمکم کن تحلیل کنم:\n۱. کدوم ایده بیشتر منو هیجان‌زده می‌کنه؟\n۲. اگه این ایده شکست بخوره، باز هم ارزش تلاشش رو داره؟\n۳. کدوم ایده با اهداف بلندمدت و ارزش‌هام هم‌راستاست؟\n\nدر نهایت کمکم کن این احساسات رو با داده‌های مرحله قبلی ترکیب کنم و به یک انتخاب قطعی برسم.",
            "ذهنم پر از ایده‌ست و نمی‌دونم کدوم رو انتخاب کنم. هر بار که مقایسه می‌کنم، می‌گم شاید بهتره بیشتر فکر کنم و هیچ‌کاری نمی‌کنم.\n\nکمکم کن بفهمم آیا دچار فلج تحلیلی شدم؟ اگه آره، چه اقدام فوری باید بکنم؟\n\nمی‌خوام تو نقش یه مربی اجرایی وارد بشی و بر اساس شخصیت من، یه استراتژی مشخص بهم بدی برای خروج از این سردرگمی. حتی اگه شده با قانون ۲۴ ساعت یا ساخت نمونه اولیه.",
            "ایده‌هام رو امتیاز دادم ولی مطمئن نیستم نمره‌هام دقیق بوده. لطفاً تحلیل کن و بگو کدوم رو ادامه بدم.\n\nایده ۱:\nنیاز بازار: ۸\nAI: ۷\nمزیت شخصی: ۹\nمقیاس‌پذیری: ۵\n\nایده ۲:\nنیاز بازار: ۹\nAI: ۶\nمزیت شخصی: ۵\nمقیاس‌پذیری: ۹\n\nدر مجموع به نظرت کدوم ایده بهتره؟ اگر هم ترکیبی از دو ایده ممکنه، پیشنهاد بده.",
            "فرض کن من در حال مشاوره با یک کوچ باتجربه هستم که کمکم می‌کنه بین ۳ ایده تصمیم نهایی بگیرم.\n\nتوی نقش اون کوچ، باهام مکالمه کن و با پرسیدن سؤالات هدفمند کمکم کن:\n\n۱. از حالت سردرگمی بیام بیرون\n۲. با اعتمادبه‌نفس یک ایده رو انتخاب کنم\n۳. بدون ترس از دست‌دادن بقیه، برم برای ساخت نسخه اولیه\n\nدر انتها با لحن انگیزشی بگو تصمیم‌گیریم درسته و وقت اجراست.",
            "من ایده‌م رو انتخاب کردم و حالا می‌خوام وارد فاز اجرایی بشم. لطفاً کمکم کن این ۳ مورد رو برایش بنویسم:\n\n۱. تعریف شفاف ایده (چه مشکلی رو برای چه کسی حل می‌کنه؟)\n۲. ساده‌ترین نسخه‌ای که می‌تونم همین هفته بسازم\n۳. اولین کاری که فردا باید انجام بدم تا وارد عمل شم\n\nمی‌خوام این خروجی رو به عنوان مقدمه ورود به مرحله بعد استفاده کنم."
          ]
        },
        {
          id: 5,
          title: "پیش‌نمایش سرویس",
          description: "تعریف دقیق مشکل و راه‌حل پیشنهادی",
          status: getStageStatus(5),
          exercise: "نوشتن پروپوزال یک‌صفحه‌ای برای ایده انتخاب‌شده",
          checklist: [
            "تعریف مشکل اصلی",
            "توضیح راه‌حل پیشنهادی",
            "مشخص کردن مزیت رقابتی"
          ],
          videoTitle: "پیش‌نمایش سرویس",
          videoDuration: "20:22",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az5sth1.mp4",
          prompts: [
            "می‌خوام سرویسم رو طراحی کنم و به ۴ سؤال طلایی پاسخ بدم. اطلاعات کلی من:\n\n🔹 ایده: [اینجا ایده‌ت رو کامل بنویس]\n\nبرام کمک کن به این سؤالات واضح، دقیق و حرفه‌ای جواب بدم:\n۱. مشکل اصلی چیه که این سرویس قراره حلش کنه؟\n۲. مشتری دقیقاً کیه؟ (با ذکر ویژگی‌های شغلی، فردی و نیازها)\n۳. راه‌حل من چیه؟ چطور این مشکل رو حل می‌کنم؟\n۴. خروجی ملموس این سرویس چیه؟ مشتری در نهایت چی تحویل می‌گیره؟\n\nپاسخ‌هامو ساختار بده طوری که بتونم همینو به مشتری یا تیم بدم.",
            "یه ایده خام دارم ولی نمی‌دونم چطوری سرویسش کنم. این ایده‌مه:\n\n\"[توضیح اولیه از ایده]\"\n\nکمکم کن اینو بازنویسی کنی طوری که تبدیل بشه به یک سرویس واقعی با ساختار زیر:\n🔹 مشکل اصلی\n🔹 مشتری هدف\n🔹 راه‌حل پیشنهادی\n🔹 خروجی نهایی\n\nهمه چیز باید حرفه‌ای، واضح، بدون اغراق و آماده برای اجرا باشه.",
            "می‌خوام برای سرویسی که طراحی کردم یه اسم انتخاب کنم.\n\n🔹 موضوع کلی سرویس: [مثلاً تولید محتوا برای کوچ‌ها]\n🔹 مشتری هدف: [مثلاً کوچ‌های تازه‌کار یا کلینیک‌ها]\n🔹 ارزش کلیدی سرویس: [مثلاً صرفه‌جویی در زمان، خروجی آماده، افزایش اعتماد]\n\nلطفاً ۳ پیشنهاد اسم بده که:\n✔️ ساده و قابل یادآوری باشه\n✔️ حرفه‌ای و قابل برند شدن باشه\n✔️ در ذهن مشتری تصویر درست بسازه\n\nبرای هر اسم، یک جمله دلیل انتخابش رو هم بگو.",
            "می‌خوام برای صفحه معرفی یا پروفایل فروش خودم یه توصیف دقیق از سرویسم بنویسم.\n\n🔹 سرویسم چیه: [توضیح سرویس]\n🔹 چه مشکلی رو حل می‌کنه: [مشکل اصلی]\n🔹 مشتری هدف کیه: [توضیح مخاطب]\n\nبر اساس این اطلاعات، لطفاً یه متن معرفی ۲ جمله‌ای بنویس که حرفه‌ای، شفاف و قانع‌کننده باشه.",
            "می‌خوام مطمئن شم که سرویسم آماده تست اولیه‌ست.\n\n🔹 ایده‌م اینه: [شرح سرویس و مراحلش]\n\nکمکم کن بررسی کنیم:\n✅ آیا مشکل رو دقیق تعریف کردم؟\n✅ آیا مشتری هدف واقعاً مشخصه یا کلیه؟\n✅ آیا خروجی نهایی برای مشتری ملموسه؟\n✅ آیا اجرای این سرویس واقعاً با AI ممکنه؟\n\nاگه جایی گنگ یا ناقصه، مشخص کن تا اصلاحش کنم.",
            "می‌خوام مشتری هدف سرویسم رو خیلی دقیق‌تر بشناسم. اطلاعات کلی سرویس من اینه:\n\n🔹 مشکل: [مثلاً تولید محتوای سریع برای مشاور]\n🔹 راه‌حل: [مثلاً بسته محتوای آماده با کمک GPT]\n\nکمکم کن یک \"پروفایل مشتری\" بسازم با این بخش‌ها:\n✔️ سن، شغل، سطح مهارت\n✔️ دغدغه‌ها و مشکلات روزانه\n✔️ هدف یا انگیزه اصلی برای خرید\n✔️ پلتفرم‌هایی که استفاده می‌کنه\n✔️ عباراتی که خودش برای توصیف مشکلش استفاده می‌کنه\n\nهمه اینا باید واقعی و قابل استفاده برای بازاریابی باشه."
          ]
        }
      ]
    },
    {
      id: 2,
      title: "ساخت سرویس اولیه و پیشنهاد درآمد سریع",
      subtitle: "",
      description: "تبدیل ایده به محصول قابل تست و دریافت بازخورد اولیه",
      goal: "ساخت نسخه اولیه قابل استفاده و تست آن روی مشتریان واقعی",
      icon: <Rocket className="w-6 h-6" />,
      color: "text-orange-600",
      gradient: "from-[#2c189a] to-[#5a189a]",
      isUnlocked: true, // TODO: بعداً برای قفل کردن به false تغییر بده

      stages: [
        {
          id: 6,
          title: "طراحی سرویس واقعی با AI (شامل اسم، شعار و موقعیت برند)",
          description: "طراحی ساختار، خدمات و تجربه کاربری سرویس",
          status: getStageStatus(6),
          exercise: "طراحی blueprint کامل سرویس با GPT",
          checklist: [
            "تعریف ویژگی‌های اصلی سرویس",
            "طراحی فرآیند ارائه خدمات",
            "مشخص کردن نقاط تماس با مشتری"
          ],
          videos: [
            {
              title: "طراحی سرویس با AI - قسمت اول",
              duration: "30:00",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1za6sth2.mp4"
            },
            {
              title: "طراحی سرویس با AI - قسمت دوم",
              duration: "23:30",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video2az6sth2.mp4"
            }
          ],
          prompts: [
            "تو یک متخصص برندینگ هستی.\n\n۵ اسم خلاقانه برای برند من بساز که مربوط به یک سرویس دیجیتال مبتنی بر هوش مصنوعی باشه.\nاین سرویس قراره [توضیح سرویس خودتو اینجا بنویس].\n\nاسم‌ها باید:\n– کوتاه و راحت‌الحفظ باشن\n– راحت تایپ و تلفظ بشن\n– با حوزه کاری یا مشکل مشتری مرتبط باشن\n– قابلیت برند شدن در آینده رو داشته باشن\n\nاسم‌ها رو به‌صورت لیست بنویس و زیر هر اسم، یه جمله توضیح بده که چرا انتخابش کردی.",
            "تو یک کپی‌رایتر حرفه‌ای هستی.\n\n۵ شعار (تگ‌لاین) برای برند من بنویس که سرویس [توضیح کوتاه سرویس] رو ارائه می‌ده.\nشعارها باید:\n\n– کمتر از ۱۰ کلمه باشن\n– ساده، قابل حفظ و تاثیرگذار باشن\n– به ارزش یا نتیجه‌ای که سرویس به مخاطب می‌ده اشاره کنن\n\nبرای هر شعار، یه جمله کوتاه هم بنویس که بگه منظورش چیه یا چه احساسی می‌سازه.",
            "می‌خوام یک پیام موقعیت‌یابی قوی برای برندم بنویسی.\n\nاول این ۴ سؤال رو ازم بپرس:\n۱. مخاطب هدف کیه؟\n۲. مشکل اصلی اون‌ها چیه؟\n۳. راه‌حل من چه فرقی با بقیه داره؟\n۴. نتیجه یا تغییری که مخاطب با این سرویس تجربه می‌کنه چیه؟\n\nبعد از اینکه جواب دادم، ۳ نسخه پیام برند برای من بنویس که این ۴ بخش رو داشته باشه:\n– مخاطب دقیق\n– مشکلی که حل می‌کنم\n– تمایز سرویس من\n– نتیجه نهایی برای مشتری\n\nلحن پیام باید ساده، واضح، و اعتمادساز باشه."
          ]
        },
        {
          id: 7,
          title: "ساخت نسخه اولیه (MVP) و تست با بازار کوچک",
          description: "پیاده‌سازی کمترین ویژگی‌های قابل تست و دریافت بازخورد",
          status: getStageStatus(7),
          exercise: "ساخت MVP با ابزارهای no-code و تست روی ۳ مشتری",
          checklist: [
            "انتخاب ابزار مناسب ساخت MVP",
            "پیاده‌سازی ویژگی‌های اصلی",
            "تست عملکرد با گروه هدف کوچک"
          ],
          videos: [
            {
              title: "ساخت نسخه اولیه: قسمت اول",
              duration: "38:51",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1az7sth2.mp4"
            },
            {
              title: "ساخت نسخه اولیه: قسمت دوم",
              duration: "51:29",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video2az7sth2.mp4"
            },
            {
              title: "ساخت نسخه اولیه: قسمت سوم",
              duration: "30:44",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video3az7sth2.mp4"
            }
          ],
          prompts: [
            "من می‌خوام برای تست اولیه یک سرویس GPTمحور، یه فرم ساده طراحی کنم. لطفاً ۵ سؤال مهم و کاربردی بهم بده که کمک کنن بفهمم: ۱) مشکل اصلی مخاطب چیه ۲) الان چطور اون مشکل رو حل می‌کنه ۳) انتظارش از این سرویس چیه ۴) چه خروجی‌ای براش ایده‌آله ۵) آیا حاضر بود براش هزینه کنه یا نه\n\nموضوع سرویس من اینه: [اینجا توضیح کوتاه سرویس رو بذار]\n\nسؤال‌ها باید:\n\nساده، قابل فهم و مستقیم باشن\nزیر ۲۰ کلمه باشن\nبشه در فرم آنلاین استفاده‌شون کرد",
            "می‌خوام یک پیام کوتاه واتساپی بنویسم تا تست‌کننده هدف رو برای تست MVP سرویسم دعوت کنم.پیام باید قانع‌کننده، صمیمی ولی حرفه‌ای باشه و خیلی سریع منظورم رو برسونه.لحن دوستانه ولی معتبر باشه",
            "برای تست MVP، می‌خوام یک فرم بازخورد طراحی کنم که هم مختصر باشه هم کاربردی.لطفاً ۵ سؤال مهم و کلیدی طراحی کن که کمک کنه بفهمم محصولم واقعاً مفید بوده یا نه.هر سؤال باید مستقیم، شفاف و بدون سوگیری باشه",
            "برام تحلیل کن چطور باید نتایج تست MVP رو دسته‌بندی و تفسیر کنم.فرض کن بازخوردها متنوع بودن.چطور بفهمم کدوم بازخورد مهمه، فوریه، یا فقط یک نظر شخصیه؟یه مدل تصمیم‌گیری ساده و کاربردی بده.",
            "بر اساس بازخوردهای مرحله تست MVP، کمکم کن سه اقدام کلیدی برای بهبود سرویسم طراحی کنم.می‌خوام این اقدامات هم منطقی باشن، هم قابل اجرا، و هم توی نسخه بعدی سرویس قابل پیاده‌سازی باشن."
          ]
        },
        {
          id: 8,
          title: "معرفی حرفه‌ای سرویس + طراحی پیشنهاد پولی اولیه",
          description: "خلاصه‌سازی سرویس و طراحی نخستین پیشنهاد درآمدزا",
          status: getStageStatus(8),
          exercise: "نوشتن elevator pitch و طراحی پکیج قیمت‌گذاری اولیه",
          checklist: [
            "نوشتن توضیح ۱ پاراگرافی سرویس",
            "طراحی پیشنهاد قیمت‌گذاری",
            "آماده‌سازی پکیج فروش اولیه"
          ],
          videos: [
            {
              title: "معرفی سرویس: قسمت یک",
              duration: "39:07",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1az8sth2.mp4"
            },
            {
              title: "معرفی سرویس: قسمت دو",
              duration: "57:33",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video2az8sth2.mp4"
            }
          ],
          prompts: [
            "من می‌خوام مزیت رقابتی سرویسم رو توی یه جمله ساده، قانع‌کننده و فروشنده‌ساز بنویسی.\n\nساختار جمله به این صورته:\n\n«من به [مخاطب هدف] کمک می‌کنم تا [نتیجه‌ی ارزشمند]، بدون [مشکل رایج]، با استفاده از [روش خاص من]»\n\nسرویس من اینه: [اینجا سرویس و جزئیاتش رو وارد کن]\n\nلطفاً چند نسخه مختلف از این جمله به من بده که حرفه‌ای، دقیق، و قابل استفاده برای ارائه یا صفحه فروش باشه. لحن جمله‌ها باید ساده، واضح و قانع‌کننده باشه، طوری که مشتری بگه: \"دقیقاً همینه که می‌خواستم!\"",
            "فرض کن سرویس من [مثلاً: تولید کپشن اینستاگرام با AI + تحلیل پیج].با در نظر گرفتن و تمرکز بر منفعت مشتری ، کمکم کن مزیت رقابتی واقعی و قابل اثباتی برای این سرویس پیدا کنم. حتماً تحلیل بده چرا این مزیت ارزشمنده.",
            "مزیت رقابتی سرویسم اینه که [مثلاً: خروجی سریع دارم یا فرم ساده دارم].کمکم کن بفهمم چطور این مزیت رو توی فرم، مراحل اجرا یا نوع خروجی طوری نشون بدم که برای مشتری ملموس‌تر و قانع‌کننده‌تر باشه. اگه بشه، چند نمونه جمله یا پیشنهاد اجرایی بده",
            "«برای سرویس [نوع سرویس] من برای [مخاطب هدف]، یک فهرست کامل تحویل‌ها شامل: تحویل‌های شماره‌دار، پشتیبانی، ۲ هدیه، زمان تحویل و گارانتی ایجاد کن.»",
            "«برای [نوع سرویس] من، سه بسته قیمتی پایه/پیشنهادی/حرفه‌ای طراحی کن. ارزش واقعی هر بسته را مشخص کن و دلیل منطقی برای تخفیف فعلی و محدودیت ظرفیت ارائه بده.»",
            "«این متن‌های 'قبل' را به نسخه 'بعدِ نتیجه‌محور' تبدیل کن: [متن‌های قبل]»",
            "من می‌خوام یه پیام متنی حرفه‌ای و قانع‌کننده برای معرفی سرویسم بنویسی. این پیام قراره در واتساپ یا دایرکت اینستاگرام به مخاطب ارسال بشه تا سرویسم رو بخره.\n\nلطفاً پیام رو طوری بنویس که: – مخاطب هدف (مثل مربی بدنسازی، کوچ، پیج فروشگاهی و...) رو جذب کنه– نتیجه ملموس سرویس رو شفاف نشون بده– مزیت رقابتی سرویس برجسته بشه– قیمت‌گذاری قانع‌کننده باشه (مثلاً نسخه تست با ظرفیت محدود)– کال‌تو‌اکشن واضح و دوستانه داشته باشه\n\n اطلاعات من: مخاطب هدف: [مثلاً: مربی بدنسازی با پیج اینستاگرام]سرویس من: [مثلاً: تولید محتوای ۵ پست آماده + کپشن فروشنده + تحلیل پیج]زمان تحویل: [مثلاً: ۷۲ ساعت]قیمت تستی: [مثلاً: ۳۹۰ هزار تومان]\n\nye پیام بنویس که ساده، حرفه‌ای و انگیزه‌بخش باشه؛ جوری که مخاطب نتونه مقاومت کنه."
          ]
        }
      ]
    },
    {
      id: 3,
      title: "ساخت برند سریع و مؤثر",
      subtitle: "",
      description: "ایجاد هویت برند قوی که اعتماد مشتریان را جلب کند",
      goal: "طراحی هویت برند کامل که در ذهن مشتریان ماندگار باشد",
      icon: <Palette className="w-6 h-6" />,
      color: "text-purple-600",
      gradient: "from-[#2c189a] to-[#5a189a]",
      isUnlocked: true, // TODO: بعداً برای قفل کردن به false تغییر بده

      stages: [
        {
          id: 9,
          title: "طراحی داستان برند و پیام احساسی برای فروش",
          description: "ایجاد داستان جذاب و پیام احساسی که مشتریان را تحت تأثیر قرار می‌دهد",
          status: getStageStatus(9),
          exercise: "نوشتن داستان برند و پیام‌های کلیدی احساسی",
          checklist: [
            "تعریف داستان پشت برند",
            "شناسایی احساسات هدف",
            "نوشتن پیام‌های احساسی کلیدی"
          ],
          videos: [
            {
              title: "طراحی داستان برند - قسمت اول",
              duration: "18:50",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1az9sth3.mp4"
            },
            {
              title: "طراحی داستان برند - قسمت دوم",
              duration: "33:03",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video2az9sth3.mp4"
            },
            {
              title: "طراحی داستان برند - قسمت سوم",
              duration: "35:56",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video3az9sth3.mp4"
            }
          ],
          prompts: [
            "من صاحب یک سرویس هستم که به [مخاطب هدف] کمک می‌کنه [مشکل یا درد اصلی مخاطب] رو حل کنه.\nلطفاً با استفاده از فرمول داستان برند (مشکل اولیه → جرقه یا تصمیم → نتیجه ملموس)، یک روایت کوتاه، الهام‌بخش و احساسی برای معرفی برند من بنویس.\nلحن: واقعی، دوستانه، قانع‌کننده.\nدر نهایت، یک جمله ۷ تا ۱۰ کلمه‌ای به عنوان پیام احساسی برند بده که بتونم توی پیجم یا پروفایلم بذارم."
          ]
        },
        {
          id: 10,
          title: "طراحی حداقل نسخه برند (رنگ، فونت، شخصیت) با AI",
          description: "تعریف ویژگی‌های بصری و شخصیتی برند با کمترین پیچیدگی",
          status: getStageStatus(10),
          exercise: "ایجاد Style Guide مینیمال برند",
          checklist: [
            "انتخاب پالت رنگی اصلی",
            "تعیین فونت‌های اصلی",
            "تعریف شخصیت برند"
          ],
          videoTitle: "طراحی هویت بصری برند",
          videoDuration: "38:50",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az10sth3.mp4",
          prompts: [
            "تو نقش یه استراتژیست برند حرفه‌ای هستی.\nبر اساس این توضیح برند من: «[توضیح برند و مخاطب هدف]»\nسه صفت پیشنهاد بده که شخصیت برند من رو نشون بده:\nیک صفت ذهنی + یک صفت رفتاری + یک صفت احساسی\nجوابت فقط همون سه کلمه باشه.",
            "برای برند با شخصیت [۳ کلمه] و صنعت [نیش]، یه ۳ فونت فارسی پیشنهاد بده:\n\n- فونت تیتر + فونت متن\n- دلیل انتخاب\n- کاربرد هر کدوم \n- راهنمای وزن (Bold/Regular) و فاصله خط\n\nاگر فونت در دسترس نبود، معادل رایگان و قابل‌دسترس معرفی کن."
          ]
        },
        {
          id: 11,
          title: "طراحی لوگو و گرافیک سریع برای شروع فروش",
          description: "ساخت المان‌های بصری ضروری برند برای شروع فروش",
          status: getStageStatus(11),
          exercise: "طراحی بسته کامل بصری برند",
          checklist: [
            "طراحی لوگو با Midjourney",
            "ساخت آواتار و آیکون",
            "تولید قالب‌های گرافیکی"
          ],
          videoTitle: "طراحی لوگو و گرافیک با AI",
          videoDuration: "14:16",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video11az11sth3.mp4"
        }
      ]
    },
    {
      id: 4,
      title: "ماشین رشد مخاطب",
      subtitle: "",
      description: "تبدیل پیج به ماشین رشد با استراتژی محتوا و تعامل هدفمند؛ مسیری برای جذب مداوم و ساختن اعتماد.",
      goal: "طراحی نقشه رشد و اجرای سیستمی که فالوئر سرد رو به مشتری واقعی تبدیل کنه.",
      icon: <Users className="w-6 h-6" />,
      color: "text-indigo-600",
      gradient: "from-[#2c189a] to-[#5a189a]",
      isUnlocked: true, // TODO: بعداً برای قفل کردن به false تغییر بده

      stages: [
        {
          id: 12,
          title: "پایه‌گذاری پیج روی شناخت مخاطب",
          description: "راه‌اندازی پیج اینستاگرام حرفه‌ای برای جذب مخاطب هدف",
          status: getStageStatus(12),
          exercise: "راه‌اندازی و بهینه‌سازی پیج اینستاگرام",
          checklist: [
            "تنظیم اکانت بیزنس اینستاگرام",
            "بهینه‌سازی نام و بایو",
            "آپلود محتوای اولیه جذاب"
          ],
          videos: [
            {
              title: "پایه‌گذاری پیج روی شناخت مخاطب - قسمت اول",
              duration: "14:14",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1az12sth4.mp4"
            },
            {
              title: "پایه‌گذاری پیج روی شناخت مخاطب - قسمت دوم",
              duration: "22:28",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video2az12sth4.mp4"
            },
            {
              title: "پایه‌گذاری پیج روی شناخت مخاطب - قسمت سوم",
              duration: "11:09",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video3az12sth4.mp4"
            },
            {
              title: "پایه‌گذاری پیج روی شناخت مخاطب - قسمت چهارم",
              duration: "25:09",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video4as12sth4.mp4"
            }
          ],
          prompts: [
            "«برای سرویس [ایده من] چند گروه مخاطب پیشنهاد بده + نیاز، مشکل، توانایی پرداخت.»",
            "«از بین این گروه‌ها[اسمای گروه ها] بگو کدوم بهترین گزینه برای شروعه (نیاز فوری، تمایل به پرداخت، دسترسی آسان).»",
            "«برای گروه [انتخاب شده] یک پرسونای دقیق بساز: اطلاعات پایه، نیازها، ترس‌ها، آرزوها، موانع خرید، کانال‌های محتوایی.»",
            "«بر اساس این پرسونای مخاطب، بده: ۵ جمله قانع‌کننده، لحن مناسب، موضوعات جذاب، یک پیام یک‌جمله‌ای به زبان خودش.»",
            "«من به [مخاطب] کمک می‌کنم [نیاز اصلی] رو برطرف کنه، بدون [ترس/مانع]، با [مزیت من].»"
          ]
        },
        {
          id: 13,
          title: "تولید محتوای اعتمادساز و مداوم",
          description: "بهینه‌سازی المان‌های کلیدی پروفایل برای تبدیل",
          status: getStageStatus(13),
          exercise: "طراحی ۵ هایلایت و بایو جذاب با AI",
          checklist: [
            "نوشتن بایو کانورت کننده با AI",
            "طراحی کاور هایلایت‌ها",
            "تنظیم link in bio حرفه‌ای"
          ],
          videos: [
            {
              title: "تولید محتوای اعتماد ساز و مداوم: قسمت یک",
              duration: "25:14",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1az13sth4.mp4"
            },
            {
              title: "تولید محتوای اعتماد ساز و مداوم: قسمت دو",
              duration: "61:53",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video2as13sth4.mp4"
            },
            {
              title: "تولید محتوای اعتماد ساز و مداوم: قسمت سه",
              duration: "12:23",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video3as13sth4.mp4"
            },
            {
              title: "تولید محتوای اعتماد ساز و مداوم: قسمت چهار",
              duration: "18:35",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video4as13sth4.mp4"
            }
          ]
        },
        {
          id: 14,
          title: "جذب، تعامل هدفمند و تبدیل",
          description: "ایجاد محتوای آموزشی و اعتمادساز با GPT",
          status: getStageStatus(14),
          exercise: "تولید ۱۰ پست و ۲۰ استوری اعتمادساز",
          checklist: [
            "برنامه‌ریزی calendar محتوا",
            "تولید کپشن‌ها با GPT",
            "انتشار در کانال مکمل"
          ],
          videos: [
            {
              title: "تولید محتوا با AI - قسمت اول",
              duration: "17:19",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1as14sth4.mp4"
            },
            {
              title: "استراتژی تعامل هدفمند - قسمت دوم",
              duration: "08:18",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video2as14sth4.mp4"
            }
          ]
        }
      ]
    },
    {
      id: 5,
      title: "زیرساخت آنلاین و ابزارهای چندکاناله",
      subtitle: "",
      description: "ایجاد حضور آنلاین قوی برای جذب مشتری",
      goal: "راه‌اندازی پلتفرم‌های دیجیتال برای معرفی و فروش سرویس",
      icon: <Globe className="w-6 h-6" />,
      color: "text-blue-600",
      gradient: "from-[#2c189a] to-[#5a189a]",
      isUnlocked: true, // TODO: بعداً برای قفل کردن به false تغییر بده

      stages: [
        {
          id: 15,
          title: "راه‌اندازی صفحه فرود حرفه‌ای برای جذب چندکاناله",
          description: "ساخت صفحه فرود جذاب برای تبدیل بازدیدکنندگان به مشتری",
          status: getStageStatus(15),
          exercise: "طراحی و راه‌اندازی صفحه فرود با ابزارهای no-code",
          checklist: [
            "انتخاب پلتفرم ساخت صفحه فرود",
            "طراحی محتوا و CTA های مؤثر",
            "تنظیم tracking و آنالیتیکس"
          ],
          videos: [
            {
              title: "طراحی صفحه فرود حرفه‌ای - قسمت 1",
              duration: "41:41",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1as15sth5.mp4"
            },
            {
              title: "طراحی صفحه فرود حرفه‌ای - قسمت 2",
              duration: "78:37",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video2as15sthe5.mp4"
            }
          ]
        },
        {
          id: 16,
          title: "اتصال سیستم پرداخت و درگاه امن",
          description: "راه‌اندازی سیستم پرداخت آنلاین برای دریافت پول",
          status: getStageStatus(16),
          exercise: "تنظیم درگاه پرداخت و اتصال به صفحه فروش",
          checklist: [
            "انتخاب درگاه پرداخت مناسب",
            "اتصال به سیستم فروش",
            "تست کامل فرآیند پرداخت"
          ],
          videos: [
            {
              title: "راه‌اندازی سیستم پرداخت - قسمت 1",
              duration: "20:53",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1as16sthe5+.mp4"
            },
            {
              title: "راه‌اندازی سیستم پرداخت - قسمت 2",
              duration: "3:59",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/vido2as16sthe4.mp4"
            }
          ]
        },
        {
          id: 17,
          title: "آماده‌سازی کانال‌های پشتیبانی و اولین کانال جذب مکمل",
          description: "ایجاد سیستم پشتیبانی مشتری و کانال جذب مشتری",
          status: getStageStatus(17),
          exercise: "راه‌اندازی چت، ایمیل و کانال جذب اول",
          checklist: [
            "راه‌اندازی سیستم چت پشتیبانی",
            "تنظیم ایمیل پشتیبانی حرفه‌ای",
            "ایجاد اولین کانال جذب مشتری"
          ],
          videos: [
            {
              title: "راه‌اندازی کانال‌های پشتیبانی",
              duration: "13:16",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1as17sthe5.mp4"
            }
          ]
        }
      ]
    },
    {
      id: 6,
      title: "جذب و تبدیل مشتری",
      subtitle: "",
      description: "استفاده از روش‌های سریع و کم‌هزینه برای جذب مشتری",
      goal: "جذب و تبدیل اولین دسته از مشتریان بالقوه",
      icon: <BarChart3 className="w-6 h-6" />,
      color: "text-green-600",
      gradient: "from-[#2c189a] to-[#5a189a]",
      isUnlocked: true, // TODO: بعداً برای قفل کردن به false تغییر بده

      stages: [
        {
          id: 18,
          title: "پیدا کردن اولین مشتری با روش‌های سریع و کم‌هزینه",
          description: "شناسایی و جذب اولین مشتریان با روش‌های مقرون به صرفه",
          status: getStageStatus(18),
          exercise: "شناسایی و تماس با ۱۰ مشتری بالقوه",
          checklist: [
            "تحلیل بازار هدف",
            "شناسایی مشتریان بالقوه",
            "طراحی استراتژی تماس"
          ],
          videoTitle: "استراتژی‌های جذب مشتری",
          videoDuration: "24:15"
        },
        {
          id: 19,
          title: "طراحی پیشنهاد فروش و اجرای روان‌شناسی خرید",
          description: "طراحی پیشنهاد جذاب و استفاده از روان‌شناسی فروش",
          status: getStageStatus(19),
          exercise: "طراحی ۳ پیشنهاد فروش مختلف",
          checklist: [
            "تحلیل نیازهای مشتری",
            "طراحی پیشنهاد ارزش",
            "پیاده‌سازی روان‌شناسی خرید"
          ],
          videoTitle: "روان‌شناسی فروش",
          videoDuration: "26:30"
        },
        {
          id: 20,
          title: "مکالمه فروش و تبدیل لید به خریدار",
          description: "تکنیک‌های مذاکره و بستن معامله",
          status: getStageStatus(20),
          exercise: "شبیه‌سازی ۵ گفتگوی فروش",
          checklist: [
            "آماده‌سازی اسکریپت فروش",
            "تمرین تکنیک‌های Closing",
            "بستن اولین فروش واقعی"
          ],
          videoTitle: "تکنیک‌های Sales",
          videoDuration: "25:50"
        }
      ]
    },
    {
      id: 7,
      title: "اتوماسیون و اجرای هوشمند",
      subtitle: "",
      description: "اتوماسیون فرآیندهای کسب‌وکار برای افزایش کارایی",
      goal: "ایجاد سیستم‌های خودکار برای مدیریت مشتریان و فروش",
      icon: <Cog className="w-6 h-6" />,
      color: "text-blue-600",
      gradient: "from-[#2c189a] to-[#5a189a]",
      isUnlocked: true, // TODO: بعداً برای قفل کردن به false تغییر بده

      stages: [
        {
          id: 21,
          title: "ساخت سیستم CRM و مدیریت مشتریان",
          description: "راه‌اندازی سیستم مدیریت ارتباط با مشتریان",
          status: getStageStatus(21),
          exercise: "انتخاب و راه‌اندازی CRM مناسب",
          checklist: [
            "انتخاب ابزار CRM مناسب",
            "تنظیم پایگاه داده مشتریان",
            "طراحی فرآیندهای مدیریت"
          ],
          videoTitle: "راه‌اندازی CRM",
          videoDuration: "24:20"
        },
        {
          id: 22,
          title: "اجرای فالوآپ خودکار با ایمیل، واتساپ یا SMS",
          description: "اتوماسیون پیگیری مشتریان با ابزارهای مختلف",
          status: getStageStatus(22),
          exercise: "راه‌اندازی سیستم فالوآپ خودکار",
          checklist: [
            "تنظیم email sequences",
            "اتوماسیون پیام‌های واتساپ",
            "پیاده‌سازی SMS marketing"
          ],
          videoTitle: "اتوماسیون فالوآپ",
          videoDuration: "21:15"
        },
        {
          id: 23,
          title: "طراحی سناریوهای اتوماسیون فروش و خدمات",
          description: "طراحی فرآیندهای خودکار برای فروش و پشتیبانی",
          status: getStageStatus(23),
          exercise: "طراحی workflow های اتوماسیون",
          checklist: [
            "طراحی سناریوهای فروش",
            "اتوماسیون پشتیبانی مشتری",
            "تست و بهینه‌سازی فرآیندها"
          ],
          videoTitle: "طراحی اتوماسیون",
          videoDuration: "26:30"
        }
      ]
    },
    {
      id: 8,
      title: "رشد و مقیاس‌پذیری",
      subtitle: "",
      description: "ایجاد زیرساخت برای scale کردن کسب‌وکار",
      goal: "آماده‌سازی کسب‌وکار برای رشد سریع و پایدار",
      icon: <TrendingUp className="w-6 h-6" />,
      color: "text-emerald-600",
      gradient: "from-[#2c189a] to-[#5a189a]",
      isUnlocked: true, // TODO: بعداً برای قفل کردن به false تغییر بده

      stages: [
        {
          id: 24,
          title: "انتخاب بازار بین‌المللی مناسب",
          description: "شناسایی و انتخاب بازارهای بین‌المللی برای گسترش",
          status: getStageStatus(24),
          exercise: "تحلیل و انتخاب ۳ بازار بین‌المللی",
          checklist: [
            "تحلیل بازارهای هدف",
            "بررسی رقبا و فرصت‌ها",
            "انتخاب بازار اولویت"
          ],
          videoTitle: "استراتژی بین‌المللی",
          videoDuration: "26:40"
        },
        {
          id: 25,
          title: "طراحی زیرساخت تیمی و فنی برای رشد ۱۰ برابری",
          description: "آماده‌سازی سیستم‌ها و تیم برای رشد سریع",
          status: getStageStatus(25),
          exercise: "طراحی architecture قابل scale",
          checklist: [
            "طراحی ساختار تیمی",
            "بهینه‌سازی فرآیندهای فنی",
            "آماده‌سازی سیستم‌های همکاری"
          ],
          videoTitle: "Scaling Systems",
          videoDuration: "23:30"
        },
        {
          id: 26,
          title: "طراحی نقشه رشد ۹۰ روزه با شاخص پیشرفت",
          description: "تدوین برنامه عملیاتی برای ۳ ماه آینده",
          status: getStageStatus(26),
          exercise: "ایجاد roadmap تفصیلی ۹۰ روزه",
          checklist: [
            "تعریف اهداف هر ماه",
            "مشخص کردن KPIهای اصلی",
            "طراحی plan اجرایی هفتگی"
          ],
          videoTitle: "Strategic Planning",
          videoDuration: "29:45"
        }
      ]
    },
    {
      id: 9,
      title: "تثبیت و درآمد پایدار",
      subtitle: "",
      description: "ایجاد سیستم‌های پایدار برای درآمد مداوم",
      goal: "تثبیت کسب‌وکار و ایجاد درآمد پایدار",
      icon: <Target className="w-6 h-6" />,
      color: "text-gray-600",
      gradient: "from-[#2c189a] to-[#5a189a]",
      isUnlocked: true, // TODO: بعداً برای قفل کردن به false تغییر بده

      stages: [
        {
          id: 27,
          title: "سیستم تثبیت فروش و تکرارپذیری درآمد",
          description: "ایجاد سیستم‌های پایدار برای فروش مداوم",
          status: getStageStatus(27),
          exercise: "طراحی سیستم فروش تکرارپذیر",
          checklist: [
            "طراحی سیستم فروش مداوم",
            "ایجاد مکانیزم‌های تکرارپذیری",
            "تست و بهینه‌سازی فرآیندها"
          ],
          videoTitle: "سیستم فروش پایدار",
          videoDuration: "28:15"
        },
        {
          id: 28,
          title: "مدیریت طولانی‌مدت مشتریان و ارتقاء آن‌ها",
          description: "ایجاد سیستم مدیریت مشتریان برای رشد درآمد",
          status: getStageStatus(28),
          exercise: "طراحی استراتژی retention و upsell",
          checklist: [
            "طراحی برنامه وفاداری",
            "استراتژی upsell و cross-sell",
            "سیستم نگهداری مشتریان"
          ],
          videoTitle: "مدیریت مشتریان",
          videoDuration: "25:30"
        },
        {
          id: 29,
          title: "مسیر ادامه رشد و نوآوری با AI",
          description: "طراحی مسیر آینده با استفاده از هوش مصنوعی",
          status: getStageStatus(29),
          exercise: "طراحی نقشه راه آینده با AI",
          checklist: [
            "تحلیل روندهای آینده",
            "طراحی محصولات جدید",
            "استراتژی نوآوری مداوم"
          ],
          videoTitle: "نوآوری با AI",
          videoDuration: "32:20"
        }
      ]
    }
  ];

  // Calculate progress for each level and add it to the final objects
  const levelsWithProgress = levelDefinitions.map(level => ({
    ...level,
    progress: calculateLevelProgress(level.stages)
  }));

  return levelsWithProgress;
};

  // Initialize levels after generateLevels function is defined
  useEffect(() => {
    logger.debug('🔄 Re-generating levels due to userData change:', {
      currentSession: userData.currentSession,
      currentLevel: userData.currentLevel,
      progressOverall: userData.progressOverall,
      completedTasks: userData.completedTasks
    });
    
    const newLevels = generateLevels();
    setLevels([...newLevels]); // Force array update
    logger.debug('✅ Levels updated, progress sample:', newLevels.slice(0, 5).map(l => `Level ${l.id}: ${l.progress}%`));
    
    // Debug: Check if levels state actually updated
    setTimeout(() => {
      logger.debug('🔍 Levels state after update:', levels.slice(0, 3).map(l => `Level ${l.id}: ${l.progress}%`));
    }, 100);
  }, [userData.currentSession, userData.progressOverall, userData.completedTasks]);

  // Load chat history on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (isAPIConnected) {
        try {
          const response = await apiService.getChatHistory();
          if (response.success && response.data) {
            const historyMessages = response.data.flatMap((item, index) => [
              {
                id: index * 2 + 1,
                text: item.message,
                sender: 'user' as const,
                timestamp: new Date(item.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
              },
              {
                id: index * 2 + 2,
                text: item.response,
                sender: 'ai' as const,
                timestamp: new Date(item.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
              }
            ]);

            if (historyMessages.length === 0) {
              // Add welcome message if no history
              setChatMessages([{
                id: 1,
                text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
              }]);
            } else {
              // Add welcome message at the beginning if it's not already there
              const hasWelcomeMessage = historyMessages.some(msg => 
                msg.sender === 'ai' && msg.text.includes('سلام! من AI کوچ شخصی شما هستم')
              );
              
              if (!hasWelcomeMessage) {
                const welcomeMessage = {
                  id: 0,
                  text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
                  sender: 'ai' as const,
                  timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                };
                setChatMessages([welcomeMessage, ...historyMessages]);
              } else {
                setChatMessages(historyMessages);
              }
            }
          }
        } catch (error) {
          logger.error('Error loading chat history:', error);
          // Add welcome message on error
          setChatMessages([{
            id: 1,
            text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      } else {
        // Add welcome message if API not connected
        setChatMessages([{
          id: 1,
          text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    };

    loadChatHistory();
  }, [isAPIConnected]);

  // Handle incoming prompt from ReadyPrompts page
  useEffect(() => {
    if (location.state?.promptText) {
      setChatMessage(location.state.promptText);
      if (location.state.editMode) {
        setIsEditingPrompt(true);
      }
      // Ensure we stay in stage-detail view and have the correct stage selected
      if (location.state.stageId && selectedStage?.id !== location.state.stageId) {
        // Find the stage and set it
        const allStages = levels.flatMap(level => level.stages);
        const targetStage = allStages.find(stage => stage.id === location.state.stageId);
        if (targetStage) {
          setSelectedStage(targetStage);
          // Find the level that contains this stage
          const targetLevel = levels.find(level => 
            level.stages.some(stage => stage.id === location.state.stageId)
          );
          if (targetLevel) {
            setSelectedLevel(targetLevel);
          }
        }
      }
      // Set view mode to stage-detail
      setViewMode('stage-detail');
      
      // Scroll to the chat section after a short delay to ensure DOM is ready
      setTimeout(() => {
        const chatSection = document.querySelector('[data-chat-section]');
        if (chatSection) {
          chatSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      
      // Clear the state to prevent re-processing
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, selectedStage, viewMode, levels]);

  // Handle navigation back from Chatbot
  useEffect(() => {
    if (location.state?.selectedLevel) {
      const targetLevel = levels.find(level => level.id === location.state.selectedLevel);
      if (targetLevel && (!selectedLevel || selectedLevel.id !== targetLevel.id)) {
        setSelectedLevel(targetLevel);
        
        // Set the specific stage if provided, otherwise set the first stage
        if (location.state?.selectedStage) {
          const targetStage = targetLevel.stages.find(stage => stage.id === location.state.selectedStage);
          if (targetStage) {
            setSelectedStage(targetStage);
          } else if (targetLevel.stages.length > 0) {
            setSelectedStage(targetLevel.stages[0]);
          }
        } else if (targetLevel.stages.length > 0) {
          setSelectedStage(targetLevel.stages[0]);
        }
        
        setViewMode('stage-detail');
        // Clear the state to prevent re-processing
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state?.selectedLevel, location.state?.selectedStage, selectedLevel, levels, navigate, location.pathname]);

  // Handle navigation back from ReadyPrompts with selectedStage
  useEffect(() => {
    if (location.state?.selectedStage && !location.state?.promptText) {
      // Find the stage and set it
      const allStages = levels.flatMap(level => level.stages);
      const targetStage = allStages.find(stage => stage.id === location.state.selectedStage);
      if (targetStage) {
        setSelectedStage(targetStage);
        // Find the level that contains this stage
        const targetLevel = levels.find(level => 
          level.stages.some(stage => stage.id === location.state.selectedStage)
        );
        if (targetLevel) {
          setSelectedLevel(targetLevel);
        }
        setViewMode('stage-detail');
        // Clear the state to prevent re-processing
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state?.selectedStage, levels, navigate, location.pathname]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'available':
        return <Play className="w-5 h-5 text-purple-500" />;
      default:
        return <Lock className="w-5 h-5 text-gray-400" />;
    }
  };



  // Helper function to render subscription card
  const renderSubscriptionCard = () => {
    if (!showSubscriptionCard) return null;
    logger.debug('✅ [Levels] SUBSCRIPTION CARD IS RENDERING NOW! showSubscriptionCard:', showSubscriptionCard);
    return (
      <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSubscriptionCard(false)}>
        <div className="w-[92%] max-w-md p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Crown className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-red-400 font-bold text-sm">محدودیت اشتراک</h4>
              <button
                onClick={() => {
                  logger.debug('❌ [Levels] Close button clicked');
                  setShowSubscriptionCard(false);
                }}
                className="text-red-400/70 hover:text-red-400 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-red-300 text-xs leading-relaxed mb-3">
              🔒 ادامه‌ی این مسیر فقط برای کاربران ویژه بازه
              <br />
              📌 با اشتراک ویژه، تمام مراحل ساخت بیزینس آنلاینت باز میشه
            </p>
            <button
              onClick={() => {
                logger.debug('🔓 [Levels] Activate subscription button clicked');
                setShowSubscriptionCard(false);
                navigate('/subscription-management');
              }}
              className="w-full py-2 rounded-lg text-white text-xs font-medium bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 transition-colors"
            >
              🔓 فعـال‌سازی اشتراک ویـژه
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Level Detail Page
  if (viewMode === 'detail' && selectedLevel) {
  return (
      <>
        {renderSubscriptionCard()}
      <div className="min-h-screen transition-colors duration-300 page-container" style={{ backgroundColor: '#0E0817' }}>
        <style dangerouslySetInnerHTML={{
          __html: `
            html.dark .page-container {
              background: #0E0817 !important;
            }
            @media (prefers-color-scheme: dark) {
              .page-container {
                background: #0E0817 !important;
              }
            }
          `
        }} />
        {/* Header */}
        <div className={`relative px-8 py-6 bg-gradient-to-r ${selectedLevel.gradient} overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#2c189a] to-[#5a189a]"></div>
          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setViewMode('list')}
                className="flex items-center gap-3 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-110"
              >
                <ArrowRight size={20} className="text-white" />
                <span className="text-white font-medium">بازگشت به سطح‌ها</span>
              </button>
              
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                  سطح {selectedLevel.id}
                      </span>
                {selectedLevel.progress === 100 && (
                  <div className="p-1 bg-yellow-400/20 backdrop-blur-sm rounded-full">
                    <Star className="w-5 h-5 text-yellow-300" />
                    </div>
                  )}
                </div>
        </div>

                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                        <span className="text-white text-2xl">{selectedLevel.icon}</span>
                      </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-1">
                          {selectedLevel.title}
                </h1>
                        <p className="text-white/90 text-lg font-medium">
                          {selectedLevel.subtitle}
                        </p>
                      </div>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              </div>

        <div className="max-w-6xl mx-auto p-6">
                {/* Level Description */}
                <div className="relative overflow-hidden backdrop-blur-2xl rounded-3xl p-8 mb-8 border border-gray-800/60" style={{ backgroundColor: '#11091C' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-2xl"></div>
                  
                  <div className="relative">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] rounded-2xl shadow-lg mb-4">
                        <Target className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        درباره این سطح
                      </h3>
                      <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">
                        {selectedLevel.description}
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30">
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="p-2 bg-orange-500/20 rounded-xl">
                          <Trophy className="w-6 h-6 text-orange-400" />
                        </div>
                        <h4 className="text-xl font-bold text-white">
                          هدف این سطح
                        </h4>
                      </div>
                      <p className="text-center text-gray-200 leading-relaxed text-lg">
                        {selectedLevel.goal}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Stats */}
          <div className="space-y-6 mb-8">
            {/* کادرهای کوچک مرحله آموزشی و تکمیل شده کنار هم */}
            <div className="flex gap-3">
              <div className="flex-1 text-center group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 h-20 flex flex-col justify-center backdrop-blur-xl rounded-2xl p-3 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#11091C' }}>
                <div className="flex items-center justify-center mb-1">
                  <div className="text-xs text-white font-medium transition-colors duration-300">مرحله آموزشی</div>
                </div>
                <div className="text-lg font-bold text-white flex items-center justify-center gap-1 transition-colors duration-300">
                  <BookOpen size={16} />
                  {selectedLevel.stages.length}
                </div>
              </div>
              
              <div className="flex-1 text-center group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 h-20 flex flex-col justify-center backdrop-blur-xl rounded-2xl p-3 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#11091C' }}>
                <div className="flex items-center justify-center mb-1">
                  <div className="text-xs text-white font-medium transition-colors duration-300">مرحله تکمیل شده</div>
                </div>
                <div className="text-lg font-bold text-white flex items-center justify-center gap-1 transition-colors duration-300">
                  <CheckCircle2 size={16} />
                  {selectedLevel.stages.filter(s => s.status === 'completed').length}
                </div>
              </div>
            </div>
            
            {/* کادر پیشرفت کلی کشیده زیر */}
            <div className="text-center group cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 h-12 flex flex-col justify-center backdrop-blur-xl rounded-2xl p-3 border border-gray-700/60 shadow-lg relative overflow-hidden" style={{ backgroundColor: '#11091C' }}>
              <div className="flex items-center justify-center gap-3">
                <div className="text-xs text-white font-medium transition-colors duration-300">پیشرفت کلی</div>
                <div className="flex-1 bg-gray-700/50 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${selectedLevel.progress}%` }}
                  ></div>
              </div>
                <div className="text-xs font-bold text-white">
                {selectedLevel.progress}%
                </div>
              </div>
            </div>
            


            {/* Stages List */}
            <div className="mb-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl px-6 py-3 border border-purple-500/30">
                  <CheckCircle2 className="w-6 h-6 text-purple-400" />
                  <h3 className="text-xl font-bold text-white">
                    مراحل یادگیری ({selectedLevel.stages.length} مرحله)
                  </h3>
                </div>
              </div>
              
              <div className="space-y-2">
                {selectedLevel.stages.map((stage) => (
                  <div
                    key={stage.id}
                    onClick={() => {
                      logger.debug('🔵 [Levels] Stage clicked:', stage.id);
                      logger.debug('🔵 [Levels] User subscriptionType:', userData.subscriptionType);
                      logger.debug('🔵 [Levels] Stage passed?', passedStages.has(stage.id));
                      
                      // Check subscription limits
                      const canAccessStage = () => {
                        if (userData.subscriptionType === 'paid') {
                          logger.debug('✅ [Levels] User has paid subscription - access granted');
                          return true;
                        }
                        // For free trial users AND users without subscription (legacy/none): allow all Level 1 (first 5 stages)
                        if (userData.subscriptionType === 'free_trial' ||
                            !userData.subscriptionType ||
                            userData.subscriptionType === 'none') {
                          const allowed = stage.id <= 5;
                          logger.debug(`🔵 [Levels] Free trial/None user - Stage ${stage.id} <= 5? ${allowed}`);
                          return allowed;
                        }
                        logger.debug('❌ [Levels] Unknown subscription type - access denied');
                        return false;
                      };

                      const hasAccess = canAccessStage();
                      logger.debug('🔵 [Levels] canAccessStage result:', hasAccess);
                      
                      // First check subscription - if not allowed, show card and return
                      if (!hasAccess) {
                        console.log('🚨 [Levels] NO ACCESS - Setting showSubscriptionCard to TRUE');
                        setShowSubscriptionCard(true);
                        console.log('🔵 [Levels] showSubscriptionCard state set to true');
                        // Auto-hide after 15 seconds (increased from 5 to give user time to see it)
                        setTimeout(() => {
                          logger.debug('⏰ [Levels] Auto-hiding subscription card after 15 seconds');
                          setShowSubscriptionCard(false);
                        }, 15000);
                        return;
                      }

                      // If subscription allows and stage is passed, open it
                      if (passedStages.has(stage.id)) {
                        logger.debug('✅ [Levels] Access granted and stage passed - opening stage');
                        setShowSubscriptionCard(false); // Hide card if it was showing
                        setSelectedStage(stage);
                        setViewMode('stage-detail');
                        // Scroll to top when opening stage detail
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        logger.debug('⚠️ [Levels] Access granted but stage not passed yet');
                      }
                    }}
                    className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
                      passedStages.has(stage.id)
                        ? 'cursor-pointer hover:scale-[1.01] hover:shadow-lg hover:-translate-y-0.5' 
                        : 'opacity-40 blur-[1px] grayscale cursor-not-allowed'
                    } 
                    backdrop-blur-xl border-gray-800/60 hover:border-orange-500/50`}
                    style={{ backgroundColor: '#11091C' }}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 relative">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2c189a] to-[#5a189a] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-sm font-bold text-white">
                              {stage.id}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white mb-1 group-hover:text-orange-300 transition-colors text-base leading-tight">
                            {stage.title}
                          </h4>
                        </div>
                        
                        <div className="flex-shrink-0">
                          {passedStages.has(stage.id) ? (
                            stage.status === 'completed' ? (
                              <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                <Play className="w-3 h-3 text-orange-400" />
                              </div>
                            )
                          ) : (
                            <div className="w-6 h-6 bg-gray-700/50 rounded-lg flex items-center justify-center">
                              <Lock className="w-3 h-3 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Render Stage Detail Page
  if (viewMode === 'stage-detail' && selectedStage) {
    return (
      <>
        {renderSubscriptionCard()}
      <div className="min-h-screen transition-colors duration-300 page-container" style={{ backgroundColor: '#0E0817' }}>
        {/* Header */}
        <div className="relative px-8 py-6 backdrop-blur-xl border-b border-gray-800/60 overflow-hidden" style={{ backgroundColor: '#0E0817' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#2c189a] to-[#5a189a]"></div>
          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setViewMode('detail')}
                className="flex items-center gap-3 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-110"
              >
                <ArrowRight size={20} className="text-white" />
                <span className="text-white font-medium">بازگشت به سطح</span>
              </button>
              
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                  مرحله آموزشی
                </span>
                        </div>
                      </div>
            
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                        {getStatusIcon(selectedStage.status)}
                      </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-3">
                          {selectedStage.title}
                </h1>
                      </div>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-full blur-xl"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-full blur-2xl"></div>
              </div>

                <div className="max-w-7xl mx-auto p-6 relative">
                  {/* Connecting Dashed Line from Learning Path to Quiz */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 pointer-events-none">
                    <div 
                      className="absolute top-[10rem] bottom-[2rem] w-full"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 2px, #10b981 2px, #10b981 8px)',
                        backgroundSize: '1px 10px',
                      }}
                    ></div>
                    {/* Arrow pointing to quiz card */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
                      style={{
                        bottom: '2rem',
                        borderBottom: '3px solid #10b981',
                        borderRight: '3px solid #10b981',
                      }}
                    ></div>
                  </div>


                {/* Learning Path Progress */}
                <div className="mb-8 relative z-10">
                  <div className="backdrop-blur-xl rounded-3xl p-7 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#11091C' }}>
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-bold text-white mb-2">مسیر یادگیری</h3>
                      <p className="text-sm text-gray-300">3 قدم تا تسلط کامل</p>
                    </div>
              
                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-4">
                      {[
                        { id: 1, title: 'ویدئو', icon: Video, completed: false, color: 'blue' },
                        { id: 2, title: 'AI Coach', icon: Brain, completed: false, color: 'orange' },
                        { id: 3, title: 'آزمون', icon: Award, completed: stageQuizResults[selectedStage.id]?.passed, color: 'purple' }
                      ].map((step) => (
                        <div key={step.id} className="flex flex-col items-center">
                          <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all duration-300 mb-2 ${
                            step.completed 
                              ? 'bg-green-500 border-green-400 text-white' 
                              : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:scale-105 hover:border-gray-600'
                          }`}>
                            {step.completed ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : (
                              <step.icon className="w-5 h-5" />
                            )}
                  </div>
                          <span className={`text-xs font-medium ${
                            step.completed 
                        ? 'text-green-400' 
                              : 'text-gray-400'
                    }`}>
                            {step.title}
                    </span>
                          
                </div>
                      ))}
                </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="space-y-8 relative z-10">
                  {/* Step 1: Video Section */}
                  <div className="backdrop-blur-xl rounded-2xl border border-gray-800/60 shadow-xl overflow-hidden" style={{ backgroundColor: '#11091C' }}>
                    {/* Header */}
                    <div className="backdrop-blur-xl border-b border-gray-800/60 p-4" style={{ backgroundColor: '#11091C' }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#2c189a] to-[#5a189a] rounded-xl">
                          <Video className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">قدم اول: مشاهده ویدئو آموزشی</h3>
                          <p className="text-gray-300 text-sm mt-1">قدم اول دیدن آموزش های مرحله است</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Video Player(s) */}
                      {selectedStage.videos && selectedStage.videos.length > 0 ? (
                        selectedStage.videos.map((video, index) => (
                          <div key={`${selectedStage.id}-video-${index}`} className="mb-4">
                            <div className={`relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-lg mb-4 ${pseudoFullscreenIdx === index ? 'fixed inset-0 z-[99999] bg-black rounded-none' : ''}`}>
                              <div className={`aspect-video relative flex items-center justify-center ${pseudoFullscreenIdx === index ? 'w-[100vw] h-[100vh] max-w-[100vw] max-h-[100vh]' : ''}`}>
                                <video 
                                  key={`${selectedStage.id}-video-element-${index}`}
                                  ref={(el) => videoRefs.current[index] = el}
                                  controls 
                                  controlsList="nodownload"
                                  className={`w-full h-full object-contain ${pseudoFullscreenIdx === index ? 'w-[100vw] h-[100vh] max-w-[100vw] max-h-[100vh]' : ''}`}
                                  poster="/video-thumbnail.jpg"
                                  playsInline
                                >
                                  <source src={video.url} type="video/mp4" />
                                  مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                                </video>
                                <button
                                  onClick={() => toggleFullscreen(index)}
                                  className={`absolute ${pseudoFullscreenIdx === index ? 'top-3 right-3' : 'bottom-3 left-3'} bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-full border border-white/30 flex items-center gap-2 z-10 transition-all duration-300`}
                                >
                                  {pseudoFullscreenIdx === index ? (
                                    <>
                                      <X className="w-4 h-4" />
                                      خروج
                                    </>
                                  ) : (
                                    <>
                                      <Maximize2 className="w-4 h-4" />
                                      تمام صفحه
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Video Info */}
                            <div className="bg-gradient-to-r from-purple-50/80 to-purple-100/80 dark:from-purple-900/20 dark:to-purple-800/20 rounded-3xl p-4 border border-purple-200/50 dark:border-purple-800/50 mb-2">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{video.title}</h4>
                              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                  <span className="text-sm text-purple-600 dark:text-purple-300 font-medium">{video.duration}</span>
                                </div>
                                {/* <div className="flex items-center gap-2">
                                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                                  <span className="font-medium">1,234 مشاهده</span>
                                </div> */}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : selectedStage.videoUrl ? (
                        // Legacy single video support
                        <div key={`${selectedStage.id}-legacy-video`} className="mb-4">
                          <div className={`relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-lg mb-4 ${pseudoFullscreenIdx === -1 ? 'fixed inset-0 z-[99999] bg-black rounded-none' : ''}`}>
                            <div className={`aspect-video relative flex items-center justify-center ${pseudoFullscreenIdx === -1 ? 'w-[100vw] h-[100vh] max-w-[100vw] max-h-[100vh]' : ''}`}>
                              <video 
                                key={`${selectedStage.id}-legacy-video-element`}
                                ref={(el) => videoRefs.current[-1] = el}
                                controls 
                                controlsList="nodownload"
                                className={`w-full h-full object-contain ${pseudoFullscreenIdx === -1 ? 'w-[100vw] h-[100vh] max-w-[100vw] max-h-[100vh]' : ''}`}
                                poster="/video-thumbnail.jpg"
                                playsInline
                              >
                                <source src={selectedStage.videoUrl} type="video/mp4" />
                                مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                              </video>
                              <button
                                onClick={() => toggleFullscreen(-1)}
                                className={`absolute ${pseudoFullscreenIdx === -1 ? 'top-3 right-3' : 'top-3 left-3'} bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white p-2 rounded-full border border-white/30 transition-all duration-300 hover:scale-110 z-10`}
                                title={pseudoFullscreenIdx === -1 ? 'خروج از تمام صفحه' : 'تمام صفحه'}
                              >
                                {pseudoFullscreenIdx === -1 ? <X size={16} /> : <Maximize2 size={16} />}
                              </button>
                      </div>
                    </div>

                          {/* Video Info */}
                                                      <div className="bg-gradient-to-r from-purple-50/80 to-purple-100/80 dark:from-purple-900/20 dark:to-purple-800/20 rounded-3xl p-4 border border-purple-200/50 dark:border-purple-800/50 mb-2">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{selectedStage.videoTitle}</h4>
                            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                <span className="text-sm text-purple-600 dark:text-purple-300 font-medium">{selectedStage.videoDuration}</span>
                              </div>
                              {/* <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <span className="font-medium">1,234 مشاهده</span>
                            </div> */}
                          </div>
                    </div>
                            </div>
                      ) : (
                        // No video available
                        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-lg mb-6">
                          <div className="aspect-video relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center">
                              <div className="text-center text-white">
                                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-sm opacity-75">ویدیو در دسترس نیست</p>
                            </div>
                          </div>
                    </div>
                            </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: AI Coach */}
                  <div className="backdrop-blur-xl rounded-2xl border border-gray-800/60 shadow-xl overflow-hidden" style={{ backgroundColor: '#11091C' }}>
                    {/* Header */}
                    <div className="backdrop-blur-xl border-b border-gray-800/60 p-4" style={{ backgroundColor: '#11091C' }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#2c189a] to-[#5a189a] rounded-xl">
                          <Rocket className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">قدم دوم: ساخت با ای آی کوچ</h3>
                          <p className="text-gray-300 text-sm mt-1">همین الان این بخش بیزینست رو بساز</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 space-y-4" data-chat-section>


                      {/* Full AI Coach Chat Interface */}
                      <div className="backdrop-blur-xl rounded-3xl p-4 border border-gray-700/60 shadow-lg transition-all duration-300 w-full h-[700px] flex flex-col" style={{ backgroundColor: '#10091c' }}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#2c189a] to-[#5a189a] rounded-2xl flex items-center justify-center shadow-lg animate-pulse relative">
                              <div className="absolute inset-0 bg-gradient-to-br from-[#2c189a]/30 via-[#5a189a]/30 to-[#7222F2]/30 rounded-2xl blur-md animate-pulse"></div>
                              <Brain size={20} className="text-white relative z-10" />
                </div>
                            <div>
                              <h4 className="text-lg font-bold text-white transition-colors duration-300">
                                AI کوچ
                              </h4>
                              <p className="text-sm text-gray-300 transition-colors duration-300">آماده کمک به شما</p>
              </div>
                  </div>
                          <div className="flex items-center gap-2">
              <button
                  onClick={() => navigate('/chatbot', { state: { fromPage: 'levels', fromLevel: selectedLevel?.id, fromStage: selectedStage?.id } })}
                              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-colors duration-200 group"
                  title="چت کامل"
              >
                              <Maximize2 size={16} className="text-gray-400 group-hover:text-white transition-colors" />
              </button>
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-100/70 dark:bg-green-900/40 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium border border-green-200/50 dark:border-green-700/50">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              آنلاین
                            </div>
                        </div>
            </div>

                        {/* Chat Messages */}
                        <div 
                          ref={chatContainerRef}
                          className="backdrop-blur-md rounded-xl p-4 border border-gray-700/60 shadow-lg mb-4 flex-1 overflow-y-auto space-y-3 relative" 
                          style={{ backgroundColor: '#10091c' }}
                          onScroll={checkScrollPosition}
                        >
                          {/* Chat Messages */}
                          {chatMessages.map((message, index) => (
                            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                              {message.sender === 'user' ? (
                                <div className="flex flex-col max-w-[80%]">
                                  <div className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-lg rounded-br-md px-3 py-2">
                                    <p className="text-white text-xs leading-relaxed">{message.text}</p>
                                  </div>
                                  <span className="text-xs text-gray-400 mt-1 px-1 text-right">{message.timestamp}</span>
                                </div>
                              ) : (
                                <div className="w-full">
                                <AIMessage
                                  message={message.text}
                                  timestamp={message.timestamp}
                                  isLatest={index === chatMessages.length - 1}
                                  isNew={message.isNew || false}
                                />
                                </div>
                              )}
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                          
                          {/* Scroll to Bottom Button - Fixed Position */}
                          {showScrollButton && (
                            <button
                              onClick={scrollToBottom}
                              className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg border border-white/20 z-10"
                              title="اسکرول به پایین"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M12 5v14"/>
                                <path d="M19 12l-7 7-7-7"/>
                              </svg>
                            </button>
                          )}
            </div>

                        {/* Input Area */}
                        <div className="space-y-4">
                            {isEditingPrompt ? (
                              <>
                              <div className="flex items-center justify-between">
                                <h6 className="text-sm font-medium text-[#7222F2]">
                                  ویرایش پرامپت - جاهای خالی رو پر کنید:
                                </h6>
                                <button
                                  onClick={handleCancelPromptEdit}
                                  className="text-xs text-gray-400 hover:text-gray-200"
                                >
                                  انصراف ✕
                                </button>
                              </div>
                              
                              <textarea
                                  value={chatMessage}
                                  onChange={(e) => setChatMessage(e.target.value)}
                                  placeholder="پرامپت خود را ویرایش کنید..."
                                className="w-full h-32 px-4 py-3 bg-gray-800/40 backdrop-blur-md rounded-xl border border-purple-300/50 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 resize-none leading-relaxed"
                                />
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSendMessage}
                                  disabled={!chatMessage.trim()}
                                  className="flex-1 min-w-0 px-4 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 disabled:from-[#2c189a]/50 disabled:to-[#5a189a]/50 text-white rounded-xl text-sm font-medium hover:shadow-xl transition-all duration-300 border border-white/10 flex items-center justify-center gap-2"
                                >
                                  <span className="truncate">ارسال پرامپت</span>
                                  <span>🚀</span>
                                </button>
                                <button
                                  onClick={handleCancelPromptEdit}
                                  className="px-4 py-3 bg-gray-700/70 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600/70 transition-all duration-300 flex-shrink-0"
                                >
                                  انصراف
                                </button>
                              </div>
                              </>
                            ) : (
                            <div className="space-y-2">
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="سوال یا نظرتان را بنویسید..."
                                  value={chatMessage}
                                  onChange={(e) => setChatMessage(e.target.value)}
                                  className="flex-1 min-w-0 px-3 py-2 bg-gray-800/40 backdrop-blur-md rounded-xl border border-gray-700/40 text-base text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300"
                                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                  style={{ fontSize: '16px', height: '40px' }}
                                />
                                <button
                                  onClick={handleSendMessage}
                                  disabled={!chatMessage.trim()}
                                  className="w-10 h-10 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 disabled:from-[#2c189a]/50 disabled:to-[#5a189a]/50 text-white rounded-xl text-sm font-medium hover:shadow-xl transition-all duration-300 border border-white/10 flex-shrink-0 flex items-center justify-center"
                                >
                                  <span className="text-lg">➤</span>
                                </button>
                              </div>
                            </div>
                            )}
                        </div>

                        {/* Ready Prompts Button */}
                        <div className="flex justify-center mt-4">
                          <button
                            onClick={() => navigate(`/ready-prompts?from=levels&stage=${selectedStage.id}`)}
                            className="w-full py-2 text-xs text-purple-600 hover:text-purple-700 border border-purple-200/50 hover:border-purple-300/70 rounded-lg hover:bg-purple-50/30 transition-all duration-300 flex items-center justify-center gap-1 truncate backdrop-blur-xl"
                          >
                            <Sparkles size={12} className="flex-shrink-0" />
                            <span className="truncate">پرامپت این مرحله</span>
              </button>
                  </div>
                </div>


                    </div>
                  </div>

                  {/* Step 3: Quiz Section */}
                  <div className={`backdrop-blur-xl rounded-2xl border shadow-xl overflow-hidden transition-all duration-500 ${
                    stageQuizResults[selectedStage.id]?.passed 
                      ? 'border-green-600/40' 
                      : stageQuizResults[selectedStage.id] 
                      ? 'border-red-600/40'
                      : 'border-gray-800/60'
                  }`} style={{ backgroundColor: '#11091C' }}>
                    {/* Header */}
                    <div className="backdrop-blur-xl border-b border-gray-800/60 p-4" style={{ backgroundColor: '#11091C' }}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl transition-all duration-300 ${
                          stageQuizResults[selectedStage.id]?.passed 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                            : stageQuizResults[selectedStage.id] 
                            ? 'bg-gradient-to-br from-red-500 to-pink-500'
                            : 'bg-gradient-to-br from-[#2c189a] to-[#5a189a]'
                        }`}>
                          {stageQuizResults[selectedStage.id]?.passed ? (
                            <CheckCircle2 className="w-6 h-6 text-white" />
                          ) : stageQuizResults[selectedStage.id] ? (
                            <X className="w-6 h-6 text-white" />
                          ) : (
                            <Award className="w-6 h-6 text-white" />
                          )}
                        </div>
                                                  <div>
                            <h3 className={`text-lg font-bold transition-all duration-300 ${
                              stageQuizResults[selectedStage.id]?.passed 
                                ? 'text-green-300' 
                                : stageQuizResults[selectedStage.id] 
                                ? 'text-red-300'
                                : 'text-white'
                            }`}>
                              قدم سوم: آزمون نهایی
                            </h3>
                          </div>
                      </div>
                    </div>

                    <div className="p-6">
              {/* Quiz Result Status */}
              {(() => {
                // CRITICAL FIX: Check if this is the current stage (user is at this stage)
                // If user is at this stage (currentSession === stageId), they should be able to take quiz
                // even if stageQuizResults shows passed (which might be from admin panel change)
                const isCurrentStage = userData.currentSession === selectedStage.id;
                const hasQuizResult = !!stageQuizResults[selectedStage.id];
                const hasPassedQuiz = stageQuizResults[selectedStage.id]?.passed === true;
                
                // CRITICAL: If this is current stage, ALWAYS show "ready for quiz" card
                // This ensures that even if admin changed stage and quiz was marked as passed,
                // user can still take the quiz
                if (isCurrentStage) {
                  return (
                    <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-2xl p-6 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                          <ClipboardCheck className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-blue-700 dark:text-blue-300 text-xl mb-2">آماده چالش نهایی؟</h4>
                          <p className="text-sm text-blue-600 dark:text-blue-400">آزمون این مرحله منتظر شماست!</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // If quiz result exists and user is NOT at this stage, show result card
                if (hasQuizResult) {
                  return (
                    <div className={`rounded-2xl p-6 mb-6 border-2 ${
                      hasPassedQuiz
                        ? 'bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300/60 dark:border-green-600/60' 
                        : 'bg-gradient-to-r from-red-50/80 to-pink-50/80 dark:from-red-900/30 dark:to-pink-900/30 border-red-300/60 dark:border-red-600/60'
                    }`}>
                      <div className="flex items-center gap-4 mb-4">
                        {hasPassedQuiz ? (
                          <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="w-8 h-8 text-white" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                            <X className="w-8 h-8 text-white" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className={`font-bold text-xl mb-2 ${
                            hasPassedQuiz
                              ? 'text-green-700 dark:text-green-300' 
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {hasPassedQuiz ? '🎉 تبریک! شما در آزمون موفق شدید!' : '📚 متأسفانه در آزمون موفق نشدید'}
                          </h4>
                          {hasPassedQuiz && (
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                              ✅ مرحله بعدی برای شما باز شد
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Default: show "ready for quiz" card
                return (
                  <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                        <ClipboardCheck className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-blue-700 dark:text-blue-300 text-xl mb-2">آماده چالش نهایی؟</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-400">آزمون این مرحله منتظر شماست!</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* CRITICAL FIX: Show quiz button if:
                  1. This is the current stage (user is at this stage) - even if quiz was marked as passed
                  2. OR quiz not passed yet
              */}
              {(() => {
                const isCurrentStage = userData.currentSession === selectedStage.id;
                const hasPassedQuiz = stageQuizResults[selectedStage.id]?.passed === true;
                
                // Show quiz button if:
                // - This is the current stage (user is at this stage) - allow quiz even if passed (admin panel case)
                // - OR quiz was never attempted
                // - OR quiz was attempted but not passed
                const shouldShowQuiz = isCurrentStage || !hasPassedQuiz;
                
                return shouldShowQuiz;
              })() && (
                <button 
                  onClick={() => setShowQuiz(true)}
                  className={
                    'w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex items-center justify-center gap-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white shadow-lg shadow-[#2c189a]/30'
                  }
                >
                  <>
                    <ClipboardCheck className="w-6 h-6" />
                    شروع آزمون
                  </>
                </button>
              )}

                </div>
                </div>
                    </div>
                    


              </div>

              {/* TODO: فعال‌سازی کادر رفتن به مرحله بعد بعد از بررسی نهایی */}
              {/* Next Stage Card - Minimal Platform Style */}
              {/* <div className={`backdrop-blur-xl rounded-xl border shadow-lg overflow-hidden mx-6 mt-12 mb-12 ${
                stageQuizResults[selectedStage.id] && !stageQuizResults[selectedStage.id]?.passed
                  ? 'border-red-400/40'
                  : 'border-gray-800/60'
              }`} style={{ backgroundColor: '#11091C' }}>
                <div className={`p-4 transition-all duration-300 ${
                  stageQuizResults[selectedStage.id]?.passed 
                    ? 'bg-gradient-to-r from-green-600/20 via-green-700/15 to-green-600/20' 
                    : stageQuizResults[selectedStage.id] && !stageQuizResults[selectedStage.id]?.passed
                    ? 'bg-gradient-to-r from-red-600/20 via-red-700/15 to-red-600/20'
                    : 'bg-gradient-to-r from-slate-700 via-gray-800 to-slate-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`transition-all duration-300 ${
                        stageQuizResults[selectedStage.id]?.passed 
                          ? 'text-green-400' 
                          : stageQuizResults[selectedStage.id] && !stageQuizResults[selectedStage.id]?.passed
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        {stageQuizResults[selectedStage.id]?.passed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : stageQuizResults[selectedStage.id] && !stageQuizResults[selectedStage.id]?.passed ? (
                          <X className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {stageQuizResults[selectedStage.id]?.passed 
                            ? 'آماده برای مرحله بعدی' 
                            : stageQuizResults[selectedStage.id] && !stageQuizResults[selectedStage.id]?.passed
                            ? 'آزمون مجدد لازم است'
                            : 'ابتدا آزمون را تکمیل کنید'
                          }
                        </h4>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (!stageQuizResults[selectedStage.id]?.passed) {
                          // Show simple notification
                          const notification = document.createElement('div');
                          notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-[100]';
                          notification.textContent = stageQuizResults[selectedStage.id] && !stageQuizResults[selectedStage.id]?.passed 
                            ? 'ابتدا آزمون را مجدد بگذرانید!' 
                            : 'ابتدا آزمون را بگذرانید!';
                          document.body.appendChild(notification);
                          setTimeout(() => document.body.removeChild(notification), 2000);
                          return;
                        }
                        navigateToNext();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                        stageQuizResults[selectedStage.id]?.passed
                          ? 'bg-green-600/30 hover:bg-green-600/40 text-white border border-green-500/40'
                          : stageQuizResults[selectedStage.id] && !stageQuizResults[selectedStage.id]?.passed
                          ? 'bg-red-600/30 hover:bg-red-600/40 text-white border border-red-500/40'
                          : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                      }`}
                    >
                      <span>
                        {(() => {
                          const nextStageId = selectedStage.id + 1;
                          const nextStage = selectedLevel?.stages.find(s => s.id === nextStageId);
                          if (nextStage) {
                            return `مرحله بعدی`;
                          } else {
                            // Check if there's a next level
                            const currentLevelIndex = levels.findIndex(l => l.id === selectedLevel?.id);
                            if (currentLevelIndex < levels.length - 1) {
                              // const nextLevel = levels[currentLevelIndex + 1];
                              return `سطح بعدی`;
                            }
                            return 'تمام شد';
                          }
                        })()}
                      </span>
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </div>
              </div> */}

        {/* Quiz Modal */}
        {showQuiz && selectedStage && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-lg flex items-center justify-center p-4 z-[70]">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-2xl rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 shadow-2xl border border-white/20 dark:border-gray-700/30">
              {/* Quiz Header */}
              <div className="relative px-6 py-5 bg-gradient-to-r from-slate-700 via-purple-800 to-slate-700 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#2c189a]/30 to-[#5a189a]/30"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-500/30 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-400/30">
                        <ClipboardCheck className="w-6 h-6 text-purple-300" />
            </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                          آزمون مرحله
                        </h2>
                        <p className="text-purple-200 text-sm">
                          {selectedStage.title}
                        </p>
          </div>
                    </div>
                    <button 
                      onClick={resetQuiz}
                      className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-110 border border-white/30"
                    >
                      <X size={24} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto relative" style={{ backgroundColor: '#0F0817' }}>
                {isAnalyzing ? (
                  /* AI Analysis Loading */
                  <div className="text-center py-12">
                    <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full animate-spin"></div>
                      <div className="bg-white dark:bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center">
                        <Brain className="w-10 h-10 text-purple-500 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      🤖 در حال بررسی...
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                      آزمون توسط کوچ هوش مصنوعی شما در حال بررسی است
                    </p>
                    <div className="flex justify-center gap-1 mt-6">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                ) : !quizCompleted ? (
                  <>
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>سوال {currentQuestion + 1} از {getQuizQuestions(selectedStage).length}</span>
                        <span>{Math.round(((currentQuestion + 1) / getQuizQuestions(selectedStage).length) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200/80 dark:bg-gray-700/80 rounded-full h-3 border border-gray-300/50 dark:border-gray-600/50">
                        <div 
                          className="bg-gradient-to-r from-[#5a189a] to-[#7222F2] h-full rounded-full transition-all duration-500 shadow-lg shadow-[#5a189a]/30"
                          style={{ width: `${((currentQuestion + 1) / getQuizQuestions(selectedStage).length) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Question */}
                    {(() => {
                      const questions = getQuizQuestions(selectedStage);
                      const question = questions[currentQuestion];
                      return (
                        <div className="backdrop-blur-xl rounded-2xl p-6 mb-6 border border-gray-700/60" style={{ backgroundColor: '#10091d' }}>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 leading-relaxed">
                            {question.question}
                          </h3>
                          
                          {question.type === 'multiple' && (
                            <div className="space-y-3">
                              {question.options?.map((option, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleAnswerSelect(question.id, index)}
                                  className={`w-full text-right p-4 rounded-xl border-2 transition-all duration-300 ${
                                    userAnswers[question.id] === index
                                      ? 'border-[#5a189a] bg-[#5a189a]/20 text-white shadow-lg shadow-[#5a189a]/20'
                                      : 'border-gray-600 bg-[#10091d] text-gray-300 hover:border-[#5a189a] hover:bg-[#5a189a]/10'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 ${
                                      userAnswers[question.id] === index
                                        ? 'border-purple-500 bg-purple-500'
                                        : 'border-gray-400 dark:border-gray-500'
                                    }`}>
                                      {userAnswers[question.id] === index && (
                                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                      )}
                                    </div>
                                    <span>{option}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {(question.type === 'short' || question.type === 'long') && (
                            <textarea
                              value={userAnswers[question.id] || ''}
                              onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
                              placeholder={question.placeholder}
                              rows={question.type === 'long' ? 5 : 2}
                              className="w-full p-4 border-2 border-gray-600 rounded-xl text-white placeholder:text-gray-400 focus:border-[#5a189a] focus:outline-none transition-colors resize-none"
                              style={{ backgroundColor: '#10091d' }}
                            />
                          )}
                        </div>
                      );
                    })()}

                    {/* Navigation */}
                    <div className="flex justify-between">
                      <button
                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestion === 0}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 border border-gray-300 dark:border-gray-600"
                      >
                        <ChevronLeft size={16} />
                        قبلی
                      </button>
                      
                      <button
                        onClick={nextQuestion}
                        disabled={userAnswers[getQuizQuestions(selectedStage)[currentQuestion].id] === undefined}
                        className="px-6 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-[#2c189a]/30"
                      >
                        {currentQuestion === getQuizQuestions(selectedStage).length - 1 ? 'ارسال آزمون' : 'بعدی'}
                        {currentQuestion !== getQuizQuestions(selectedStage).length - 1 && <ChevronLeft size={16} className="rotate-180" />}
                      </button>
                    </div>
                  </>
                ) : (
                  /* Quiz Results */
                  <div className="text-center py-8 px-4">
                    {/* Result Badge */}
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 shadow-2xl ${
                      quizResult?.passed 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                        : 'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}>
                      {quizResult?.passed ? (
                        <Award className="w-10 h-10 text-white" />
                      ) : (
                        <X className="w-10 h-10 text-white" />
                      )}
                    </div>

                    {/* Result Title */}
                    <h3 className={`text-2xl font-bold mb-3 ${
                      quizResult?.passed ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {quizResult?.passed ? '🎉 قبول شدید!' : '❌ نیاز به تلاش بیشتر'}
                    </h3>

                    {/* Reward Summary (replaces score) */}
                    {quizResult?.passed ? (
                      <div className="relative bg-white/60 dark:bg-gray-800/60 rounded-2xl p-4 mb-6 border border-white/20 dark:border-gray-700/20 overflow-hidden">
                        <div ref={confettiRef} className="pointer-events-none absolute inset-0"></div>
                        <div className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">۵۰ امتیاز به امتیازهای شما اضافه شد 🎉</div>
                        <div className="text-gray-700 dark:text-gray-300 text-sm">مجموع امتیازها: {totalPoints}</div>
                      </div>
                    ) : (
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl p-4 mb-6 border border-white/20 dark:border-gray-700/20">
                        <div className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">۰ امتیاز به امتیازهای شما اضافه شد</div>
                        <div className="text-gray-700 dark:text-gray-300 text-sm">مجموع امتیازها: {totalPoints}</div>
                      </div>
                    )}

                    {/* AI Feedback */}
                    <div className="bg-gradient-to-br from-purple-100/80 to-blue-100/80 dark:from-purple-500/20 dark:to-blue-500/20 rounded-2xl p-6 mb-6 border border-purple-200/50 dark:border-purple-500/30 text-right">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/20 dark:bg-purple-500/30 rounded-lg">
                          <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          نظر کوچ AI شما
                        </h4>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {quizResult?.feedback}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-center mt-8 mb-4">
                      <button
                        onClick={resetQuiz}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
                      >
                        بستن
                      </button>
                      
                      {/* TODO: فعال‌سازی دکمه رفتن به مرحله بعد بعد از بررسی نهایی */}
                      {/* {quizResult?.passed ? (
                        <button
                          onClick={goToNextStage}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center gap-2 shadow-lg"
                        >
                          <CheckCircle2 size={16} />
                          رفتن به مرحله بعدی
                        </button>
                      ) : ( */}
                      {!quizResult?.passed && (
                        <button
                          onClick={() => {
                            setCurrentQuestion(0);
                            setUserAnswers({});
                            setQuizCompleted(false);
                            setQuizResult(null);
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl font-medium hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-[#2c189a]/30"
                        >
                          <Clock size={16} />
                          تلاش مجدد
                        </button>
                      )}
                      {/* )} */}
                    </div>
                  </div>
                )}
              </div>
              {/* Add minimal bottom padding for scrolling */}
            </div>
          </div>
        )}
      </div>
      </>
    );
  }

  // Render Levels List Page
  return (
    <>
      {renderSubscriptionCard()}
          <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: '#0E0817' }}>
        {/* Header */}
              <div className="pt-24 p-4 space-y-6 max-w-md mx-auto">
        {/* Sticky Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#2c189a]/95 via-[#5a189a]/95 to-[#7222F2]/95 backdrop-blur-xl border-b border-gray-700/60 shadow-2xl">
          <div className="flex items-center justify-between p-4 max-w-md mx-auto">
            {/* Icon Container */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] rounded-xl flex items-center justify-center shadow-lg">
                <Trophy size={24} className="text-white" />
          </div>
              {/* Icon Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#2c189a]/30 via-[#5a189a]/30 to-[#7222F2]/30 rounded-xl blur-md animate-pulse"></div>
            </div>
            
            {/* Title Section */}
            <div className="text-right flex-1 mr-4">
              <h1 className="text-xl font-bold text-white mb-1">مراحل یادگیری</h1>
              <p className="text-xs text-gray-300">مسیر پیشرفت و تسلط بر کسب‌وکار</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ۹ سطح تسلط بر کسب‌وکار AI
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            از انتخاب ایده تا ساخت کسب‌وکار درآمد دلاری
          </p>
          
          {/* Free Trial Countdown Timer - Mobile Optimized */}
          {userData.subscriptionType === 'free_trial' && (
            <div className="mt-4 w-full max-w-sm mx-auto px-2">
              <div className="bg-gradient-to-br from-red-500/15 via-red-600/15 to-rose-500/15 backdrop-blur-md rounded-2xl border border-red-500/30 p-3 shadow-lg shadow-red-500/10">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span className="text-[11px] font-medium text-red-300">زمان باقی‌مانده استفاده رایگان:</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  {(() => {
                    const time = formatTrialTime(freeTrialTimeLeft);
                    return (
                      <>
                        <div className="flex flex-col items-center bg-red-500/25 rounded-lg px-2 py-1.5 min-w-[46px] border border-red-400/30">
                          <span className="text-lg font-bold text-red-100 leading-none">{String(time.days).padStart(2, '0')}</span>
                          <span className="text-[8px] text-red-300 mt-0.5">روز</span>
                        </div>
                        <span className="text-red-400 font-bold text-xs">:</span>
                        <div className="flex flex-col items-center bg-red-500/25 rounded-lg px-2 py-1.5 min-w-[46px] border border-red-400/30">
                          <span className="text-lg font-bold text-red-100 leading-none">{String(time.hours).padStart(2, '0')}</span>
                          <span className="text-[8px] text-red-300 mt-0.5">ساعت</span>
                        </div>
                        <span className="text-red-400 font-bold text-xs">:</span>
                        <div className="flex flex-col items-center bg-red-500/25 rounded-lg px-2 py-1.5 min-w-[46px] border border-red-400/30">
                          <span className="text-lg font-bold text-red-100 leading-none">{String(time.minutes).padStart(2, '0')}</span>
                          <span className="text-[8px] text-red-300 mt-0.5">دقیقه</span>
                        </div>
                        <span className="text-red-400 font-bold text-xs">:</span>
                        <div className="flex flex-col items-center bg-red-500/25 rounded-lg px-2 py-1.5 min-w-[46px] border border-red-400/30">
                          <span className="text-lg font-bold text-red-100 leading-none">{String(time.seconds).padStart(2, '0')}</span>
                          <span className="text-[8px] text-red-300 mt-0.5">ثانیه</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Overview */}
        <div className="backdrop-blur-xl rounded-3xl p-7 mb-8 shadow-lg hover:shadow-xl border border-gray-700/60 transition-all duration-500 group" style={{ backgroundColor: '#11091C' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">پیشرفت کلی</h2>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              سطح {userData?.currentLevel || 1} از ۹
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
            <div 
              className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${((userData?.currentLevel || 1) / 9) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>شروع سفر</span>
            <span>تسلط کامل</span>
          </div>
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative mt-14 mb-16 pb-12">
          {/* Decorative Line */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/3 w-px h-8 bg-gradient-to-b from-transparent via-green-500/50 to-transparent transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-2/3 w-px h-8 bg-gradient-to-b from-transparent via-green-500/50 to-transparent transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
          
          {/* Vertical Dashed Line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 pointer-events-none">
            <div 
              className="absolute top-[10rem] bottom-[-0.75rem] w-full"
              style={{
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 2px, #10b981 2px, #10b981 8px)',
                backgroundSize: '1px 10px',
              }}
            ></div>
            {/* Arrow pointing down */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
              style={{
                bottom: '-0.75rem',
                borderBottom: '3px solid #10b981',
                borderRight: '3px solid #10b981',
              }}
            ></div>
          </div>
          
          {levels.map((level) => (
            <div
              key={level.id}
              onClick={() => {
                if (level.isUnlocked) {
                  setSelectedLevel(level);
                  setViewMode('detail');
                }
              }}
              className={`relative overflow-hidden rounded-3xl border transition-all duration-500 mb-4 ${
                level.isUnlocked 
                  ? 'cursor-pointer hover:scale-105 hover:-translate-y-2 border-gray-700/60 shadow-lg hover:shadow-xl' 
                  : 'border-gray-700/50 shadow-sm'
              } backdrop-blur-xl group`}
              style={{ backgroundColor: '#11091C' }}
            >
              {/* Lock Overlay */}
              {!level.isUnlocked && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#2c189a] to-[#5a189a] backdrop-blur-[1px] z-10 flex items-center justify-center">
                  <div className="bg-gray-800/90 rounded-full p-3 shadow-lg">
                    <Lock className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>
                    )}
              
              {/* Level Card Content */}
              <div className="p-7">
                <div className="flex items-center gap-4 mb-5">
                  <div className={`p-4 rounded-2xl bg-gradient-to-r ${level.gradient} shadow-xl border border-white/20`}>
                    <div className="scale-125 text-white">{level.icon}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-400">
                        سطح {level.id}
                      </span>
                      {level.progress === 100 && (
                        <Star className="w-5 h-5 text-yellow-400" />
                      )}
                </div>
                    <h3 className="font-bold text-white text-lg leading-tight mb-1">
                      {level.title}
                    </h3>
                    <p className={`text-sm ${level.color} font-medium`}>
                      {level.subtitle}
                    </p>
              </div>
            </div>

                <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                  {level.description}
                </p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">پیشرفت</span>
                    <span className="text-xs font-medium text-gray-300">
                      {level.progress}%
                    </span>
          </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${level.gradient}`} 
                      style={{ width: `${level.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stages Count */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    {level.stages.length} مرحله
                  </span>
                  {level.isUnlocked && (
                    <span className="font-medium" style={{ color: '#8B5CF6' }}>
                      مشاهده جزئیات →
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Target Card for arrow destination */}
        <div className="flex justify-center -mt-6 mb-16">
          <button
            type="button"
            onClick={() => setIsGoalModalOpen(true)}
            className="backdrop-blur-xl rounded-2xl px-6 py-4 border flex items-center gap-3 transition-colors cursor-pointer"
            style={{ backgroundColor: '#11091C', borderColor: 'rgba(16,185,129,0.6)' }}
          >
            <div className="p-2 rounded-xl bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white">
              <Target className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-white">هدف نهایی: سیستم خودکار پولسازی</h4>
            </div>
          </button>
        </div>

        {/* Level Detail Modal */}
        {/* پاپ‌آپ قدیمی حذف شد - حالا از صفحه جداگانه استفاده می‌کنیم */}


      </div>
      

      {/* Goal Info Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsGoalModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/40 bg-[#11091C] text-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300">
                <Target className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold mb-1">هدف نهایی: سیستم خودکار پولسازی</h3>
                <p className="text-sm text-gray-300 leading-6">
                  وقتی همه سطح‌ها رو گذرونی، یک سیستم خودکار پولسازی داری که همیشه برات کار می‌کنه و درآمد می‌سازه. تو فقط هر روز بهترش می‌کنی و بهینه‌ترش می‌کنی.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 rounded-lg text-sm border border-gray-600 text-gray-200 hover:bg-gray-700/40" onClick={() => setIsGoalModalOpen(false)}>بستن</button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal for AI Coach */}
      {isChatModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm">
          <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-900 to-black">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-800/30 safe-area-top">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Brain size={20} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">MonetizeAI Coach</h3>
                  <p className="text-sm text-gray-400 truncate">مربی هوشمند شما</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatModalOpen(false)}
                className="w-10 h-10 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ml-2"
              >
                <X size={20} className="text-gray-300" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'user' ? (
                    <div className="max-w-[75%]">
                      <div className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white p-3 rounded-2xl">
                        <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-400 opacity-70 mt-1 text-right px-2">{msg.timestamp}</p>
                    </div>
                  ) : (
                    <div className="max-w-[75%]">
                      <div className="bg-gray-700/50 text-white p-3 rounded-2xl">
                        <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-400 opacity-70 mt-1 px-2">{msg.timestamp}</p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-700/50 bg-gray-800/95 safe-area-bottom">
              <div className="flex gap-3 items-center max-w-full">
                <input
                  type="text"
                  placeholder="سوال خود را بپرسید..."
                  className="flex-1 p-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-[#2c189a] focus:ring-1 focus:ring-[#2c189a] transition-colors outline-none min-w-0"
                  style={{ 
                    fontSize: '16px',
                    height: '48px'
                  }}
                />
                <button className="w-12 h-12 bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">➤</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Levels;