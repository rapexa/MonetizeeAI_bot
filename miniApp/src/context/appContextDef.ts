import { createContext, useContext } from 'react';

export interface UserData {
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
  telegramId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  isVerified?: boolean;
  isActive?: boolean;
  currentSession?: number;
  subscriptionType?: string;
  planName?: string;
  subscriptionExpiry?: string;
  freeTrialUsed?: boolean;
  chatMessagesUsed?: number;
  courseSessionsUsed?: number;
}

export interface AppContextType {
  userData: UserData;
  setUserData: import('react').Dispatch<import('react').SetStateAction<UserData>>;
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

export { AppContext };
