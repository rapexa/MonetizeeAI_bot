import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';
import { logger } from '../utils/logger';



interface UserData {
  incomeMonth: number;
  incomeToday: number;
  activeLeads: number;
  negotiatingCustomers: number;
  firstGoal: number;
  progressOverall: number;
  currentLevel: number;
  completedTasks: number;
  unlockedLevels: number;
  points: number;
  // API integration fields
  telegramId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  isVerified?: boolean;
  isActive?: boolean;
  currentSession?: number;
  // Subscription fields
  subscriptionType?: string;
  planName?: string;
  subscriptionExpiry?: string;
  freeTrialUsed?: boolean;
  chatMessagesUsed?: number;
  courseSessionsUsed?: number;
}

interface AppContextType {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  isOnline: boolean;
  isAPIConnected: boolean;
  isInTelegram: boolean;
  loadingUser: boolean;
  hasRealData: boolean;
  telegramIdError: string | null;
  syncWithAPI: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  isSubscriptionExpired: () => boolean;
  addPoints: (points: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with empty data - will be populated from API
  const [userData, setUserData] = useState<UserData>({
    incomeMonth: 0,
    incomeToday: 0,
    activeLeads: 0,
    negotiatingCustomers: 0,
    firstGoal: 0,
    progressOverall: 0,
    currentLevel: 0,
    completedTasks: 0,
    unlockedLevels: 0,
    points: parseInt(localStorage.getItem('userPoints') || '0')
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAPIConnected, setIsAPIConnected] = useState(false);
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [telegramIdError, setTelegramIdError] = useState<string | null>(null);

  // Sync user data with API
  const syncWithAPI = async () => {
    try {
      setLoadingUser(true);
      
      // ⚡ PERFORMANCE: Skip health check and go straight to user data (faster initial load)
      // Health check will happen naturally if API calls fail
      setIsAPIConnected(true); // Optimistically assume API is available
      
      // ⚡ PERFORMANCE: Load critical data first, defer non-critical calls
      const authResponse = await apiService.getCurrentUser();
      
      // Check if API is actually available based on response
      // Handle various error types: network errors, timeouts, etc.
      if (!authResponse.success && (
        authResponse.error?.includes('Failed to fetch') || 
        authResponse.error?.includes('Request timeout') ||
        authResponse.error?.includes('NetworkError') ||
        authResponse.error?.includes('اتصال به سرور')
      )) {
        setIsAPIConnected(false);
        // Set fallback data when API is not available
        setUserData(prev => ({
          ...prev,
          incomeMonth: 2450000,
          incomeToday: 150000,
          activeLeads: 12,
          negotiatingCustomers: 3,
          firstGoal: 5000000,
          progressOverall: 35,
          currentLevel: 3,
          completedTasks: 28,
          unlockedLevels: 4
        }));
        setHasRealData(false);
        setLoadingUser(false);
        return;
      }
      
      // Only load progress and profile if auth succeeds
      let progressResponse = { success: false, data: null };
      let profileResponse = { success: false, data: null };
      
      if (authResponse.success && authResponse.data) {
        // Load other data in parallel only if auth succeeded
        [progressResponse, profileResponse] = await Promise.all([
          apiService.getUserProgress(),
          apiService.getUserProfile()
        ]);
      }
      
      if (authResponse.success && authResponse.data) {
        const userInfo = authResponse.data as any;
        
        // Update userData with real data from API
        setUserData(prev => ({
          ...prev,
          telegramId: userInfo.telegram_id,
          username: userInfo.username,
          firstName: userInfo.first_name,
          lastName: userInfo.last_name,
          isVerified: userInfo.is_verified,
          isActive: userInfo.is_active,
          currentSession: userInfo.current_session,
          currentLevel: userInfo.level,
          completedTasks: userInfo.completed_tasks,
          progressOverall: userInfo.progress,
          
          // Subscription fields
          subscriptionType: userInfo.subscription_type,
          planName: userInfo.plan_name,
          subscriptionExpiry: userInfo.subscription_expiry,
          freeTrialUsed: userInfo.free_trial_used,
          chatMessagesUsed: userInfo.chat_messages_used,
          courseSessionsUsed: userInfo.course_sessions_used,
          
          // Update progress with API data if available
          ...(progressResponse.success && progressResponse.data ? {
            currentLevel: progressResponse.data.current_level,
            progressOverall: progressResponse.data.progress_percent,
            completedTasks: progressResponse.data.completed_sessions,
          } : {}),
          
          // Update monthly income from profile data
          ...(profileResponse.success && profileResponse.data ? {
            incomeMonth: profileResponse.data.monthly_income || prev.incomeMonth,
          } : {})
        }));
        
        // Mark that we now have real data
        setHasRealData(true);
      } else {
        
        // Check if subscription has expired
        if (authResponse.error === 'SUBSCRIPTION_EXPIRED' || (authResponse as any).subscriptionExpired) {
          setTelegramIdError('⚠️ اشتراک شما به پایان رسید!\n\n🔒 برای ادامه استفاده از امکانات، لطفا به ربات برگردید و اشتراک خریداری کنید یا لایسنس خود را وارد کنید.\n\n💎 برای بازگشت به ربات، روی دکمه زیر کلیک کنید:');
          setHasRealData(false);
        } else if (authResponse.error?.includes('No user ID available')) {
          // If no telegram_id available, show appropriate message
          setTelegramIdError('لطفا از طریق تلگرام وارد شوید تا اطلاعات شما نمایش داده شود');
          // Keep using default data but mark as not real
          setHasRealData(false);
        } else {
          // Keep using default data for other errors
          setHasRealData(false);
          setTelegramIdError(null);
        }
      }
      
      // Also check subscription expiry from userData even if auth succeeded
      // This handles cases where API returns user data but subscription has expired
      if (authResponse.success && authResponse.data) {
        const userInfo = authResponse.data as any;
        // Check if subscription has expired based on expiry date
        if (userInfo.subscription_type === 'paid' && userInfo.subscription_expiry) {
          const expiryDate = new Date(userInfo.subscription_expiry);
          if (new Date() > expiryDate) {
            setTelegramIdError('⚠️ اشتراک شما به پایان رسید!\n\n🔒 برای ادامه استفاده از امکانات، لطفا به ربات برگردید و اشتراک خریداری کنید یا لایسنس خود را وارد کنید.\n\n💎 برای بازگشت به ربات، روی دکمه زیر کلیک کنید:');
          }
        } else if (userInfo.subscription_type === 'free_trial' && userInfo.subscription_expiry) {
          const expiryDate = new Date(userInfo.subscription_expiry);
          if (new Date() > expiryDate) {
            setTelegramIdError('⚠️ اشتراک شما به پایان رسید!\n\n🔒 برای ادامه استفاده از امکانات، لطفا به ربات برگردید و اشتراک خریداری کنید یا لایسنس خود را وارد کنید.\n\n💎 برای بازگشت به ربات، روی دکمه زیر کلیک کنید:');
          }
        }
      }
    } catch (error) {
      logger.error('❌ Error syncing with API:', error);
      setIsAPIConnected(false);
    } finally {
      setLoadingUser(false);
    }
  };

  // Refresh user data from API
  const refreshUserData = async () => {
    if (!isAPIConnected) return;
    
    try {
      // CRITICAL FIX: Clear cache before refreshing to ensure fresh data
      // This is especially important after quiz evaluation
      apiService.clearCache();
      
      // ⚡ PERFORMANCE: Parallelize API calls instead of sequential
      const [userResponse, progressResponse, profileResponse] = await Promise.all([
        apiService.getCurrentUser(),
        apiService.getUserProgress(),
        apiService.getUserProfile()
      ]);
      
      if (userResponse.success && userResponse.data) {
        const userInfo = userResponse.data as any;
        
        setUserData(prev => {
          const newUserData = {
            ...prev,
            telegramId: userInfo.telegram_id,
            username: userInfo.username,
            firstName: userInfo.first_name,
            lastName: userInfo.last_name,
            isVerified: userInfo.is_verified,
            isActive: userInfo.is_active,
            currentSession: userInfo.current_session,
            currentLevel: userInfo.level,
            completedTasks: userInfo.completed_tasks,
            progressOverall: userInfo.progress,
            
            // Subscription fields
            subscriptionType: userInfo.subscription_type,
            planName: userInfo.plan_name,
            subscriptionExpiry: userInfo.subscription_expiry,
            freeTrialUsed: userInfo.free_trial_used,
            chatMessagesUsed: userInfo.chat_messages_used,
            courseSessionsUsed: userInfo.course_sessions_used,
            
            // Update progress with API data if available
            ...(progressResponse.success && progressResponse.data ? {
              currentLevel: progressResponse.data.current_level,
              progressOverall: progressResponse.data.progress_percent,
              completedTasks: progressResponse.data.completed_sessions,
            } : {}),
            
            // Update monthly income from profile data
            ...(profileResponse.success && profileResponse.data ? {
              incomeMonth: profileResponse.data.monthly_income || prev.incomeMonth,
            } : {})
          };
          
          return newUserData;
        });
        
        // Update hasRealData if we successfully get data
        if (!hasRealData) {
          setHasRealData(true);
        }
      }
    } catch (error) {
      // Silently fail - don't log errors on refresh for better performance
    }
  };

  // Check if subscription has expired
  // IMPORTANT: This function should only be called after data has been loaded
  // If subscriptionType is undefined, it means data hasn't been loaded yet, so return false
  const isSubscriptionExpired = (): boolean => {
    // If subscriptionType is undefined, data hasn't been loaded yet - don't show expired state
    if (userData.subscriptionType === undefined) {
      return false;
    }
    
    // Legacy users: If IsVerified is true and no subscription type is set, treat as lifetime license
    if (userData.isVerified && (!userData.subscriptionType || userData.subscriptionType === 'none')) {
      return false; // Old verified users never expire
    }
    
    // If user has lifetime license (no expiry), they never expire
    if (userData.subscriptionType === 'paid' && !userData.subscriptionExpiry) {
      return false; // Lifetime license never expires
    }
    
    // Check if paid subscription with expiry date has expired
    if (userData.subscriptionType === 'paid' && userData.subscriptionExpiry) {
      const expiryDate = new Date(userData.subscriptionExpiry);
      return new Date() > expiryDate;
    }
    
    // Check if free trial has expired
    if (userData.subscriptionType === 'free_trial' && userData.subscriptionExpiry) {
      const expiryDate = new Date(userData.subscriptionExpiry);
      return new Date() > expiryDate;
    }
    
    // If no subscription or subscription type is none, consider it as expired
    // BUT only if we have confirmed data (not during initial load)
    if (!userData.subscriptionType || userData.subscriptionType === 'none') {
      return true;
    }
    
    return false;
  };

  // Add points to user's total
  const addPoints = (points: number) => {
    setUserData(prev => ({
      ...prev,
      points: prev.points + points
    }));
    
    // Save to localStorage for persistence
    const currentPoints = userData.points + points;
    localStorage.setItem('userPoints', currentPoints.toString());
  };

  useEffect(() => {
    // Check if running in Telegram
    const currentIsInTelegram = apiService.isInTelegram();
    setIsInTelegram(currentIsInTelegram);
    
    // Clear cache when switching between Telegram and browser
    if (currentIsInTelegram !== isInTelegram) {
      apiService.clearCache();
    }
    
    // Setup online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync with API
    syncWithAPI();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isInTelegram]);

  return (
    <AppContext.Provider value={{ 
      userData, 
      setUserData, 
      isOnline, 
      isAPIConnected,
      isInTelegram,
      loadingUser,
      hasRealData,
      telegramIdError,
      syncWithAPI,
      refreshUserData,
      isSubscriptionExpired,
      addPoints
    }}>
      {children}
    </AppContext.Provider>
  );
};