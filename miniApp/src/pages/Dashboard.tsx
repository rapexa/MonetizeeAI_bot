import React from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';
// import Card from '../components/Card';
// import RadialGauge from '../components/RadialGauge';

import AIMessage from '../components/AIMessage';
import OnboardingStories from '../components/OnboardingStories';
import GuideModal from '../components/GuideModal';

import { 
  TrendingUp, 
  Users, 
  Sparkles, 
  Brain, 
  User, 
  Settings, 
  UserPlus, 
  MessageCircle, 
  Zap, 
  DollarSign,
  X,
  Clock,
  Gift,
  Trophy,
  Upload,
  AlertCircle,
  Rocket,
  Package,
  Search,
  Map,
  Maximize2,
  BarChart3,
  Crown,
  Edit3
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { userData, setUserData, isAPIConnected, isInTelegram, loadingUser, hasRealData, refreshUserData } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [animatedText, setAnimatedText] = React.useState<string>('');
  const [isEditingIncome, setIsEditingIncome] = React.useState<boolean>(false);
  const [tempIncome, setTempIncome] = React.useState<string>('');
  // بررسی اینکه آیا استوری قبلاً دیده شده یا نه
  // استوری فقط یک بار در کل عمر نمایش داده می‌شود
  const hasSeenStories = localStorage.getItem('hasSeenOnboardingStories') === 'true';
  const [showOnboarding, setShowOnboarding] = React.useState<boolean>(!hasSeenStories);
  const [showGuideModal, setShowGuideModal] = React.useState<boolean>(false);
  const [showGuideNotification, setShowGuideNotification] = React.useState<boolean>(false);

  // Check if user can access AI tools
  // Paid users: always have access
  // Free trial users: can access once (check if already used)
  const canAccessAITools = () => {
    if (userData.subscriptionType === 'paid') {
      return true;
    }
    // Free trial users can access if they haven't used it yet
    // We'll check individual tools in the click handlers
    return true; // Allow access, but individual tools will check usage
  };

  // Check if user can access specific AI tool (for free_trial users)
  const hasUsedAITool = (toolKey: string) => {
    return localStorage.getItem(toolKey) === 'true';
  };

  // Check if user can access CRM - NO RESTRICTIONS, everyone has access
  const canAccessCRM = () => {
    return true; // CRM is available for everyone, no restrictions
  };

  const [tempValue, setTempValue] = React.useState<string>('');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfileUpload, setShowProfileUpload] = React.useState(false);
  const [profileImage, setProfileImage] = React.useState<string | null>(null);
  const [telegramProfilePhoto, setTelegramProfilePhoto] = React.useState<string | null>(null);
  const [chatMessage, setChatMessage] = React.useState<string>('');
  const [isEditingPrompt, setIsEditingPrompt] = React.useState<boolean>(false);
  const [chatMessages, setChatMessages] = React.useState<Array<{id: number, text: string, sender: 'user' | 'ai', timestamp: string, isNew?: boolean}>>([]);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  // Remove auto-scroll for Dashboard - it's not needed here
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };

  // Check if user is at bottom of chat
  const checkScrollPosition = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10; // 10px tolerance
      setShowScrollButton(!isAtBottom && chatMessages.length > 0);
    }
  };

  // ⚡ PERFORMANCE: Defer profile photo loading (non-critical)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user) {
          const photoUrl = (user as any).photo_url;
          if (photoUrl) {
            setTelegramProfilePhoto(photoUrl);
          } else if (userData.telegramId) {
            const userPhotoUrl = (userData as any).profilePhotoUrl;
            if (userPhotoUrl) {
              setTelegramProfilePhoto(userPhotoUrl);
            }
          }
        }
      }
    }, 300); // Load after 300ms delay
    
    return () => clearTimeout(timer);
  }, [userData, isInTelegram]);

  // ⚡ PERFORMANCE: Reduced auto refresh interval from 30s to 120s (2 minutes) for better performance
  React.useEffect(() => {
    if (!isAPIConnected) return;
    
    // Refresh data every 2 minutes (reduced frequency for better performance)
    const refreshInterval = setInterval(async () => {
      await refreshUserData();
    }, 120000); // 120 seconds (2 minutes)
    
    return () => clearInterval(refreshInterval);
  }, [isAPIConnected, refreshUserData]);
  
  // Manual refresh function for user action
  const handleManualRefresh = async () => {
    await refreshUserData();
  };

  // Check and start guide notification timer on mount
  React.useEffect(() => {
    const hasSeenStories = localStorage.getItem('hasSeenOnboardingStories') === 'true';
    const guideNotifCount = parseInt(localStorage.getItem('guideNotificationCount') || '0');
    
    // ⚡ PERFORMANCE: Removed console.log for better performance
    // اگر استوری‌ها دیده شده ولی نوتیفیکیشن هنوز نشون داده نشده
    if (hasSeenStories && guideNotifCount === 0) {
      const timer = setTimeout(() => {
        const currentCount = parseInt(localStorage.getItem('guideNotificationCount') || '0');
        if (currentCount === 0) {
          setShowGuideNotification(true);
          localStorage.setItem('guideNotificationCount', '1');
          localStorage.setItem('lastGuideNotificationTime', Date.now().toString());
        }
      }, 60000); // 1 minute
      
      return () => clearTimeout(timer);
    }
  }, []); // Run only once on mount

  // Show guide notification for second time (2 minutes after first - برای تست)
  React.useEffect(() => {
    const guideNotifCount = parseInt(localStorage.getItem('guideNotificationCount') || '0');
    const lastNotifTime = parseInt(localStorage.getItem('lastGuideNotificationTime') || '0');
    
    // ⚡ PERFORMANCE: Removed console.log for better performance
    // فقط برای بار دوم (اگر بار اول دیده شده ولی بار دوم نه)
    if (guideNotifCount === 1) {
      const timeSinceLastNotif = Date.now() - lastNotifTime;
      const twoMinutes = 120000; // 2 minutes for testing (قبلاً 600000 بود - 10 دقیقه)
      
      // اگر کمتر از 2 دقیقه از بار اول گذشته، تایمر برای باقیمانده زمان بذار
      if (timeSinceLastNotif < twoMinutes) {
        const remainingTime = twoMinutes - timeSinceLastNotif;
        
        const timer = setTimeout(() => {
          const currentCount = parseInt(localStorage.getItem('guideNotificationCount') || '0');
          if (currentCount === 1) {
            setShowGuideNotification(true);
            localStorage.setItem('guideNotificationCount', '2');
            localStorage.setItem('lastGuideNotificationTime', Date.now().toString());
          }
        }, remainingTime);
        
        return () => clearTimeout(timer);
      }
    }
  }, []); // Run only once on mount

  // Animated text cycling for no income state with smooth typography effect
  React.useEffect(() => {
    const messages = [
      '۲۰۰ میلیون تومان',
      'این میتونه درآمد تو باشه!',
      'اولین پلتفرم پولسازی با AI'
    ];
    
    let messageIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const typeEffect = () => {
      const currentMessage = messages[messageIndex];
      
      if (!isDeleting) {
        // Typing effect - smooth and faster character by character
        if (charIndex <= currentMessage.length) {
          setAnimatedText(currentMessage.substring(0, charIndex));
          charIndex++;
          
          if (charIndex > currentMessage.length) {
            // Finished typing, wait exactly 2 seconds before deleting
            timeoutId = setTimeout(() => {
              isDeleting = true;
              typeEffect();
            }, 2000); // Exactly 2 seconds pause
            return;
          }
          
          // Faster typing speed with slight variation for smooth feel
          const typingSpeed = 60 + Math.random() * 40; // 60-100ms for faster but smooth typing
          timeoutId = setTimeout(typeEffect, typingSpeed);
        }
      } else {
        // Deleting effect - much faster than typing
        if (charIndex > 0) {
          charIndex--;
          setAnimatedText(currentMessage.substring(0, charIndex));
          
          // Much faster deleting speed
          const deletingSpeed = 15 + Math.random() * 15; // 15-30ms (very fast)
          timeoutId = setTimeout(typeEffect, deletingSpeed);
        } else {
          // Finished deleting, move to next message
          isDeleting = false;
          messageIndex = (messageIndex + 1) % messages.length;
          
          // Short pause before starting next message
          timeoutId = setTimeout(typeEffect, 500);
        }
      }
    };
    
    // Start the animation
    typeEffect();
    
    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // ⚡ PERFORMANCE: Defer chat history loading - only load when chat is opened or after initial render
  React.useEffect(() => {
    // Wait a bit before loading chat history to prioritize initial page load
    const timer = setTimeout(async () => {
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
    }, 500); // ⚡ PERFORMANCE: Load chat history after 500ms delay
    
    return () => clearTimeout(timer);
  }, [isAPIConnected]);

  // Handle incoming prompt from ReadyPrompts page
  React.useEffect(() => {
    if (location.state?.promptText) {
      setChatMessage(location.state.promptText);
      setIsEditingPrompt(true); // Enable editing mode
      // Clear the state to prevent re-processing
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleCancelPromptEdit = () => {
    setIsEditingPrompt(false);
    setChatMessage('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const hasIncome = userData.incomeMonth > 0;
  const monthGrowth = 12;

  // Stages progress (replace level-based display)
  const TOTAL_STAGES = 29;
  const completedStages = Math.max(0, Math.min(TOTAL_STAGES, userData.completedTasks || 0));
  const stagesPercent = Math.max(0, Math.min(100, Math.round((completedStages / TOTAL_STAGES) * 100)));

  // Enhanced Notifications with different types and interactions
  const notifications = [
    {
      id: 1,
      type: 'achievement',
      title: '🎉 دستاورد جدید!',
      message: 'شما مرحله "انتخاب ایده" را با موفقیت تکمیل کردید و ۵۰ سکه دریافت کردید',
      time: '۵ دقیقه پیش',
      icon: Trophy,
      color: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
      unread: true,
      priority: 'high',
      action: 'مشاهده دستاورد',
      actionColor: 'bg-yellow-500'
    },
    {
      id: 2,
      type: 'message',
      title: '💬 پیام جدید از علی محمدی',
      message: 'سلام! پروژه رو چطور پیش می‌بری؟ اگر کمک نیاز داری در خدمتم',
      time: '۱۰ دقیقه پیش',
      icon: MessageCircle,
      color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
      unread: true,
      priority: 'medium',
      action: 'پاسخ دادن',
      actionColor: 'bg-blue-500'
    },
    {
      id: 3,
      type: 'reminder',
      title: '⏰ یادآوری تمرین روزانه',
      message: 'زمان انجام تمرین روزانه شما فرا رسیده است. ۱۵ دقیقه وقت بگذارید',
      time: '۳۰ دقیقه پیش',
      icon: Clock,
      color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
      unread: false,
      priority: 'medium',
      action: 'شروع تمرین',
      actionColor: 'bg-purple-500'
    },
    {
      id: 4,
      type: 'reward',
      title: '🎁 جایزه ویژه!',
      message: 'به خاطر فعالیت مستمر، ۱۰۰ سکه طلا و یک ماه اشتراک رایگان دریافت کردید',
      time: '۱ ساعت پیش',
      icon: Gift,
      color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
      unread: false,
      priority: 'high',
      action: 'دریافت جایزه',
      actionColor: 'bg-green-500'
    },
    {
      id: 5,
      type: 'system',
      title: '📈 گزارش پیشرفت هفتگی',
      message: 'این هفته ۳ مرحله تکمیل کردید و ۱۵% پیشرفت داشتید. عالی پیش می‌رید!',
      time: '۲ ساعت پیش',
      icon: TrendingUp,
      color: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
      unread: false,
      priority: 'low',
      action: 'مشاهده گزارش',
      actionColor: 'bg-indigo-500'
    },
    {
      id: 6,
      type: 'social',
      title: '👥 دعوت به باشگاه رشد',
      message: 'سارا احمدی شما را به گروه "بازاریابی دیجیتال" دعوت کرده است',
      time: '۳ ساعت پیش',
      icon: UserPlus,
      color: 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
      unread: false,
      priority: 'medium',
      action: 'پیوستن',
      actionColor: 'bg-pink-500'
    }
  ];

  const quickActions = [
    {
      id: 'smart-assistant',
      title: 'دستیار هوشمند',
      icon: Brain,
      color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
      action: () => navigate('/chatbot')
    },
    {
      id: 'energy-boost',
      title: 'انرژی بوست',
      icon: Zap,
      color: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
      action: () => navigate('/energy-boost')
    },
    {
      id: 'sales-path-ai',
      title: 'مسیر فروش سریع',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
      action: () => navigate('/sales-path-ai')
    },
    {
      id: 'growth-club',
      title: 'سوشال رشد',
      icon: Users,
      color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
      action: () => navigate('/growth-club')
    }
  ];

  const handleEditField = (field: string, currentValue: number) => {
    setEditingField(field);
    setTempValue(currentValue.toString());
  };

  const handleSaveField = (field: string) => {
    const numValue = parseInt(tempValue.replace(/,/g, '')) || 0;
    setUserData(prev => ({
      ...prev,
      [field]: numValue
    }));
    setEditingField(null);
    setTempValue('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
        setShowProfileUpload(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNotificationAction = (notificationId: number, action: string) => {
    // Handle notification actions
    // Mark as read
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, unread: false } : n
    );
  };

  const markAllAsRead = () => {
    // Mark all notifications as read
  };

  const handleCurrentStageClick = () => {
    // Navigate to the current stage page
    navigate('/levels');
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
            isNew: true // Mark as new message for typing effect
          };
          setChatMessages(prev => [...prev, aiResponse]);
          // Auto scroll after AI response
          setTimeout(() => {
            scrollToBottom();
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
          isNew: true // Mark as new message for typing effect
        };
        setChatMessages(prev => [...prev, aiResponse]);
        // Auto scroll after AI response
        setTimeout(() => {
          scrollToBottom();
          checkScrollPosition();
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if it's a rate limit error
      let errorMessage = '❌ متأسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفا دوباره تلاش کنید.';
      
      if (error instanceof Error) {
        if (error.message.includes('محدودیت سه تا سوال') || error.message.includes('rate limit')) {
          errorMessage = '⚠️ ' + error.message;
        }
      }
      
      const errorResponse = {
        id: chatMessages.length + 2,
        text: errorMessage,
        sender: 'ai' as const,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        isNew: true // Mark as new message for typing effect
      };
      setChatMessages(prev => [...prev, errorResponse]);
      // Auto scroll after error response
      setTimeout(() => {
        scrollToBottom();
        checkScrollPosition();
      }, 100);
    }
  };

  const generateAIResponse = (userMessage: string) => {
    const responses = [
      'عالی! این سوال خیلی جالبی هست. بذارید کمکتون کنم...',
      'درک می‌کنم منظورتون رو. برای این موضوع چندین راهکار داریم:',
      'این نکته خیلی مهمیه! بیایید قدم به قدم بررسیش کنیم:',
      'تجربه‌تون خیلی ارزشمنده! برای بهبود این وضعیت پیشنهاد می‌دم:',
      'سوال بسیار هوشمندانه‌ای! در این زمینه چندین استراتژی موثر داریم:'
    ];
    
    if (userMessage.includes('ایده') || userMessage.includes('کسب‌وکار')) {
      return 'برای ایده‌های کسب‌وکار، مهم‌ترین نکته شناخت نیازهای بازار هست. چه حوزه‌ای رو در نظر دارید؟ 🚀';
    } else if (userMessage.includes('بازاریابی') || userMessage.includes('فروش')) {
      return 'بازاریابی دیجیتال امروزه کلید موفقیته! آیا محصول خاصی دارید که می‌خواید ببریمش به بازار? 📈';
    } else if (userMessage.includes('درآمد') || userMessage.includes('پول')) {
      return 'درآمدزایی نیاز به استراتژی داره. بیایید مدل درآمدی مناسب براتون طراحی کنیم! 💰';
    } else {
      return responses[Math.floor(Math.random() * responses.length)] + ' می‌تونید بیشتر توضیح بدید تا بهتر کمکتون کنم? 💡';
    }
  };

  const handleCloseGuideModal = () => {
    setShowGuideModal(false);
    localStorage.setItem('hasSeenGuideModal', 'true');
  };

  const handleStartGuide = () => {
    setShowGuideModal(false);
    localStorage.setItem('hasSeenGuideModal', 'true');
    navigate('/guide-tutorial'); // Navigate to guide tutorial page
  };

  // Handle guide notification actions
  const handleGuideNotificationClick = () => {
    setShowGuideNotification(false);
    navigate('/guide-tutorial');
  };

  const handleGuideNotificationClose = () => {
    setShowGuideNotification(false);
  };

  return (
    <>
      {/* Onboarding Stories - فقط یک بار در کل عمر نمایش داده می‌شود */}
      {showOnboarding && (
        <OnboardingStories onClose={() => {
          setShowOnboarding(false);
          
          // ذخیره در localStorage که استوری دیده شده و دیگه هیچ‌وقت نشون داده نشه
          localStorage.setItem('hasSeenOnboardingStories', 'true');
          
          // بعد از بسته شدن استوری‌ها، تایمر نوتیفیکیشن راهنما را شروع کن
          const guideNotifCount = parseInt(localStorage.getItem('guideNotificationCount') || '0');
          if (guideNotifCount === 0) {
            setTimeout(() => {
              const currentCount = parseInt(localStorage.getItem('guideNotificationCount') || '0');
              if (currentCount < 2) {
                setShowGuideNotification(true);
                localStorage.setItem('guideNotificationCount', '1');
                localStorage.setItem('lastGuideNotificationTime', Date.now().toString());
              }
            }, 60000); // 1 minute after closing stories (برای تست - قبلاً 120000 بود)
          }
        }} />
      )}

      {/* Guide Modal */}
      <GuideModal 
        isOpen={showGuideModal}
        onClose={handleCloseGuideModal}
        onStartGuide={handleStartGuide}
      />

      {/* Guide Notification - After Stories */}
      {showGuideNotification && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9998] animate-fadeIn">
          <div className="bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 max-w-md w-full animate-scaleIn">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">📚</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold text-xl mb-2">راهنمای استفاده از پلتفرم</h4>
                <p className="text-white/90 text-sm mb-4 leading-relaxed">
                  برای آشنایی کامل با امکانات و نحوه استفاده از MonetizeAI، راهنمای تصویری رو مشاهده کنید!
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleGuideNotificationClick}
                    className="flex-1 bg-white/25 hover:bg-white/35 backdrop-blur-sm text-white font-bold py-3 px-5 rounded-xl transition-all duration-300 text-sm border border-white/40 hover:scale-105 shadow-lg"
                  >
                    مشاهده راهنما 🚀
                  </button>
                  <button
                    onClick={handleGuideNotificationClose}
                    className="w-12 h-12 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all duration-300 border border-white/30 hover:scale-110"
                    title="بستن"
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen transition-colors duration-300" 
           style={{ backgroundColor: '#0e0817' }}>
      
            <div className="p-4 lg:p-0 space-y-6 max-w-md mx-auto lg:max-w-none lg:mx-0" style={{ backgroundColor: '#0e0817' }}>

      {/* Loading State - Show when we don't have real data yet */}
      {(!hasRealData && loadingUser) && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-[#5a189a]/30 border-t-[#5a189a] rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-[#2c189a] rounded-full animate-spin animation-delay-150"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">در حال بارگذاری...</h3>
            <p className="text-gray-400">در حال دریافت اطلاعات از سرور</p>
          </div>
        </div>
      )}

      {/* Main Dashboard Content - Show when we have real data OR when API is not connected (fallback) */}
      {(hasRealData || (!loadingUser && !isAPIConnected)) && (
        <>
        
          {/* Desktop: 2 Column Grid Layout, Mobile: Single Column */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-6 space-y-6 lg:space-y-0">
            {/* Left Column - Main Content (8 columns) */}
            <div className="lg:col-span-8 space-y-6">
          
          {/* Enhanced Profile Header */}
              <div className="flex items-center justify-between backdrop-blur-xl rounded-3xl p-5 lg:p-6 border border-gray-700/60 shadow-lg hover:shadow-xl transition-all duration-500 relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/profile')}
        >
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
              {telegramProfilePhoto || profileImage ? (
              <img 
                src={telegramProfilePhoto || profileImage || ''} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  // If image fails to load, hide it and show icon
                  e.currentTarget.style.display = 'none';
                  setTelegramProfilePhoto(null);
                  setProfileImage(null);
                }}
              />
            ) : (
              <User size={18} className="text-white drop-shadow-lg" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white drop-shadow-lg">
              {userData.username ? `@${userData.username}` : userData.firstName || '@hosein_dev'}
            </h2>
            
            {/* Subscription Badge - Compact */}
            <div className="mt-1">
              {(() => {
                // تشخیص دقیق نوع اشتراک از API
                const subType = userData.subscriptionType?.toLowerCase();
                const planName = userData.planName?.toLowerCase();
                
                if (subType === 'ultimate' || planName === 'ultimate') {
                  return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-sm">
                      اشتراک مادام‌العمر
                    </span>
                  );
                } else if (subType === 'pro' || planName === 'pro') {
                  return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/25 text-purple-200 border border-purple-400/35 shadow-sm shadow-purple-500/15">
                      اشتراک شش ماهه
                    </span>
                  );
                } else if (subType === 'starter' || planName === 'starter') {
                  return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-green-500/20 text-green-200 border border-green-500/25">
                      اشتراک ماهانه
                    </span>
                  );
                } else {
                  return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-600/10 text-gray-400 border border-gray-600/15">
                      اشتراک رایگان
                    </span>
                  );
                }
              })()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="p-3 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-300 relative group border border-white/20"
            onClick={() => navigate('/profile')}
          >
            <Settings size={20} className="text-white drop-shadow-lg group-hover:scale-110 transition-all duration-300" />
          </button>

        </div>
      </div>

      {/* Big Income Card */}
      <div className="group backdrop-blur-xl rounded-3xl p-5 lg:p-7 border border-gray-700/60 shadow-lg hover:shadow-xl transition-all duration-500 relative overflow-hidden" style={{ backgroundColor: '#10091c' }}>

        
        {/* Animated Green Lights */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/15 via-green-500/10 to-transparent rounded-3xl"></div>
        <div className="absolute inset-0 opacity-100 group-hover:opacity-100 transition-all duration-700"></div>
        
        {/* Background Pattern */}
        <div className="absolute inset-4 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" preserveAspectRatio="xMidYMid slice">
            <pattern id="income-pattern" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="6" r="0.6" fill="white"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#income-pattern)"/>
          </svg>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-green-400/30 backdrop-blur-sm border border-green-300/20">
                <DollarSign size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-white/90 text-sm font-medium">درآمد ماهانه 💰</h3>
                <p className="text-white/70 text-xs">+{monthGrowth}% رشد</p>
              </div>
            </div>
            {!hasIncome && (
              <button
                onClick={() => setIsEditingIncome(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-300 group"
                title="ویرایش درآمد"
              >
                <Edit3 size={16} className="text-white/80 group-hover:text-white transition-colors" />
              </button>
            )}
          </div>
          
          {isEditingIncome ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <input
                type="text"
                value={tempIncome}
                onChange={(e) => setTempIncome(e.target.value)}
                placeholder="مثال: ۵۰۰۰۰۰۰"
                className="w-full bg-white/10 text-white text-center text-xl font-bold rounded-xl px-4 py-3 border border-white/30 focus:border-green-400/50 focus:outline-none transition-all"
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    if (tempIncome) {
                      const numValue = parseInt(tempIncome.replace(/[^\d]/g, ''));
                      if (!isNaN(numValue)) {
                        try {
                          await apiService.updateUserProfile({
                            username: userData.username || '',
                            phone: '',
                            email: '',
                            monthly_income: numValue
                          });
                          await refreshUserData();
                          setIsEditingIncome(false);
                          setTempIncome('');
                        } catch (error) {
                          console.error('Error updating income:', error);
                        }
                      }
                    }
                  }}
                  className="flex-1 py-2 px-4 rounded-xl bg-green-500/30 hover:bg-green-500/40 text-green-200 font-medium text-sm transition-all border border-green-400/30"
                >
                  ذخیره
                </button>
                <button
                  onClick={() => {
                    setIsEditingIncome(false);
                    setTempIncome('');
                  }}
                  className="flex-1 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 font-medium text-sm transition-all border border-white/20"
                >
                  لغو
                </button>
              </div>
            </div>
          ) : hasIncome ? (
            <div 
              onClick={() => {
                setTempIncome(userData.incomeMonth.toString());
                setIsEditingIncome(true);
              }}
              className="text-4xl font-black text-white mb-2 tracking-tight cursor-pointer hover:text-green-300 transition-colors duration-300 inline-block"
              title="کلیک کنید برای ویرایش"
            >
              {formatCurrency(userData.incomeMonth)}
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-white/90 bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center min-h-[80px] flex items-center justify-center">
                <div className="relative flex items-center gap-0.5">
                  <span className="inline-block transition-all duration-200 ease-out" style={{ minWidth: '2px' }}>{animatedText}</span>
                  <span 
                    className="inline-block w-0.5 h-6 bg-green-400 shadow-lg shadow-green-400/50 transition-opacity duration-300"
                    style={{
                      animation: 'blink 1s ease-in-out infinite'
                    }}
                  ></span>
                </div>
              </div>
              <style>{`
                @keyframes blink {
                  0%, 49% { opacity: 1; }
                  50%, 100% { opacity: 0; }
                }
              `}</style>
            </>
          )}
          
          <div className="flex items-center gap-2 text-white/80 mt-4">
            <TrendingUp size={16} />
            <span className="text-sm font-medium">در مسیر موفقیت</span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div>
                <div className="rounded-3xl p-5 border border-gray-700/60 shadow-lg hover:shadow-xl transition-all duration-300 group backdrop-blur-xl" style={{ backgroundColor: '#10091c' }}>
          <div className="flex flex-col space-y-4">
            {/* Title Section */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">مسیر پیشرفت</h3>
            </div>
            
            {/* Progress Section */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-3xl">
                <div className="space-y-2">
                  {/* Progress Bar */}
                <div className="relative">
                    <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="h-full rounded-full transition-all duration-1000 shadow-lg relative"
                        style={{
                          width: `${stagesPercent}%`,
                          backgroundImage: 'linear-gradient(90deg, #22c55e 0%, #16a34a 45%, #059669 100%)',
                          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 2px 8px rgba(16,185,129,0.35)'
                        }}
                    >
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-t-2 border-b-2 border-t-transparent border-b-transparent shadow-sm"
                             style={{ borderLeftColor: '#16a34a' }}></div>
                      </div>

                    </div>
                  </div>
                  
                  {/* Labels */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white font-bold drop-shadow">مرحله {completedStages.toLocaleString('en-US')} از 29</span>
                    <span className="text-xs text-white font-bold drop-shadow">{stagesPercent.toLocaleString('en-US')}% تکمیل شده</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Button Section */}
            <div className="flex justify-center mt-auto mb-4" style={{ marginBottom: '6px' }}>
              <button 
                onClick={() => navigate('/levels')}
                className="w-full px-5 py-2.5 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white text-base font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/10"
              >
                ادامه مسیر
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI-Powered Tools Section */}
      <div>
        <div className="text-center mb-4">
          <h3 className="text-base lg:text-lg font-bold text-white">ابزارهای AI هوشمند</h3>
          <p className="text-xs lg:text-sm text-gray-400">ابزارهای قدرتمند کسب‌وکار</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
          {/* ایده یابی */}
          <div
            onClick={() => {
              navigate('/business-builder-ai');
            }}
            className="text-center group transition-all duration-500 h-20 lg:h-24 flex flex-col justify-center backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-5 border border-gray-700/60 shadow-lg relative overflow-hidden cursor-pointer hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-0.5"
            style={{ backgroundColor: '#10091c' }}
          >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-xl bg-blue-500/20 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full blur-lg bg-blue-400/15 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            {/* Geometric Accent Lines */}
            <div className="absolute top-3 left-3 opacity-30 group-hover:opacity-60 transition-all duration-500">
              <div className="w-6 h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-transparent group-hover:w-8 transition-all duration-500"></div>
              <div className="w-4 h-0.5 rounded-full mt-1 bg-gradient-to-r from-blue-400 to-transparent group-hover:w-6 transition-all duration-500" style={{ transitionDelay: '0.1s' }}></div>
            </div>
            
            {/* Bottom Right Dot Pattern */}
            <div className="absolute bottom-3 right-3 opacity-20 group-hover:opacity-40 transition-all duration-500">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-blue-400 group-hover:scale-125 transition-transform duration-300"></div>
                <div className="w-1 h-1 rounded-full bg-blue-400 group-hover:scale-125 transition-transform duration-300" style={{ transitionDelay: '0.1s' }}></div>
                <div className="w-1 h-1 rounded-full bg-blue-400 group-hover:scale-125 transition-transform duration-300" style={{ transitionDelay: '0.2s' }}></div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="relative z-10 text-lg font-bold text-white flex items-center justify-center transition-all duration-300 group-hover:scale-105">
              <span className="text-blue-500 drop-shadow-lg group-hover:text-blue-400 transition-colors duration-300 whitespace-nowrap">ایده یابی</span>
            </div>
          </div>

          {/* سازنده محصول */}
          <div
            onClick={() => {
              navigate('/sell-kit-ai');
            }}
            className="text-center group transition-all duration-500 h-20 lg:h-24 flex flex-col justify-center backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-5 border border-gray-700/60 shadow-lg relative overflow-hidden cursor-pointer hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-0.5"
            style={{ backgroundColor: '#10091c' }}
          >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-xl bg-green-500/20 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full blur-lg bg-green-400/15 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            {/* Geometric Accent Lines */}
            <div className="absolute top-3 left-3 opacity-30 group-hover:opacity-60 transition-all duration-500">
              <div className="w-6 h-0.5 rounded-full bg-gradient-to-r from-green-500 to-transparent group-hover:w-8 transition-all duration-500"></div>
              <div className="w-4 h-0.5 rounded-full mt-1 bg-gradient-to-r from-green-400 to-transparent group-hover:w-6 transition-all duration-500" style={{ transitionDelay: '0.1s' }}></div>
            </div>
            
            {/* Bottom Right Dot Pattern */}
            <div className="absolute bottom-3 right-3 opacity-20 group-hover:opacity-40 transition-all duration-500">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-green-400 group-hover:scale-125 transition-transform duration-300"></div>
                <div className="w-1 h-1 rounded-full bg-green-400 group-hover:scale-125 transition-transform duration-300" style={{ transitionDelay: '0.1s' }}></div>
                <div className="w-1 h-1 rounded-full bg-green-400 group-hover:scale-125 transition-transform duration-300" style={{ transitionDelay: '0.2s' }}></div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="relative z-10 text-lg font-bold text-white flex items-center justify-center transition-all duration-300 group-hover:scale-105">
              <span className="text-green-500 drop-shadow-lg group-hover:text-green-400 transition-colors duration-300 whitespace-nowrap">سازنده محصول</span>
            </div>
          </div>

          {/* مشتری یابی */}
          <div
            onClick={() => {
              navigate('/client-finder-ai');
            }}
            className="text-center group transition-all duration-500 h-20 lg:h-24 flex flex-col justify-center backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-5 border border-gray-700/60 shadow-lg relative overflow-hidden cursor-pointer hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-0.5"
            style={{ backgroundColor: '#10091c' }}
          >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-xl bg-orange-500/20 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full blur-lg bg-orange-400/15 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            {/* Geometric Accent Lines */}
            <div className="absolute top-3 left-3 opacity-30 group-hover:opacity-60 transition-all duration-500">
              <div className="w-6 h-0.5 rounded-full bg-gradient-to-r from-orange-500 to-transparent group-hover:w-8 transition-all duration-500"></div>
              <div className="w-4 h-0.5 rounded-full mt-1 bg-gradient-to-r from-orange-400 to-transparent group-hover:w-6 transition-all duration-500" style={{ transitionDelay: '0.1s' }}></div>
            </div>
            
            {/* Bottom Right Dot Pattern */}
            <div className="absolute bottom-3 right-3 opacity-20 group-hover:opacity-40 transition-all duration-500">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-orange-400 group-hover:scale-125 transition-transform duration-300"></div>
                <div className="w-1 h-1 rounded-full bg-orange-400 group-hover:scale-125 transition-transform duration-300" style={{ transitionDelay: '0.1s' }}></div>
                <div className="w-1 h-1 rounded-full bg-orange-400 group-hover:scale-125 transition-transform duration-300" style={{ transitionDelay: '0.2s' }}></div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="relative z-10 text-lg font-bold text-white flex items-center justify-center transition-all duration-300 group-hover:scale-105">
              <span className="text-orange-500 drop-shadow-lg group-hover:text-orange-400 transition-colors duration-300 whitespace-nowrap">مشتری یابی</span>
            </div>
          </div>

          {/* مسیر فروش */}
          <div
            onClick={() => {
              navigate('/sales-path-ai');
            }}
            className="text-center group transition-all duration-500 h-20 lg:h-24 flex flex-col justify-center backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-5 border border-gray-700/60 shadow-lg relative overflow-hidden cursor-pointer hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-0.5"
            style={{ backgroundColor: '#10091c' }}
          >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-xl bg-purple-500/20 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full blur-lg bg-purple-400/15 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            {/* Geometric Accent Lines */}
            <div className="absolute top-3 left-3 opacity-30 group-hover:opacity-60 transition-all duration-500">
              <div className="w-6 h-0.5 rounded-full bg-gradient-to-r from-purple-500 to-transparent group-hover:w-8 transition-all duration-500"></div>
              <div className="w-4 h-0.5 rounded-full mt-1 bg-gradient-to-r from-purple-400 to-transparent group-hover:w-6 transition-all duration-500" style={{ transitionDelay: '0.1s' }}></div>
            </div>
            
            {/* Bottom Right Dot Pattern */}
            <div className="absolute bottom-3 right-3 opacity-20 group-hover:opacity-40 transition-all duration-500">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-purple-400 group-hover:scale-125 transition-transform duration-300"></div>
                <div className="w-1 h-1 rounded-full bg-purple-400 group-hover:scale-125 transition-transform duration-300" style={{ transitionDelay: '0.1s' }}></div>
                <div className="w-1 h-1 rounded-full bg-purple-400 group-hover:scale-125 transition-transform duration-300" style={{ transitionDelay: '0.2s' }}></div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="relative z-10 text-lg font-bold text-white flex items-center justify-center transition-all duration-300 group-hover:scale-105">
              <span className="text-purple-500 drop-shadow-lg group-hover:text-purple-400 transition-colors duration-300 whitespace-nowrap">مسیر فروش</span>
            </div>
          </div>
        </div>

        {/* Sales Management System Card */}
        <div className="mt-3 lg:col-span-2">
          <div 
            className="text-center group transition-all duration-500 h-20 lg:h-24 flex flex-col justify-center backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-5 border border-gray-700/60 shadow-lg relative overflow-hidden cursor-pointer hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-0.5"
            style={{ backgroundColor: '#10091c' }}
            onClick={() => {
              navigate('/crm');
            }}
          >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-100 group-hover:opacity-100 transition-all duration-700">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-xl bg-green-500/20 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 rounded-full blur-lg bg-green-400/15 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            {/* Geometric Accent Lines */}
            <div className="absolute top-3 left-3 opacity-30 group-hover:opacity-60 transition-all duration-500">
              <div className="w-8 h-0.5 rounded-full bg-gradient-to-r from-green-500 to-transparent group-hover:w-10 transition-all duration-500"></div>
              <div className="w-6 h-0.5 rounded-full mt-1 bg-gradient-to-r from-green-400 to-transparent group-hover:w-8 transition-all duration-500" style={{ transitionDelay: '0.1s' }}></div>
            </div>
            
            {/* Bottom Right Dot Pattern */}
            <div className="absolute bottom-3 right-3 opacity-20 group-hover:opacity-40 transition-all duration-500">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-green-400 group-hover:scale-125 transition-transform duration-300"></div>
                <div className="w-1 h-1 rounded-full bg-green-400 group-hover:scale-125 transition-transform duration-300" style={{ transitionDelay: '0.1s' }}></div>
                <div className="w-1 h-1 rounded-full bg-green-400 group-hover:scale-125 transition-transform duration-300" style={{ transitionDelay: '0.2s' }}></div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="relative z-10 text-lg font-bold text-white flex items-center justify-center transition-all duration-300 group-hover:scale-105">
              <span className="text-green-500 drop-shadow-lg group-hover:text-green-400 transition-colors duration-300 whitespace-nowrap">مدیریت فروش</span>
            </div>
          </div>
        </div>
      </div>

            </div>
            
            {/* Right Column - AI Coach (4 columns) - Desktop Only */}
            <div className="lg:col-span-4 lg:block hidden">
              <div className="sticky top-20 space-y-6">
      {/* AI Coach Chat */}
      <div>
                  <div className="text-center mb-4">
            <h3 className="text-base font-bold text-white">AI کوچ شخصی</h3>
            <p className="text-xs text-gray-400">مربی هوشمند شما</p>
          </div>
        <div className="backdrop-blur-xl rounded-3xl p-5 border border-gray-700/60 shadow-lg transition-all duration-300" style={{ backgroundColor: '#10091c' }}>
          <div className="space-y-4">
            {/* Header with AI Coach */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#2c189a] to-[#5a189a] rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                  <Brain size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white transition-colors duration-300">
                    AI کوچ
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">آماده کمک به شما</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/chatbot', { state: { fromPage: 'dashboard' } })}
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



            {/* Chat Interface */}
            <div className={`backdrop-blur-md rounded-xl p-4 border border-gray-700/60 shadow-lg transition-all duration-500 relative ${isEditingPrompt ? 'ring-2 ring-purple-400/50' : ''}`} style={{ backgroundColor: '#10091c' }}>
              {/* Scroll to Bottom Button - Fixed Position */}
              {showScrollButton && (
                <button
                  onClick={scrollToBottom}
                  className="absolute top-2 left-2 w-10 h-10 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-lg border border-white/20 z-10"
                  title="اسکرول به پایین"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M12 5v14"/>
                    <path d="M19 12l-7 7-7-7"/>
                  </svg>
                </button>
              )}
              
              {/* Chat Messages */}
              <div 
                ref={chatContainerRef}
                className={`overflow-y-auto space-y-3 mb-4 transition-all duration-500 ${isEditingPrompt ? 'h-20' : 'h-56'}`}
                onScroll={checkScrollPosition}
              >
                {chatMessages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}
                  >
                    {message.sender === 'user' ? (
                      <div className="flex flex-col max-w-[80%]">
                        <div className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-lg rounded-br-md px-3 py-2">
                          <p className="text-white text-xs leading-relaxed">{message.text}</p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-400 mt-1 px-1 text-right">{message.timestamp}</span>
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
              
              {/* Chat Input */}
              {isEditingPrompt ? (
                <div className="space-y-4">
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
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="سوال خود را بپرسید..."
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
                  
                  {/* Minimal Prompts Button */}
                  <button
                    onClick={() => navigate('/ready-prompts')}
                    className="w-full py-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 border border-purple-200/50 dark:border-purple-700/50 hover:border-purple-300/70 dark:hover:border-purple-600/70 rounded-lg hover:bg-purple-50/30 dark:hover:bg-purple-900/20 transition-all duration-300 flex items-center justify-center gap-1 truncate"
                  >
                    <Sparkles size={12} className="flex-shrink-0" />
                    <span className="truncate">پرامپت‌های آماده</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action */}
            <button 
              onClick={() => navigate('/ai-coach')}
              className="w-full bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white py-3 rounded-xl text-sm font-medium hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm border border-white/10 hover:scale-[1.02] min-w-0"
            >
              <MessageCircle size={16} className="flex-shrink-0" />
              <span className="truncate">باز کردن چت کامل</span>
            </button>
          </div>
        </div>
      </div>
              </div>
            </div>
            
            {/* Mobile: AI Coach at bottom */}
            <div className="lg:hidden">
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-white">AI کوچ شخصی</h3>
                <p className="text-xs text-gray-400">مربی هوشمند شما</p>
              </div>
              <div className="backdrop-blur-xl rounded-3xl p-5 border border-gray-700/60 shadow-lg" style={{ backgroundColor: '#10091c' }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#2c189a] to-[#5a189a] rounded-xl flex items-center justify-center shadow-lg">
                        <Brain size={18} className="text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">AI کوچ</h4>
                        <p className="text-xs text-gray-300">آماده کمک</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-green-400 bg-green-900/40 px-2 py-1 rounded-full text-xs font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      آنلاین
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/ai-coach')}
                    className="w-full bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 text-white py-3 rounded-xl text-sm font-medium hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} />
                    <span>شروع گفتگو</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

      {/* Current Level Card */}


      {/* Enhanced Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-colors duration-300">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl w-full max-w-sm max-h-[85vh] overflow-hidden transition-colors duration-300 shadow-2xl border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-purple-50/80 to-blue-50/80 dark:from-purple-900/20 dark:to-blue-900/20 backdrop-blur-sm">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">اعلان‌ها</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">اعلان‌ها</p>
              </div>
              <div className="flex items-center gap-2">

                <button 
                  onClick={() => setShowNotifications(false)}
                  className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-300 backdrop-blur-sm"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-96">
              {notifications.map((notification) => (
                <div key={notification.id} className={`p-4 border-b border-gray-100/50 dark:border-gray-700/50 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors duration-300 backdrop-blur-sm ${notification.unread ? 'bg-blue-50/80 dark:bg-blue-900/20 border-r-4 border-r-blue-500' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${notification.color} transition-colors duration-300 backdrop-blur-sm shadow-lg ${notification.priority === 'high' ? 'ring-2 ring-yellow-300 dark:ring-yellow-600' : ''}`}>
                      <notification.icon size={16} className="text-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm transition-colors duration-300 truncate">
                          {notification.title}
                        </h4>
                        {notification.unread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>
                        )}
                        {notification.priority === 'high' && (
                          <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors duration-300 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300 flex items-center gap-1">
                          <Clock size={10} />
                          {notification.time}
                        </p>
                        {notification.action && (
                          <button 
                            onClick={() => handleNotificationAction(notification.id, notification.action)}
                            className={`text-xs ${notification.actionColor} text-white px-3 py-1 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300`}
                          >
                            {notification.action}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-750/80 backdrop-blur-sm">
              <button className="w-full text-center text-sm bg-gradient-to-r from-[#5A189A] to-pink-600 bg-clip-text text-transparent hover:from-[#5A189A]/90 hover:to-pink-700 transition-all duration-300 font-medium">
                مشاهده همه اعلان‌ها
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Upload Modal */}
      {showProfileUpload && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-colors duration-300">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm transition-colors duration-300 shadow-2xl border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">تغییر عکس پروفایل</h3>
              <button 
                onClick={() => setShowProfileUpload(false)}
                className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-300 backdrop-blur-sm"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-2xl ring-2 ring-white/30 dark:ring-gray-700/30">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-white" />
                )}
              </div>
              <label className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 dark:from-purple-500 dark:via-pink-400 dark:to-blue-500 text-white px-6 py-3 rounded-xl cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium">
                <Upload size={16} />
                انتخاب عکس جدید
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 transition-colors duration-300">
                فرمت‌های مجاز: JPG, PNG, GIF (حداکثر ۵ مگابایت)
              </p>
            </div>
          </div>
        </div>
      )}

        </>
      )}



      </div>
    </div>
    </>
  );
};

export default Dashboard;