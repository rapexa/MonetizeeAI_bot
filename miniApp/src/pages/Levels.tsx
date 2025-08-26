import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import apiService from '../services/api';
import ChatModal from '../components/ChatModal';
import AIMessage from '../components/AIMessage';
import { useAutoScroll } from '../hooks/useAutoScroll';
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
  RefreshCw
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
  const { userData, isAPIConnected } = useApp();
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'stage-detail'>('list');

  // Chat and edit mode states
  const [chatMessage, setChatMessage] = useState<string>('');
  const [isEditingPrompt, setIsEditingPrompt] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: number, text: string, sender: 'user' | 'ai', timestamp: string, isNew?: boolean}>>([]);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const { messagesEndRef, scrollToBottom } = useAutoScroll([chatMessages]);

  // Debug modal state changes
  useEffect(() => {
    console.log('🔥 Modal state changed to:', isChatModalOpen);
  }, [isChatModalOpen]);

  // Debug: Log localStorage contents
  useEffect(() => {
    try {
      const saved = localStorage.getItem('monetize-quiz-results');
      if (saved) {
        console.log('🔍 Current localStorage quiz results:', JSON.parse(saved));
      }
    } catch (error) {
      console.error('❌ Error reading localStorage:', error);
    }
  }, []);

  // Force modal handling
  const handleOpenModal = useCallback(() => {
    console.log('🔥 Opening modal via callback');
    setIsChatModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    console.log('🔥 Closing modal via callback');
    setIsChatModalOpen(false);
  }, []);

  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: any}>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quizResult, setQuizResult] = useState<{passed: boolean, score: number, feedback: string} | null>(null);



  // Initialize stages based on user progress from API
  const [passedStages, setPassedStages] = useState<Set<number>>(new Set([1])); // Only first stage unlocked by default
  // Initialize quiz results from localStorage and user progress
  const [stageQuizResults, setStageQuizResults] = useState<{[key: number]: {passed: boolean, score: number, attempts: number}}>(() => {
    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem('monetize-quiz-results');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📱 Loaded quiz results from localStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error loading quiz results from localStorage:', error);
    }
    return {};
  });

  // Helper function to get stage status based on user progress
  const getStageStatus = (stageId: number): 'locked' | 'available' | 'in_progress' | 'completed' => {
    const currentSession = userData.currentSession || 1;
    const completedStages = currentSession - 1;
    
    if (stageId <= completedStages) {
      return 'completed';
    } else if (stageId === completedStages + 1) {
      return 'available'; // Current stage user can work on
    } else {
      return 'locked';
    }
  };

  // Sync passed stages with user's actual progress from backend
  useEffect(() => {
    if (userData.currentSession && userData.currentSession > 1) {
      // User's current session means they have completed sessions up to currentSession - 1
      const completedStages = userData.currentSession - 1;
      
      // Allow access to stages up to completed + 1 (next available stage)
      const availableStages = [];
      for (let i = 1; i <= Math.min(completedStages + 1, 29); i++) {
        availableStages.push(i);
      }
      
      setPassedStages(new Set(availableStages));
      
      console.log('🔓 Updated available stages based on user progress:', {
        currentSession: userData.currentSession,
        completedStages,
        availableStages: availableStages.length
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
      
      console.log('📊 Merged quiz results:', {
        currentSession: userData.currentSession,
        completedStages,
        generatedResults,
        existingResults: stageQuizResults,
        mergedResults
      });
      
      setStageQuizResults(mergedResults);
    } else {
      // User is at stage 1, no completed stages - keep localStorage results
      console.log('📱 User at stage 1, keeping localStorage results:', stageQuizResults);
    }
  }, [userData.currentSession]);

  // Save quiz results to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('monetize-quiz-results', JSON.stringify(stageQuizResults));
      console.log('💾 Saved quiz results to localStorage:', stageQuizResults);
    } catch (error) {
      console.error('❌ Error saving quiz results to localStorage:', error);
    }
  }, [stageQuizResults]);

  // Define levels state - will be initialized after generateLevels function definition
  const [levels, setLevels] = useState<Level[]>([]);
  
  // Initialize levels only when userData is ready
  useEffect(() => {
    // Only initialize if we have real user data (not defaults)
    if (userData.currentSession && userData.currentSession > 1) {
      console.log('📱 Initializing levels with real user data...');
      setLevels(generateLevels());
    } else if (!userData.currentSession || userData.currentSession === 1) {
      console.log('📱 Initializing levels with default data...');
      setLevels(generateLevels());
    }
  }, []);

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
      console.log('🎯 Auto-selected level based on current session:', {
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
          question: 'یک جدول ساده بکش و ویژگی‌های ایده‌ات رو توش یادداشت کن.',
          placeholder: 'جدول ویژگی‌های ایده...'
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
          question: 'یک جدول مقایسه بساز و ایده‌هات رو از نظر علاقه، سود، و آسانی اجرا امتیاز بده.',
          placeholder: 'جدول مقایسه ایده‌ها...'
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
      13: [
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
      14: [
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
      15: [
        {
          id: 1,
          type: 'short',
          question: 'آیدی پیجت رو بگو.',
          placeholder: 'آیدی پیج اینستاگرام...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک جمله توصیفی برای بیو پیج بنویس.',
          placeholder: 'بیو پیج...'
        },
        {
          id: 3,
          type: 'long',
          question: 'برنامه پست‌گذاری ۷ روز آینده رو توضیح بده.',
          placeholder: 'برنامه پست‌گذاری...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'بهترین راه جذب فالوئر؟',
          options: [
            'محتوای ارزشمند',
            'فالوئر فیک',
            'پست تصادفی',
            'کپشن بی‌هدف'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'اولین پست معرفی پیجت رو آماده کن.',
          placeholder: 'پست معرفی پیج...'
        }
      ],
      16: [
        {
          id: 1,
          type: 'short',
          question: 'بیو فعلی‌ت رو بنویس.',
          placeholder: 'بیو فعلی...'
        },
        {
          id: 2,
          type: 'short',
          question: 'سه عنوان برای هایلایت‌ها پیشنهاد بده.',
          placeholder: 'عناوین هایلایت...'
        },
        {
          id: 3,
          type: 'long',
          question: 'توضیح بده چرا این طراحی بایو و هایلایت باعث جذب مشتری میشه.',
          placeholder: 'دلیل جذب مشتری...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'بهترین بیو برای پیج فروش؟',
          options: [
            'معرفی + مزیت + CTA',
            'جملات بی‌ربط',
            'فقط ایموجی',
            'بدون اطلاعات'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک کاور هایلایت طراحی کن.',
          placeholder: 'توضیح کاور هایلایت...'
        }
      ],
      17: [
        {
          id: 1,
          type: 'short',
          question: 'یک ایده پست آموزشی برای پیجت بنویس.',
          placeholder: 'ایده پست آموزشی...'
        },
        {
          id: 2,
          type: 'short',
          question: 'یک ایده استوری برای نمایش رضایت مشتری بده.',
          placeholder: 'ایده استوری رضایت...'
        },
        {
          id: 3,
          type: 'long',
          question: 'سه پست آموزشی و سه پست اعتمادساز برای ۷ روز آینده برنامه‌ریزی کن.',
          placeholder: 'برنامه محتوای ۷ روزه...'
        },
        {
          id: 4,
          type: 'multiple',
          question: 'کدوم ایده بیشتر اعتماد مشتری رو جلب می‌کنه؟',
          options: [
            'نمایش نتایج واقعی مشتری',
            'عکس محصول خالی',
            'متن طولانی بدون تصویر',
            'بدون محتوا'
          ],
          correct: 0
        },
        {
          id: 5,
          type: 'short',
          question: 'یک اسکرین‌شات یا پیام رضایت مشتری پیدا کن و آماده انتشارش کن.',
          placeholder: 'محتوای رضایت مشتری...'
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
          question: 'یک جدول ساده برای ثبت مشتری‌ها و وضعیت‌شون طراحی کن.',
          placeholder: 'جدول مدیریت مشتری...'
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
          question: '۵ مشتری احتمالی رو لیست کن و اطلاعاتشون رو وارد جدول کن.',
          placeholder: 'لیست و اطلاعات مشتریان...'
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
          question: 'یک جدول ۹۰ روزه برنامه رشدت بساز.',
          placeholder: 'جدول برنامه ۹۰ روزه...'
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
        console.log('🧠 Evaluating quiz with ChatGPT...');
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
          
          // If passed and next stage unlocked, update progress
          if (passed && next_stage_unlocked) {
            setPassedStages(prev => new Set([...prev, selectedStage.id + 1]));
            // Refresh user data to get updated progress
            setTimeout(() => {
              refreshUserData();
              // Re-generate levels to reflect the updated status
              setLevels(generateLevels());
            }, 1000);
          }
          
          console.log('✅ Quiz evaluated successfully:', { passed, score, next_stage_unlocked });
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
      excellent: "🎉 عالی! شما درک کاملی از این مرحله دارید. پاسخ‌هایتان نشان می‌دهد که آماده پیشرفت به مرحله بعد هستید. ادامه دهید!",
      good: "👍 خوب! شما اساس این مرحله را درک کرده‌اید. با کمی مرور بیشتر، می‌تونید به راحتی به مرحله بعد بروید.",
      needsWork: "📚 نیاز به مطالعه بیشتر! پیشنهاد می‌کنم ویدئو آموزشی را دوباره مشاهده کنید و با AI Coach بیشتر صحبت کنید.",
      failed: "🔄 تلاش مجدد! این بار زمان بیشتری برای یادگیری صرف کنید. من آماده کمک به شما هستم!"
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
      console.error('❌ Error evaluating quiz:', error);
      setIsAnalyzing(false);
      
      // Show error message
      setQuizResult({ 
        passed: false, 
        score: 0, 
        feedback: 'خطا در ارزیابی آزمون. لطفاً دوباره تلاش کنید.' 
      });
      setQuizCompleted(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setUserAnswers({});
    setQuizCompleted(false);
    setIsAnalyzing(false);
    setQuizResult(null);
    setShowQuiz(false);
  };

  // Function to refresh user data after stage completion
  const refreshUserData = async () => {
    try {
      if (isAPIConnected) {
        const response = await apiService.getUserProfile();
        if (response.success && response.data) {
          console.log('✅ User data refreshed:', response.data);
          // Update any relevant user data state here if needed
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  };

  // Function to clear quiz results (for testing/debugging)
  const clearQuizResults = () => {
    try {
      localStorage.removeItem('monetize-quiz-results');
      setStageQuizResults({});
      console.log('🧹 Quiz results cleared from localStorage');
    } catch (error) {
      console.error('❌ Error clearing quiz results:', error);
    }
  };

  // Function to navigate to next stage/level
  const navigateToNext = () => {
    if (!selectedStage || !selectedLevel) return;
    
    console.log('🔍 Navigating to next stage/level:', {
      currentStage: selectedStage.title,
      currentLevel: selectedLevel.title
    });
    
    // Try to find next stage in current level
    const nextStageId = selectedStage.id + 1;
    const nextStage = selectedLevel.stages.find(s => s.id === nextStageId);
    
    if (nextStage) {
      // Move to next stage in same level
      setSelectedStage(nextStage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log('✅ Moved to next stage:', nextStage.title);
    } else {
      // Try to move to next level
      const currentLevelIndex = levels.findIndex(l => l.id === selectedLevel.id);
      if (currentLevelIndex < levels.length - 1) {
        const nextLevel = levels[currentLevelIndex + 1];
        const firstStageOfNextLevel = nextLevel.stages[0];
        if (firstStageOfNextLevel) {
          setSelectedLevel(nextLevel);
          setSelectedStage(firstStageOfNextLevel);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('✅ Moved to next level:', nextLevel.title, 'stage:', firstStageOfNextLevel.title);
        }
      } else {
        console.log('🎉 User has completed all levels!');
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
          setTimeout(scrollToBottom, 100);
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
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse = {
        id: chatMessages.length + 2,
        text: '❌ متأسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفا دوباره تلاش کنید.',
        sender: 'ai' as const,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        isNew: true
      };
      setChatMessages(prev => [...prev, errorResponse]);
      setTimeout(scrollToBottom, 100);
    }
  };

  const generateAIResponse = (userMessage: string) => {
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
      console.log('🔢 Level progress calculation:', {
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
          videoTitle: "اصول انتخاب ایده پول‌ساز",
          videoDuration: "40:38",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az1sth1.mp4"
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
          videoTitle: "معیارهای ایده موفق",
          videoDuration: "38:07",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az2sth1.mp4"
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
          videoTitle: "تکنیک‌های Prompting برای ایده‌پردازی",
          videoDuration: "44:32",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az3sth1.mp4"
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
          videoTitle: "تکنیک‌های تصمیم‌گیری",
          videoDuration: "19:23",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az4ath1.mp4"
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
          videoTitle: "طراحی پیش‌نمایش محصول",
          videoDuration: "20:22",
          videoUrl: "https://dl.sianmarketing.com/monetizeAIvideo/video1az5sth1.mp4"
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
              title: "ساخت MVP با No-Code - قسمت اول: انتخاب ابزار",
              duration: "38:51",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1az7sth2.mp4"
            },
            {
              title: "ساخت MVP با No-Code - قسمت دوم: پیاده‌سازی",
              duration: "51:29",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video2az7sth2.mp4"
            },
            {
              title: "ساخت MVP با No-Code - قسمت سوم: تست و بهینه‌سازی",
              duration: "30:44",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video3az7sth2.mp4"
            }
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
              title: "هنر Storytelling و قیمت‌گذاری - قسمت اول: داستان‌گویی",
              duration: "39:07",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video1az8sth2.mp4"
            },
            {
              title: "هنر Storytelling و قیمت‌گذاری - قسمت دوم: استراتژی قیمت‌گذاری",
              duration: "57:33",
              url: "https://dl.sianmarketing.com/monetizeAIvideo/video2az8sth2.mp4"
            }
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
          videoTitle: "طراحی سریع هویت بصری",
          videoDuration: "16:45"
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
          videoTitle: "طراحی با AI Tools",
          videoDuration: "26:30"
        }
      ]
    },
    {
      id: 4,
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
          id: 12,
          title: "راه‌اندازی صفحه فرود حرفه‌ای برای جذب چندکاناله",
          description: "ساخت صفحه فرود جذاب برای تبدیل بازدیدکنندگان به مشتری",
          status: getStageStatus(12),
          exercise: "طراحی و راه‌اندازی صفحه فرود با ابزارهای no-code",
          checklist: [
            "انتخاب پلتفرم ساخت صفحه فرود",
            "طراحی محتوا و CTA های مؤثر",
            "تنظیم tracking و آنالیتیکس"
          ],
          videoTitle: "طراحی صفحه فرود کانورت کننده",
          videoDuration: "24:15"
        },
        {
          id: 13,
          title: "اتصال سیستم پرداخت و درگاه امن",
          description: "راه‌اندازی سیستم پرداخت آنلاین برای دریافت پول",
          status: getStageStatus(13),
          exercise: "تنظیم درگاه پرداخت و اتصال به صفحه فروش",
          checklist: [
            "انتخاب درگاه پرداخت مناسب",
            "اتصال به سیستم فروش",
            "تست کامل فرآیند پرداخت"
          ],
          videoTitle: "راه‌اندازی سیستم پرداخت",
          videoDuration: "18:30"
        },
        {
          id: 14,
          title: "آماده‌سازی کانال‌های پشتیبانی و اولین کانال جذب مکمل",
          description: "ایجاد سیستم پشتیبانی مشتری و کانال جذب مشتری",
          status: getStageStatus(14),
          exercise: "راه‌اندازی چت، ایمیل و کانال جذب اول",
          checklist: [
            "راه‌اندازی سیستم چت پشتیبانی",
            "تنظیم ایمیل پشتیبانی حرفه‌ای",
            "ایجاد اولین کانال جذب مشتری"
          ],
          videoTitle: "راه‌اندازی کانال‌های پشتیبانی",
          videoDuration: "22:45"
        }
      ]
    },
    {
      id: 5,
      title: "حضور و جذب حرفه‌ای در شبکه‌های اجتماعی",
      subtitle: "",
      description: "ایجاد حضور قوی در شبکه‌های اجتماعی برای جذب مشتری",
      goal: "جذب فالوئر هدفمند و تبدیل آن‌ها به مشتری",
      icon: <Users className="w-6 h-6" />,
      color: "text-indigo-600",
      gradient: "from-[#2c189a] to-[#5a189a]",
      isUnlocked: true, // TODO: بعداً برای قفل کردن به false تغییر بده

      stages: [
        {
          id: 15,
          title: "ساخت پیج حرفه‌ای اینستاگرامی برای جذب فالوئر هدفمند",
          description: "راه‌اندازی پیج اینستاگرام حرفه‌ای برای جذب مخاطب هدف",
          status: getStageStatus(15),
          exercise: "راه‌اندازی و بهینه‌سازی پیج اینستاگرام",
          checklist: [
            "تنظیم اکانت بیزنس اینستاگرام",
            "بهینه‌سازی نام و بایو",
            "آپلود محتوای اولیه جذاب"
          ],
          videoTitle: "استراتژی Instagram Business",
          videoDuration: "21:20"
        },
        {
          id: 16,
          title: "طراحی بایو، هایلایت و پروفایل فروشنده‌ساز با AI",
          description: "بهینه‌سازی المان‌های کلیدی پروفایل برای تبدیل",
          status: getStageStatus(16),
          exercise: "طراحی ۵ هایلایت و بایو جذاب با AI",
          checklist: [
            "نوشتن بایو کانورت کننده با AI",
            "طراحی کاور هایلایت‌ها",
            "تنظیم link in bio حرفه‌ای"
          ],
          videoTitle: "بهینه‌سازی پروفایل با AI",
          videoDuration: "16:45"
        },
        {
          id: 17,
          title: "تولید محتوا و استوری اعتمادساز + انتشار در کانال مکمل",
          description: "ایجاد محتوای آموزشی و اعتمادساز با GPT",
          status: getStageStatus(17),
          exercise: "تولید ۱۰ پست و ۲۰ استوری اعتمادساز",
          checklist: [
            "برنامه‌ریزی calendar محتوا",
            "تولید کپشن‌ها با GPT",
            "انتشار در کانال مکمل"
          ],
          videoTitle: "تولید محتوا با AI",
          videoDuration: "28:30"
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
    console.log('🔄 Re-generating levels due to userData change:', {
      currentSession: userData.currentSession,
      currentLevel: userData.currentLevel,
      progressOverall: userData.progressOverall,
      completedTasks: userData.completedTasks
    });
    
    const newLevels = generateLevels();
    setLevels([...newLevels]); // Force array update
    console.log('✅ Levels updated, progress sample:', newLevels.slice(0, 5).map(l => `Level ${l.id}: ${l.progress}%`));
    
    // Debug: Check if levels state actually updated
    setTimeout(() => {
      console.log('🔍 Levels state after update:', levels.slice(0, 3).map(l => `Level ${l.id}: ${l.progress}%`));
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
          console.error('Error loading chat history:', error);
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



  // Render Level Detail Page
  if (viewMode === 'detail' && selectedLevel) {
  return (
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
                {selectedLevel.stages.map((stage, index) => (
                  <div
                    key={stage.id}
                    onClick={() => {
                      if (passedStages.has(stage.id)) {
                        setSelectedStage(stage);
                        setViewMode('stage-detail');
                        // Scroll to top when opening stage detail
                        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    );
  }

  // Render Stage Detail Page
  if (viewMode === 'stage-detail' && selectedStage) {
    return (
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
                      ].map((step, index) => (
                        <div key={step.id} className="flex flex-col items-center">
                          <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all duration-300 mb-2 ${
                            step.completed 
                              ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/25' 
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
                          <p className="text-gray-300 text-sm mt-1">پایه و اساس یادگیری شما</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Video Player(s) */}
                      {selectedStage.videos && selectedStage.videos.length > 0 ? (
                        selectedStage.videos.map((video, index) => (
                          <div key={index} className="mb-4">
                            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-lg mb-4">
                        <div className="aspect-video relative">
                                <video 
                                  controls 
                                  controlsList="nodownload"
                                  className="w-full h-full object-cover"
                                  poster="/video-thumbnail.jpg"
                                >
                                  <source src={video.url} type="video/mp4" />
                                  مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                                </video>
                        </div>
                      </div>

                      {/* Video Info */}
                            <div className="bg-gradient-to-r from-purple-50/80 to-purple-100/80 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-3 border border-purple-200/50 dark:border-purple-800/50 mb-2">
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
                        <div className="mb-4">
                          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-lg mb-4">
                            <div className="aspect-video relative">
                              <video 
                                controls 
                                controlsList="nodownload"
                                className="w-full h-full object-cover"
                                poster="/video-thumbnail.jpg"
                              >
                                <source src={selectedStage.videoUrl} type="video/mp4" />
                                مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                              </video>
                      </div>
                    </div>

                          {/* Video Info */}
                                                      <div className="bg-gradient-to-r from-purple-50/80 to-purple-100/80 dark:from-purple-900/20 dark:to-purple-800/50 dark:border-purple-800/50 mb-2">
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
                          <h3 className="text-lg font-bold text-white">قدم دوم: AI Coach</h3>
                          <p className="text-gray-300 text-sm mt-1">با کمک AI کوچ و ابزارهای حرفه‌ای</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6" data-chat-section>


                      {/* Full AI Coach Chat Interface */}
                      <div className="bg-gray-900/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-gray-700/60 shadow-lg w-full h-[500px] flex flex-col">
                        {/* Header */}
            <div className="flex items-center justify-between gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <div className="relative">
                <div className="p-2 md:p-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-xl shadow-lg">
                  <Brain size={20} className="text-white md:w-6 md:h-6" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="truncate">MonetizeAI Coach</span>
                  <Sparkles size={16} className="text-[#8B5CF6] flex-shrink-0 md:w-[18px] md:h-[18px]" />
                    </h3>
                <p className="text-xs md:text-sm text-[#8B5CF6] dark:text-[#8B5CF6] flex items-center gap-1">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                  <span className="truncate">۲۴/۷ آنلاین - آماده کمک</span>
                </p>
                  </div>
                <div className="text-xs bg-[#8B5CF6]/20 dark:bg-[#8B5CF6]/20 text-[#8B5CF6] dark:text-[#8B5CF6] px-2 md:px-3 py-1 rounded-full border border-[#8B5CF6]/30 dark:border-[#8B5CF6]/30 flex-shrink-0">
                  AI
                </div>
              </div>
              
              <div className="flex-shrink-0">
              <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔥 Button clicked, current state:', isChatModalOpen);
                    handleOpenModal();
                  }}
                  className="p-2 hover:bg-gray-100/20 dark:hover:bg-gray-700/20 rounded-lg transition-colors duration-200 cursor-pointer"
                title="بزرگ کردن چت"
                  type="button"
              >
                <Maximize2 size={18} className="text-gray-600 dark:text-gray-300" />
              </button>
                        </div>
            </div>

                        {/* Chat Messages */}
            <div className="bg-gray-800/80 dark:bg-gray-800/80 rounded-xl p-2 md:p-3 mb-4 flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 border border-gray-700/60 shadow-inner">
                          {/* Chat Messages */}
                          {chatMessages.map((message, index) => (
                            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {message.sender === 'user' ? (
                                <div className="max-w-xs lg:max-w-md">
                                  <div className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white p-4 rounded-2xl">
                                    <p className="text-sm leading-relaxed">{message.text}</p>
                                  </div>
                                  <p className="text-xs text-gray-400 dark:text-gray-400 opacity-70 mt-2 text-right px-2">{message.timestamp}</p>
                                </div>
                              ) : (
                                <AIMessage
                                  message={message.text}
                                  timestamp={message.timestamp}
                                  isLatest={index === chatMessages.length - 1}
                                  isNew={message.isNew || false}
                                  onTypingComplete={scrollToBottom}
                                />
                              )}
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
            </div>

                        {/* Input Area */}
                        <div className="space-y-4">
                            {isEditingPrompt ? (
                              <>
                              <div className="flex items-center justify-between">
                                <h6 className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                  ویرایش پرامپت - جاهای خالی رو پر کنید:
                                </h6>
                                <button
                                  onClick={handleCancelPromptEdit}
                                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                  انصراف ✕
                                </button>
                              </div>
                              
                              <textarea
                                  value={chatMessage}
                                  onChange={(e) => setChatMessage(e.target.value)}
                                  placeholder="پرامپت خود را ویرایش کنید..."
                                className="w-full h-32 px-4 py-3 bg-white/80 dark:bg-gray-700/70 backdrop-blur-md rounded-xl border border-purple-300/50 dark:border-purple-600/50 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 resize-none leading-relaxed"
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
                                  className="px-4 py-3 bg-gray-200/70 dark:bg-gray-600/70 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-300/70 dark:hover:bg-gray-500/70 transition-all duration-300 flex-shrink-0"
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
                                  className="flex-1 min-w-0 px-3 py-2 bg-white/70 dark:bg-gray-700/60 backdrop-blur-md rounded-xl border border-purple-200/30 dark:border-purple-700/30 text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                            className="w-full py-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 border border-purple-200/50 dark:border-purple-700/50 hover:border-purple-300/70 dark:hover:border-purple-600/70 rounded-lg hover:bg-purple-50/30 dark:hover:bg-purple-900/20 transition-all duration-300 flex items-center justify-center gap-1 truncate"
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
                      ? 'border-green-600/60 shadow-green-500/20' 
                      : stageQuizResults[selectedStage.id] 
                      ? 'border-red-600/60 shadow-red-500/20'
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
                            <p className={`text-sm mt-1 transition-all duration-300 ${
                              stageQuizResults[selectedStage.id]?.passed 
                                ? 'text-green-200' 
                                : stageQuizResults[selectedStage.id] 
                                ? 'text-red-200'
                                : 'text-gray-300'
                            }`}>
                              {stageQuizResults[selectedStage.id]?.passed 
                                ? '✅ تکمیل شده' 
                                : stageQuizResults[selectedStage.id] 
                                ? '❌ نیاز به تلاش مجدد'
                                : 'تست میزان یادگیری شما'
                              }
                            </p>
                          </div>
                      </div>
                    </div>

                    <div className="p-6">
              {/* Quiz Result Status */}
              {stageQuizResults[selectedStage.id] ? (
                <div className={`rounded-2xl p-6 mb-6 border-2 ${
                  stageQuizResults[selectedStage.id].passed 
                    ? 'bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300/60 dark:border-green-600/60' 
                    : 'bg-gradient-to-r from-red-50/80 to-pink-50/80 dark:from-red-900/30 dark:to-pink-900/30 border-red-300/60 dark:border-red-600/60'
                }`}>
                  <div className="flex items-center gap-4 mb-4">
                    {stageQuizResults[selectedStage.id].passed ? (
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
                        stageQuizResults[selectedStage.id].passed 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {stageQuizResults[selectedStage.id].passed ? '🎉 تبریک! شما در آزمون موفق شدید!' : '📚 متأسفانه در آزمون موفق نشدید'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        امتیاز: <span className="font-semibold">{stageQuizResults[selectedStage.id].score}%</span> • 
                        تلاش: <span className="font-semibold">{stageQuizResults[selectedStage.id].attempts}</span>
                      </p>
                      {stageQuizResults[selectedStage.id].passed && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          ✅ این مرحله برای شما باز شده است
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
              
              <button 
                onClick={() => setShowQuiz(true)}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex items-center justify-center gap-3 ${
                  stageQuizResults[selectedStage.id]?.passed 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white shadow-lg shadow-[#2c189a]/30'
                }`}
              >
                {stageQuizResults[selectedStage.id]?.passed ? (
                  <>
                    <RefreshCw className="w-6 h-6" />
                    آزمون مجدد
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-6 h-6" />
                    شروع آزمون
                  </>
                )}
              </button>
                </div>
                </div>
                    </div>
                    


              </div>

              {/* Next Stage Card - Always show */}
              <div className="backdrop-blur-xl rounded-xl border border-white/20 dark:border-gray-700/20 shadow-lg overflow-hidden mx-6 mb-6" style={{ backgroundColor: '#11091C' }}>
                <div className={`p-3 transition-all duration-500 ${
                  stageQuizResults[selectedStage.id]?.passed 
                    ? 'bg-gradient-to-r from-slate-700 via-gray-800 to-slate-700' 
                    : 'bg-gradient-to-r from-gray-600 via-slate-600 to-gray-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`transition-all duration-300 ${
                        stageQuizResults[selectedStage.id]?.passed 
                          ? 'text-green-400' 
                          : 'text-gray-400'
                      }`}>
                        {stageQuizResults[selectedStage.id]?.passed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {stageQuizResults[selectedStage.id]?.passed 
                            ? 'آماده برای مرحله بعدی' 
                            : 'ابتدا آزمون را تکمیل کنید'
                          }
                        </h4>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (!stageQuizResults[selectedStage.id]?.passed) {
                          alert('ابتدا باید آزمون این مرحله را با موفقیت بگذرانید!');
                          return;
                        }
                        navigateToNext();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                        stageQuizResults[selectedStage.id]?.passed
                          ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                          : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/30'
                      }`}
                    >
                      <span>
                        {(() => {
                          const nextStageId = selectedStage.id + 1;
                          const nextStage = selectedLevel?.stages.find(s => s.id === nextStageId);
                          if (nextStage) {
                            return `مرحله بعدی: ${nextStage.title}`;
                          } else {
                            // Check if there's a next level
                            const currentLevelIndex = levels.findIndex(l => l.id === selectedLevel?.id);
                            if (currentLevelIndex < levels.length - 1) {
                              const nextLevel = levels[currentLevelIndex + 1];
                              return `سطح بعدی: ${nextLevel.title}`;
                            }
                            return 'مرحله آخر';
                          }
                        })()}
                      </span>
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </div>
              </div>

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

                    {/* Score */}
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl p-4 mb-6 border border-white/20 dark:border-gray-700/20">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {quizResult?.score}%
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">
                        امتیاز شما
                      </div>
                    </div>

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
                      
                      {quizResult?.passed ? (
                        <button
                          onClick={() => {
                            resetQuiz();
                            // Mark stage as completed
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-green-500/30"
                        >
                          <CheckCircle2 size={16} />
                          تکمیل مرحله
                        </button>
                      ) : (
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
                    </div>
                  </div>
                )}
              </div>
              {/* Add bottom padding for better scrolling */}
              <div className="h-20"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Levels List Page
  return (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {/* Decorative Line */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/3 w-px h-8 bg-gradient-to-b from-transparent via-green-500/50 to-transparent transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-2/3 w-px h-8 bg-gradient-to-b from-transparent via-green-500/50 to-transparent transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
          
          {/* Vertical Dashed Line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 pointer-events-none">
            <div 
              className="absolute top-[10rem] bottom-[2rem] w-full"
              style={{
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 2px, #10b981 2px, #10b981 8px)',
                backgroundSize: '1px 10px',
              }}
            ></div>
            {/* Arrow pointing down */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
              style={{
                bottom: '2rem',
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
              className={`relative overflow-hidden rounded-3xl border transition-all duration-500 ${
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

        {/* Level Detail Modal */}
        {/* پاپ‌آپ قدیمی حذف شد - حالا از صفحه جداگانه استفاده می‌کنیم */}


      </div>
      
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
                onClick={handleCloseModal}
                className="w-10 h-10 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ml-2"
              >
                <X size={20} className="text-gray-300" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {chatMessages.map((msg, index) => (
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
  );
};

export default Levels;