import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { ArrowRight, Zap, Target, Trophy, Clock, Play, Pause, RotateCcw, Star, Award, TrendingUp, Brain, Heart, CheckCircle, X, Flame, Timer, User, Settings, Volume2, VolumeX, SkipForward, Rewind, FastForward } from 'lucide-react';

interface Challenge {
  id: number;
  title: string;
  description: string;
  duration: number; // in minutes
  energy: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'focus' | 'motivation' | 'productivity' | 'mindfulness' | 'creativity' | 'learning';
  completed: boolean;
  icon: React.ElementType;
  color: string;
  benefits: string[];
  instructions: string[];
  audioUrl?: string;
}

interface Session {
  id: number;
  challengeId: number;
  date: string;
  duration: number;
  completed: boolean;
  rating?: number;
  notes?: string;
}

interface WeeklyStats {
  totalMinutes: number;
  completedChallenges: number;
  energyEarned: number;
  streak: number;
  averageRating: number;
  favoriteCategory: string;
}

const EnergyBoost: React.FC = () => {
  const navigate = useNavigate();
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [completedSessions, setCompletedSessions] = useState<Session[]>([]);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const [sessionRating, setSessionRating] = useState(5);
  const [sessionNotes, setSessionNotes] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalMinutes: 245,
    completedChallenges: 12,
    energyEarned: 580,
    streak: 5,
    averageRating: 4.6,
    favoriteCategory: 'focus'
  });

  const challenges: Challenge[] = [
    {
      id: 1,
      title: 'فوکوس عمیق',
      description: 'تکنیک پومودورو برای تمرکز حداکثری روی کارهای مهم و افزایش بهره‌وری',
      duration: 25,
      energy: 50,
      difficulty: 'medium',
      category: 'focus',
      completed: false,
      icon: Target,
      color: 'from-blue-500 to-cyan-500',
      benefits: ['افزایش تمرکز تا ۸۰%', 'کاهش حواس‌پرتی', 'بهبود کیفیت کار', 'مدیریت بهتر زمان'],
      instructions: [
        'محیط کار خود را از هرگونه حواس‌پرتی پاک کنید',
        'یک کار مشخص انتخاب کنید و روی آن متمرکز شوید',
        'تایمر را روی ۲۵ دقیقه تنظیم کنید',
        'تا پایان زمان فقط روی همان کار کار کنید',
        'پس از اتمام ۵ دقیقه استراحت کنید'
      ]
    },
    {
      id: 2,
      title: 'انرژی صبحگاهی',
      description: 'تمرین ۱۰ دقیقه‌ای برای شروع قدرتمند روز با انرژی مثبت',
      duration: 10,
      energy: 30,
      difficulty: 'easy',
      category: 'motivation',
      completed: true,
      icon: Flame,
      color: 'from-orange-500 to-red-500',
      benefits: ['افزایش انرژی روزانه', 'بهبود خلق و روحیه', 'آمادگی ذهنی', 'انگیزه بیشتر'],
      instructions: [
        'در جای آرامی بنشینید یا بایستید',
        'چند نفس عمیق بکشید',
        'اهداف روز خود را مرور کنید',
        'تصور کنید که روز موفقی خواهید داشت',
        'با انرژی مثبت روز را شروع کنید'
      ]
    },
    {
      id: 3,
      title: 'بهره‌وری حرفه‌ای',
      description: 'جلسه ۴۵ دقیقه‌ای کار عمیق بدون وقفه برای پروژه‌های مهم',
      duration: 45,
      energy: 80,
      difficulty: 'hard',
      category: 'productivity',
      completed: false,
      icon: Trophy,
              color: 'from-[#5a0ecc] to-pink-500',
      benefits: ['تکمیل پروژه‌های بزرگ', 'کیفیت بالای کار', 'احساس موفقیت', 'پیشرفت قابل توجه'],
      instructions: [
        'پروژه یا کار مهمی را انتخاب کنید',
        'تمام ابزارهای لازم را آماده کنید',
        'گوشی و اعلان‌ها را خاموش کنید',
        '۴۵ دقیقه بدون وقفه کار کنید',
        'در پایان پیشرفت خود را ارزیابی کنید'
      ]
    },
    {
      id: 4,
      title: 'آرامش ذهن',
      description: 'مدیتیشن و تنفس عمیق برای کاهش استرس و افزایش تمرکز',
      duration: 15,
      energy: 40,
      difficulty: 'easy',
      category: 'mindfulness',
      completed: false,
      icon: Heart,
      color: 'from-green-500 to-emerald-500',
      benefits: ['کاهش استرس و اضطراب', 'آرامش ذهنی', 'تعادل عاطفی', 'بهبود خواب'],
      instructions: [
        'در جای آرام و راحتی بنشینید',
        'چشمان خود را ببندید',
        'روی تنفس خود متمرکز شوید',
        'افکار را بدون قضاوت رها کنید',
        'حس آرامش را در بدن احساس کنید'
      ]
    },
    {
      id: 5,
      title: 'چالش سرعت',
      description: 'انجام سریع کارهای کوچک و معوقه در ۵ دقیقه',
      duration: 5,
      energy: 20,
      difficulty: 'easy',
      category: 'productivity',
      completed: false,
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      benefits: ['حذف تعلل', 'احساس پیشرفت', 'انگیزه بیشتر', 'تمیز کردن لیست کارها'],
      instructions: [
        'لیستی از کارهای کوچک تهیه کنید',
        'کارهایی که زیر ۲ دقیقه طول می‌کشند انتخاب کنید',
        'تایمر را روی ۵ دقیقه بگذارید',
        'تا جایی که می‌توانید کار انجام دهید',
        'تعداد کارهای انجام شده را بشمارید'
      ]
    },
    {
      id: 6,
      title: 'تمرکز خلاقانه',
      description: 'جلسه ۳۰ دقیقه‌ای برای کارهای خلاقانه و ایده‌پردازی',
      duration: 30,
      energy: 60,
      difficulty: 'medium',
      category: 'creativity',
      completed: false,
      icon: Brain,
              color: 'from-indigo-500 to-[#5a0ecc]',
      benefits: ['تقویت خلاقیت', 'ایده‌های نوآورانه', 'حل مسائل پیچیده', 'تفکر خارج از چارچوب'],
      instructions: [
        'موضوع یا مسئله‌ای برای کار انتخاب کنید',
        'ابزارهای خلاقانه (کاغذ، قلم، نرم‌افزار) آماده کنید',
        'ذهن خود را از قضاوت آزاد کنید',
        'هر ایده‌ای که به ذهنتان می‌رسد یادداشت کنید',
        'ایده‌ها را ترکیب و توسعه دهید'
      ]
    },
    {
      id: 7,
      title: 'یادگیری فعال',
      description: 'تکنیک‌های مطالعه مؤثر برای یادگیری بهتر و سریع‌تر',
      duration: 20,
      energy: 45,
      difficulty: 'medium',
      category: 'learning',
      completed: false,
      icon: Award,
      color: 'from-teal-500 to-blue-500',
      benefits: ['یادگیری سریع‌تر', 'حفظ بهتر مطالب', 'درک عمیق‌تر', 'اعتماد به نفس بیشتر'],
      instructions: [
        'مطلب یا مهارتی برای یادگیری انتخاب کنید',
        'هدف مشخصی تعریف کنید',
        'مطالب را به بخش‌های کوچک تقسیم کنید',
        'هر بخش را فعالانه تمرین کنید',
        'آموخته‌ها را با کلمات خود توضیح دهید'
      ]
    },
    {
      id: 8,
      title: 'انرژی بعدازظهر',
      description: 'غلبه بر خستگی بعدازظهر و بازیابی انرژی',
      duration: 12,
      energy: 35,
      difficulty: 'easy',
      category: 'motivation',
      completed: false,
      icon: TrendingUp,
      color: 'from-amber-500 to-yellow-500',
      benefits: ['غلبه بر خستگی', 'انرژی مجدد', 'تمرکز بهتر', 'ادامه مؤثر روز'],
      instructions: [
        'از صندلی بلند شوید و کمی راه بروید',
        'چند حرکت کششی انجام دهید',
        'آب بنوشید و تنفس عمیق کنید',
        'اهداف باقی‌مانده روز را مرور کنید',
        'با انرژی تازه به کار ادامه دهید'
      ]
    }
  ];

  const categories = [
    { id: 'all', name: 'همه', icon: Star, color: 'text-gray-600' },
    { id: 'focus', name: 'تمرکز', icon: Target, color: 'text-blue-600' },
    { id: 'motivation', name: 'انگیزه', icon: Flame, color: 'text-orange-600' },
            { id: 'productivity', name: 'بهره‌وری', icon: Trophy, color: 'text-[#5a0ecc]' },
    { id: 'mindfulness', name: 'آرامش', icon: Heart, color: 'text-green-600' },
    { id: 'creativity', name: 'خلاقیت', icon: Brain, color: 'text-indigo-600' },
    { id: 'learning', name: 'یادگیری', icon: Award, color: 'text-teal-600' }
  ];

  const filteredChallenges = selectedCategory === 'all' 
    ? challenges 
    : challenges.filter(c => c.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100/70 dark:text-green-400 dark:bg-green-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100/70 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'hard': return 'text-red-600 bg-red-100/70 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100/70 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'آسان';
      case 'medium': return 'متوسط';
      case 'hard': return 'سخت';
      default: return 'نامشخص';
    }
  };

  const startTimer = (challengeId: number, duration: number) => {
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge) {
      setSelectedChallenge(challenge);
      setActiveTimer(challengeId);
      setTimeLeft(duration * 60); // Convert to seconds
      setIsRunning(true);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(0);
    setActiveTimer(null);
    setSelectedChallenge(null);
  };

  const completeChallenge = () => {
    if (selectedChallenge) {
      setShowSessionComplete(true);
      setIsRunning(false);
    }
  };

  const saveSession = () => {
    if (selectedChallenge) {
      const newSession: Session = {
        id: Date.now(),
        challengeId: selectedChallenge.id,
        date: new Date().toISOString(),
        duration: selectedChallenge.duration,
        completed: true,
        rating: sessionRating,
        notes: sessionNotes
      };

      setCompletedSessions([...completedSessions, newSession]);
      setWeeklyStats(prev => ({
        ...prev,
        totalMinutes: prev.totalMinutes + selectedChallenge.duration,
        completedChallenges: prev.completedChallenges + 1,
        energyEarned: prev.energyEarned + selectedChallenge.energy,
        averageRating: (prev.averageRating * prev.completedChallenges + sessionRating) / (prev.completedChallenges + 1)
      }));

      // Mark challenge as completed
      const challengeIndex = challenges.findIndex(c => c.id === selectedChallenge.id);
      if (challengeIndex !== -1) {
        challenges[challengeIndex].completed = true;
      }

      setShowSessionComplete(false);
      setSessionRating(5);
      setSessionNotes('');
      resetTimer();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const openChallengeModal = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setShowChallengeModal(true);
  };

  const skipTime = (seconds: number) => {
    setTimeLeft(Math.max(0, timeLeft + seconds));
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            completeChallenge();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Sound notification
  useEffect(() => {
    if (timeLeft === 0 && activeTimer && soundEnabled) {
      // Play completion sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    }
  }, [timeLeft, activeTimer, soundEnabled]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50/50 to-slate-50 transition-colors duration-300 page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
          html.dark .page-container {
            background: #08000f !important;
          }
          @media (prefers-color-scheme: dark) {
            .page-container {
              background: #08000f !important;
            }
          }
        `
      }} />
      {/* Header */}
              <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200/20 dark:border-gray-700/20 px-4 py-4 sticky top-0 z-10 transition-colors duration-300 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
            >
              <ArrowRight size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white transition-colors duration-300">انرژی بوست</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">تمرین‌های تمرکز و بهره‌وری</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors duration-300 ${
                soundEnabled 
                  ? 'bg-green-100/70 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                  : 'bg-gray-100/70 dark:bg-gray-700/70 text-gray-400 dark:text-gray-500'
              }`}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <div className="flex items-center gap-1 bg-orange-100/70 dark:bg-orange-900/30 px-3 py-1 rounded-full backdrop-blur-sm">
              <Flame size={16} className="text-orange-500" />
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400 transition-colors duration-300">{weeklyStats.energyEarned}</span>
            </div>
                    <div className="flex items-center gap-1 bg-[#5a0ecc]/10 dark:bg-[#5a0ecc]/30 px-3 py-1 rounded-full backdrop-blur-sm">
          <Trophy size={16} className="text-[#5a0ecc]" />
          <span className="text-sm font-bold text-[#5a0ecc] dark:text-[#5a0ecc]/80 transition-colors duration-300">{weeklyStats.streak}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* Active Timer */}
        {activeTimer && selectedChallenge && (
          <Card className="mb-6 bg-gradient-to-r from-orange-50/80 to-red-50/80 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200/50 dark:border-orange-800/50 backdrop-blur-sm transition-colors duration-300 shadow-xl">
            <div className="text-center">
              <div className="relative mb-4">
                <div className="w-40 h-40 mx-auto bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md transition-colors duration-300 border border-orange-200/50 dark:border-orange-700/50">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 transition-colors duration-300 mb-2">
                      {formatTime(timeLeft)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                      {isRunning ? 'در حال اجرا' : 'متوقف'}
                    </div>
                  </div>
                </div>
                
                {/* Progress Ring */}
                <svg className="absolute inset-0 w-40 h-40 mx-auto transform -rotate-90" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-orange-200 dark:text-orange-800"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (timeLeft / (selectedChallenge.duration * 60))}`}
                    className="text-orange-500 dark:text-orange-400 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              
              <h3 className="font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300 text-lg">
                {selectedChallenge.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {selectedChallenge.description}
              </p>
              
              {/* Timer Controls */}
              <div className="flex justify-center gap-2 mb-4">
                <button
                  onClick={() => skipTime(-60)}
                  className="p-2 bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-all duration-300"
                >
                  <Rewind size={16} />
                </button>
                <button
                  onClick={toggleTimer}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                    isRunning 
                      ? 'bg-gradient-to-r from-red-500 to-pink-500' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-500'
                  }`}
                >
                  {isRunning ? <Pause size={18} /> : <Play size={18} />}
                  {isRunning ? 'توقف' : 'شروع'}
                </button>
                <button
                  onClick={() => skipTime(60)}
                  className="p-2 bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-all duration-300"
                >
                  <FastForward size={16} />
                </button>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={resetTimer}
                  className="flex items-center gap-2 bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-bold hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-all duration-300 backdrop-blur-sm"
                >
                  <RotateCcw size={16} />
                  ریست
                </button>
                <button
                  onClick={completeChallenge}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-xl font-bold hover:shadow-lg transition-all duration-300"
                >
                  <CheckCircle size={16} />
                  تکمیل
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Weekly Stats */}
        <Card className="mb-6 bg-gradient-to-r from-purple-50/80 to-blue-50/80 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200/50 dark:border-purple-800/50 backdrop-blur-sm">
          <div className="text-center mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">آمار این هفته</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100/70 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                  <Clock size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{weeklyStats.totalMinutes}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">دقیقه تمرین</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100/70 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                  <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{weeklyStats.completedChallenges}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">چالش تکمیل شده</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100/70 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                  <Zap size={24} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{weeklyStats.energyEarned}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">انرژی کسب شده</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100/70 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                  <Star size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{weeklyStats.averageRating.toFixed(1)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">میانگین امتیاز</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Category Filter */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">دسته‌بندی چالش‌ها</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-700/70'
                } backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50`}
              >
                <category.icon size={16} />
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Challenges */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white transition-colors duration-300">
              {selectedCategory === 'all' ? 'تمام چالش‌ها' : categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredChallenges.length} چالش
            </span>
          </div>
          
          {filteredChallenges.map((challenge) => {
            const IconComponent = challenge.icon;
            
            return (
              <Card 
                key={challenge.id} 
                className={`cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${
                  challenge.completed 
                    ? 'bg-green-50/70 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/50' 
                    : 'bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50'
                } backdrop-blur-sm`}
                onClick={() => openChallengeModal(challenge)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${challenge.color} text-white shadow-lg flex-shrink-0 relative`}>
                    <IconComponent size={24} />
                    {challenge.completed && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white transition-colors duration-300">{challenge.title}</h3>
                      {challenge.completed && (
                        <div className="w-5 h-5 bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center transition-colors duration-300">
                          <CheckCircle size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 transition-colors duration-300 line-clamp-2">
                      {challenge.description}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs mb-3">
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Timer size={12} />
                        <span>{challenge.duration} دقیقه</span>
                      </div>
                      <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                        <Zap size={12} />
                        <span>+{challenge.energy}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(challenge.difficulty)} backdrop-blur-sm`}>
                        {getDifficultyText(challenge.difficulty)}
                      </span>
                    </div>

                    {!challenge.completed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startTimer(challenge.id, challenge.duration);
                        }}
                        disabled={activeTimer !== null}
                        className={`w-full py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                          activeTimer === null
                            ? `bg-gradient-to-r ${challenge.color} text-white hover:shadow-lg hover:scale-105`
                            : 'bg-gray-200/70 dark:bg-gray-700/70 text-gray-400 dark:text-gray-500 backdrop-blur-sm'
                        }`}
                      >
                        {activeTimer === challenge.id ? 'در حال اجرا...' : 'شروع چالش'}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Challenge Detail Modal */}
      {showChallengeModal && selectedChallenge && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl p-6 w-full max-w-sm shadow-2xl backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedChallenge.title}</h3>
              <button 
                onClick={() => setShowChallengeModal(false)}
                className="p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-lg transition-colors duration-300"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className={`w-16 h-16 bg-gradient-to-r ${selectedChallenge.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
              <selectedChallenge.icon size={28} className="text-white" />
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              {selectedChallenge.description}
            </p>

            {/* Challenge Info */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-lg p-3 backdrop-blur-sm">
                <Timer size={20} className="text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <div className="text-sm font-bold text-gray-900 dark:text-white">{selectedChallenge.duration} دقیقه</div>
              </div>
              <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-lg p-3 backdrop-blur-sm">
                <Zap size={20} className="text-orange-600 dark:text-orange-400 mx-auto mb-1" />
                <div className="text-sm font-bold text-gray-900 dark:text-white">+{selectedChallenge.energy}</div>
              </div>
              <div className="text-center bg-gray-50/70 dark:bg-gray-700/70 rounded-lg p-3 backdrop-blur-sm">
                <Star size={20} className="text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                <div className={`text-sm font-bold ${getDifficultyColor(selectedChallenge.difficulty).split(' ')[0]}`}>
                  {getDifficultyText(selectedChallenge.difficulty)}
                </div>
              </div>
            </div>
            
            {/* Instructions */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">دستورالعمل:</h4>
              <ol className="space-y-2">
                {selectedChallenge.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    {instruction}
                  </li>
                ))}
              </ol>
            </div>

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white">فواید این چالش:</h4>
              <ul className="space-y-2">
                {selectedChallenge.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChallengeModal(false);
                  startTimer(selectedChallenge.id, selectedChallenge.duration);
                }}
                disabled={activeTimer !== null || selectedChallenge.completed}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all duration-300 ${
                  activeTimer === null && !selectedChallenge.completed
                    ? `bg-gradient-to-r ${selectedChallenge.color} hover:shadow-lg hover:scale-105`
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {selectedChallenge.completed ? 'تکمیل شده ✓' : 'شروع چالش'}
              </button>
              <button 
                onClick={() => setShowChallengeModal(false)}
                className="px-6 py-3 bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-all duration-300 backdrop-blur-sm"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Complete Modal */}
      {showSessionComplete && selectedChallenge && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl p-6 w-full max-w-sm shadow-2xl backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Trophy size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">تبریک! چالش تکمیل شد</h3>
              <p className="text-gray-600 dark:text-gray-300">
                شما {selectedChallenge.duration} دقیقه تمرین کردید و {selectedChallenge.energy} انرژی کسب کردید!
              </p>
            </div>

            {/* Rating */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">این جلسه را چطور ارزیابی می‌کنید؟</h4>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSessionRating(rating)}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      rating <= sessionRating
                        ? 'text-yellow-500'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  >
                    <Star size={24} className={rating <= sessionRating ? 'fill-current' : ''} />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">یادداشت (اختیاری):</h4>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="چه احساسی داشتید؟ چه چیزی یاد گرفتید؟"
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50/70 dark:bg-gray-700/70 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-colors duration-300 backdrop-blur-sm"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveSession}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300"
              >
                ذخیره و ادامه
              </button>
              <button
                onClick={() => {
                  setShowSessionComplete(false);
                  resetTimer();
                }}
                className="px-6 py-3 bg-gray-200/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300/70 dark:hover:bg-gray-600/70 transition-all duration-300 backdrop-blur-sm"
              >
                رد کردن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnergyBoost;