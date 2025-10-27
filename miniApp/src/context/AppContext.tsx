import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';



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
    unlockedLevels: 0
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
      console.log('🚀 Starting API sync...');
      setLoadingUser(true);
      
      // Check if API is available
      console.log('🔍 Checking API availability...');
      const apiAvailable = await apiService.isAPIAvailable();
      console.log('📡 API Available:', apiAvailable);
      setIsAPIConnected(apiAvailable);
      
      if (!apiAvailable) {
        console.log('❌ API not available, setting fallback data');
        // Set some basic fallback data when API is not available
        setUserData(prev => ({
          ...prev,
          incomeMonth: 2450000, // Default fallback
    incomeToday: 150000,
    activeLeads: 12,
    negotiatingCustomers: 3,
    firstGoal: 5000000,
    progressOverall: 35,
    currentLevel: 3,
    completedTasks: 28,
    unlockedLevels: 4
        }));
        setHasRealData(false); // This is fallback data, not real
        setLoadingUser(false);
        return;
      }

      // Try to authenticate user
      console.log('🔐 Attempting user authentication...');
      const authResponse = await apiService.getCurrentUser();
      
      if (authResponse.success && authResponse.data) {
        const userInfo = authResponse.data as any;
        
        // Get detailed progress
        const progressResponse = await apiService.getUserProgress();
        
        // Get user profile (for monthly income)
        const profileResponse = await apiService.getUserProfile();
        
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
        
        console.log('✅ Successfully synced with API');
        console.log('📊 Final User Data:', {
          currentLevel: progressResponse.success && progressResponse.data ? progressResponse.data.current_level : userInfo.level,
          progressOverall: progressResponse.success && progressResponse.data ? progressResponse.data.progress_percent : userInfo.progress,
          completedTasks: progressResponse.success && progressResponse.data ? progressResponse.data.completed_sessions : userInfo.completed_tasks,
          monthlyIncome: profileResponse.success && profileResponse.data ? profileResponse.data.monthly_income : 'default'
        });
      } else {
        console.log('❌ Authentication failed:', authResponse.error);
        
        // If no telegram_id available, show appropriate message
        if (authResponse.error?.includes('No user ID available')) {
          console.log('⚠️ No Telegram ID available - user must access from Telegram');
          setTelegramIdError('لطفا از طریق تلگرام وارد شوید تا اطلاعات شما نمایش داده شود');
          // Keep using default data but mark as not real
          setHasRealData(false);
        } else {
          // Keep using default data for other errors
          setHasRealData(false);
          setTelegramIdError(null);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing with API:', error);
      setIsAPIConnected(false);
    } finally {
      setLoadingUser(false);
    }
  };

  // Refresh user data from API
  const refreshUserData = async () => {
    if (!isAPIConnected) return;
    
    try {
      console.log('🔄 Refreshing user data...');
      const userResponse = await apiService.getCurrentUser();
      const progressResponse = await apiService.getUserProgress();
      const profileResponse = await apiService.getUserProfile();
      
      if (userResponse.success && userResponse.data) {
        const userInfo = userResponse.data as any;
        
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
        
        // Update hasRealData if we successfully get data
        if (!hasRealData) {
          setHasRealData(true);
        }
        
        console.log('✅ User data refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Check if subscription has expired
  const isSubscriptionExpired = (): boolean => {
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
    if (!userData.subscriptionType || userData.subscriptionType === 'none') {
      return true;
    }
    
    return false;
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
      isSubscriptionExpired
    }}>
      {children}
    </AppContext.Provider>
  );
};