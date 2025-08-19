import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService, UserInfo, UserProgress } from '../services/api';

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
}

interface AppContextType {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  isOnline: boolean;
  isAPIConnected: boolean;
  isInTelegram: boolean;
  loadingUser: boolean;
  syncWithAPI: () => Promise<void>;
  refreshUserData: () => Promise<void>;
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
  // Default data (fallback for when API is not available)
  const [userData, setUserData] = useState<UserData>({
    incomeMonth: 2450000, // تومان
    incomeToday: 150000,
    activeLeads: 12,
    negotiatingCustomers: 3,
    firstGoal: 5000000,
    progressOverall: 35,
    currentLevel: 3,
    completedTasks: 28,
    unlockedLevels: 4
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAPIConnected, setIsAPIConnected] = useState(false);
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

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
        console.log('❌ API not available, using default data');
        setLoadingUser(false);
        return;
      }

      // Try to authenticate user
      console.log('🔐 Attempting user authentication...');
      const authResponse = await apiService.authenticateTelegramUser();
      
      if (authResponse.success && authResponse.data) {
        const userInfo = authResponse.data;
        
        // Get detailed progress
        const progressResponse = await apiService.getUserProgress();
        
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
          
          // Update progress with API data if available
          ...(progressResponse.success && progressResponse.data ? {
            currentLevel: progressResponse.data.current_level,
            progressOverall: progressResponse.data.progress_percent,
            completedTasks: progressResponse.data.completed_sessions,
          } : {})
        }));
        
        console.log('✅ Successfully synced with API');
        console.log('📊 Final User Data:', {
          currentLevel: progressResponse.success && progressResponse.data ? progressResponse.data.current_level : userInfo.level,
          progressOverall: progressResponse.success && progressResponse.data ? progressResponse.data.progress_percent : userInfo.progress,
          completedTasks: progressResponse.success && progressResponse.data ? progressResponse.data.completed_sessions : userInfo.completed_tasks
        });
      } else {
        console.log('❌ Authentication failed:', authResponse.error);
        // Keep using default data
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
      const userResponse = await apiService.getUserInfo();
      const progressResponse = await apiService.getUserProgress();
      
      if (userResponse.success && userResponse.data) {
        const userInfo = userResponse.data;
        
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
          
          // Update progress with API data if available
          ...(progressResponse.success && progressResponse.data ? {
            currentLevel: progressResponse.data.current_level,
            progressOverall: progressResponse.data.progress_percent,
            completedTasks: progressResponse.data.completed_sessions,
          } : {})
        }));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    // Check if running in Telegram
    setIsInTelegram(apiService.isInTelegram());
    
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
  }, []);

  return (
    <AppContext.Provider value={{ 
      userData, 
      setUserData, 
      isOnline, 
      isAPIConnected,
      isInTelegram,
      loadingUser,
      syncWithAPI,
      refreshUserData
    }}>
      {children}
    </AppContext.Provider>
  );
};