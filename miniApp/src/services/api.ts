// API Service for MonetizeeAI Bot Integration

// Telegram WebApp types
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initDataUnsafe: any;
  initData: string;
  colorScheme: string;
  MainButton: {
    text: string;
    onClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  showAlert: (message: string) => void;
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// Vite env types
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_DEV_TELEGRAM_ID?: string;
    readonly VITE_ENVIRONMENT?: string;
    readonly VITE_DEBUG?: string;
  }
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UserInfo {
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  current_session: number;
  is_verified: boolean;
  is_active: boolean;
  level: number;
  progress: number;
  completed_tasks: number;
}

export interface UserProgress {
  current_session: number;
  completed_sessions: number;
  total_sessions: number;
  current_level: number;
  level_name: string;
  level_description: string;
  level_emoji: string;
  progress_percent: number;
  next_level?: {
    level: number;
    name: string;
    description: string;
    emoji: string;
  };
}

export interface SessionInfo {
  number: number;
  title: string;
  description: string;
  is_active: boolean;
  is_completed: boolean;
}

class APIService {
  private baseURL: string;
  private telegramData: any = null;

  constructor() {
    // Hardcoded API URL for production
    this.baseURL = 'https://sianmarketing.com/api/api/v1';
    
    // Debug URL information first
    this.debugURL();
    
    // Try to initialize immediately
    this.initTelegramWebApp();
    
    // Also try after DOM is loaded
    if (typeof window !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          console.log('📄 DOM loaded, retrying Telegram init...');
          this.initTelegramWebApp();
        });
      }
      
      // And try after a delay for good measure
      setTimeout(() => {
        console.log('⏰ Timeout reached, retrying Telegram init...');
        this.initTelegramWebApp();
      }, 2000);
    }
  }

  // Debug URL and environment information
  private debugURL() {
    if (typeof window !== 'undefined') {
      console.log('🌐 === URL DEBUG INFORMATION ===');
      console.log('📍 Full URL:', window.location.href);
      console.log('🏠 Origin:', window.location.origin);
      console.log('📄 Pathname:', window.location.pathname);
      console.log('🔍 Search:', window.location.search);
      console.log('🔗 Hash:', window.location.hash);
      console.log('🌍 Referrer:', document.referrer);
      console.log('📱 User Agent:', navigator.userAgent);
      console.log('🔧 Is Telegram:', navigator.userAgent.includes('Telegram'));
      console.log('================================');
    }
  }

  private initTelegramWebApp() {
    if (typeof window === 'undefined') {
      console.log('❌ Window object not available');
      return;
    }

    console.log('🔍 Initializing Telegram WebApp...');
    console.log('🔍 window.Telegram:', window.Telegram);
    
    if (window.Telegram?.WebApp) {
      console.log('✅ Telegram WebApp found');
      const tg = window.Telegram.WebApp;
      
      // Initialize WebApp
      tg.ready();
      console.log('📱 Telegram WebApp ready');
      
      // Log all available data for debugging
      console.log('📊 === TELEGRAM WEBAPP DATA ===');
      console.log('📊 initData (raw):', tg.initData);
      console.log('📊 initDataUnsafe:', tg.initDataUnsafe);
      console.log('📊 colorScheme:', tg.colorScheme);
      console.log('📊 Available properties:', Object.keys(tg));
      console.log('================================');
      
      // Try to get user data from any available source
      if (tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0 && tg.initDataUnsafe.user) {
        this.telegramData = tg.initDataUnsafe;
        console.log('✅ Using initDataUnsafe:', this.telegramData);
      } else if (tg.initData) {
        console.log('🔍 Parsing initData string...');
        this.parseInitDataString(tg.initData);
      } else {
        console.log('⚠️ No user data found in Telegram WebApp');
      }
      
      // Setup WebApp
      tg.expand();
      document.documentElement.style.setProperty('--tg-color-scheme', tg.colorScheme);
      console.log('🎨 Theme and layout configured');
      
    } else {
      console.log('❌ Telegram WebApp not found, retrying in 1 second...');
      console.log('🔍 Available on window:', Object.keys(window));
      
      setTimeout(() => {
        if (window.Telegram?.WebApp) {
          console.log('⏰ Telegram WebApp found after delay');
          this.initTelegramWebApp();
        } else {
          console.log('❌ Telegram WebApp still not available after delay');
        }
      }, 1000);
    }
  }

  // This method was removed as it's now integrated into getTelegramId()

  // Parse initData string format
  private parseInitDataString(initData: string) {
    if (!initData) return;
    
    console.log('🔍 Parsing initData string:', initData);
    try {
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        this.telegramData = { user: userData };
        console.log('✅ Parsed user data from initData string:', userData);
      }
    } catch (error) {
      console.log('❌ Error parsing initData string:', error);
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };

      // Add Telegram init data if available
      if (this.telegramData && window.Telegram?.WebApp?.initData) {
        headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
      }

      console.log('🌐 API Request:', {
        url,
        method: options.method || 'GET',
        headers,
        body: options.body
      });

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('📡 API Response Status:', response.status, response.statusText);

      const data = await response.json();
      console.log('📦 API Response Data:', data);

      if (!response.ok) {
        console.log('❌ API Error Response:', data);
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return data;
    } catch (error) {
      console.error('❌ API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Get current user's Telegram ID
  getTelegramId(): number | null {
    console.log('🔍 Getting Telegram ID...');
    console.log('📊 telegramData:', this.telegramData);
    
    // Try multiple ways to get Telegram user ID
    let userId = null;
    
    // Method 1: From cached telegramData
    if (this.telegramData?.user?.id) {
      userId = this.telegramData.user.id;
      console.log('✅ Method 1 - Found Telegram ID from cached data:', userId);
      return userId;
    }
    
    // Method 2: Direct access to initDataUnsafe
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      userId = window.Telegram.WebApp.initDataUnsafe.user.id;
      console.log('✅ Method 2 - Found Telegram ID via initDataUnsafe:', userId);
      this.telegramData = window.Telegram.WebApp.initDataUnsafe;
      return userId;
    }
    
    // Method 3: Parse initData string if available
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
      const initData = window.Telegram.WebApp.initData;
      console.log('🔍 Method 3 - Trying to parse initData string:', initData);
      
      try {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
          const userData = JSON.parse(decodeURIComponent(userStr));
          if (userData.id) {
            userId = userData.id;
            this.telegramData = { user: userData };
            console.log('✅ Method 3 - Parsed user from initData:', userData);
            return userId;
          }
        }
      } catch (error) {
        console.log('❌ Method 3 - Error parsing initData:', error);
      }
    }
    
    // Method 4: Check URL parameters (for direct Mini App links)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Check for Telegram startapp parameter
      const startApp = urlParams.get('startapp') || hashParams.get('startapp');
      if (startApp) {
        console.log('🔍 Found startapp parameter:', startApp);
        // Simple numeric ID format
        const numericId = parseInt(startApp, 10);
        if (!isNaN(numericId)) {
          userId = numericId;
          console.log('✅ Method 4 - Extracted user ID from startapp:', userId);
          return userId;
        }
      }
      
      // Check other parameter names
      const possibleIds = [
        urlParams.get('user_id'),
        hashParams.get('user_id'),
        urlParams.get('telegram_id'),
        hashParams.get('telegram_id')
      ].filter(Boolean);
      
      if (possibleIds.length > 0 && possibleIds[0] !== null) {
        userId = parseInt(possibleIds[0], 10);
        console.log('✅ Method 4 - Found user ID in URL parameters:', userId);
        return userId;
      }
    }
    
    // Fallback: Default test ID for development
    console.log('❌ No Telegram ID found, using default test ID');
    return 76599340;
  }

  // Get current user info
  getCurrentUser(): any {
    console.log('🔍 Getting current user...');
    
    // Method 1: Use cached data
    if (this.telegramData?.user) {
      console.log('✅ Found user from cached data:', this.telegramData.user);
      return this.telegramData.user;
    }
    
    // Method 2: Try to get fresh data from Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Try initDataUnsafe first
      if (tg.initDataUnsafe?.user) {
        console.log('✅ Found user from initDataUnsafe:', tg.initDataUnsafe.user);
        this.telegramData = tg.initDataUnsafe;
        return tg.initDataUnsafe.user;
      }
      
      // Try parsing initData string
      if (tg.initData) {
        console.log('🔍 Trying to parse initData for user info...');
        try {
          const params = new URLSearchParams(tg.initData);
          const userStr = params.get('user');
          if (userStr) {
            const userData = JSON.parse(decodeURIComponent(userStr));
            console.log('✅ Parsed user from initData:', userData);
            this.telegramData = { user: userData };
            return userData;
          }
        } catch (error) {
          console.log('❌ Error parsing user from initData:', error);
        }
      }
    }
    
    // Method 3: Create default user with the ID we found
    const telegramId = this.getTelegramId();
    if (telegramId) {
      const defaultUser = {
        id: telegramId,
        first_name: 'Telegram',
        last_name: 'User',
        username: `user_${telegramId}`,
        language_code: 'fa'
      };
      console.log('🔧 Created default user with Telegram ID:', defaultUser);
      return defaultUser;
    }
    
    console.log('❌ No user data available');
    return null;
  }

  // Authenticate with Telegram user data
  async authenticateTelegramUser(): Promise<APIResponse<UserInfo>> {
    const telegramId = this.getTelegramId();
    const user = this.getCurrentUser();

    // Debug logging
    console.log('🔍 Debug - Telegram ID:', telegramId);
    console.log('🔍 Debug - User data:', user);
    console.log('🔍 Debug - Full telegram data:', this.telegramData);
    console.log('🔍 Debug - Is in Telegram:', this.isInTelegram());

    if (!telegramId) {
      console.log('❌ No Telegram ID found');
      return {
        success: false,
        error: 'Telegram user ID not available. Please open this app from Telegram.',
      };
    }

    const requestData = {
      telegram_id: telegramId,
      username: user?.username || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
    };

    console.log('📤 Sending auth request:', requestData);

    const result = await this.makeRequest<UserInfo>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    console.log('📥 Auth response:', result);
    return result;
  }

  // Get user information
  async getUserInfo(telegramId?: number): Promise<APIResponse<UserInfo>> {
    const userId = telegramId || this.getTelegramId();
    if (!userId) {
      return {
        success: false,
        error: 'User ID not available',
      };
    }

    return this.makeRequest<UserInfo>(`/user/${userId}`);
  }

  // Get user progress
  async getUserProgress(telegramId?: number): Promise<APIResponse<UserProgress>> {
    const userId = telegramId || this.getTelegramId();
    if (!userId) {
      return {
        success: false,
        error: 'User ID not available',
      };
    }

    return this.makeRequest<UserProgress>(`/user/${userId}/progress`);
  }

  // Get all sessions
  async getAllSessions(): Promise<APIResponse<SessionInfo[]>> {
    return this.makeRequest<SessionInfo[]>('/sessions');
  }

  // Get specific session
  async getSession(sessionNumber: number): Promise<APIResponse<SessionInfo>> {
    return this.makeRequest<SessionInfo>(`/sessions/${sessionNumber}`);
  }

  // Update user progress (placeholder for future features)
  async updateUserProgress(
    action: string,
    data: any,
    telegramId?: number
  ): Promise<APIResponse<any>> {
    const userId = telegramId || this.getTelegramId();
    if (!userId) {
      return {
        success: false,
        error: 'User ID not available',
      };
    }

    return this.makeRequest<any>(`/user/${userId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ action, data }),
    });
  }

  // Send chat message to AI Coach
  async sendChatMessage(message: string): Promise<APIResponse<{ response: string }>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<{ response: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: telegramId,
        message: message
      }),
    });
  }

  // Get chat history
  async getChatHistory(): Promise<APIResponse<Array<{
    id: number;
    telegram_id: number;
    message: string;
    response: string;
    created_at: string;
    updated_at: string;
  }>>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<Array<{
      id: number;
      telegram_id: number;
      message: string;
      response: string;
      created_at: string;
      updated_at: string;
    }>>(`/user/${telegramId}/chat-history`);
  }

  // Health check
  async healthCheck(): Promise<APIResponse<{ status: string; service: string }>> {
    // Use direct health endpoint that's confirmed working
    try {
      const response = await fetch('https://sianmarketing.com/api/health');
      const data = await response.json();
      
      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Check if running in Telegram
  isInTelegram(): boolean {
    return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
  }

  // Check if API is available
  async isAPIAvailable(): Promise<boolean> {
    try {
      const response = await this.healthCheck();
      return response.success;
    } catch {
      return false;
    }
  }

  // Show Telegram popup (if available)
  showAlert(message: string) {
    if (this.isInTelegram() && window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
    }
  }

  // Show Telegram confirm (if available)
  showConfirm(message: string, callback: (confirmed: boolean) => void) {
    if (this.isInTelegram() && window.Telegram?.WebApp) {
      window.Telegram.WebApp.showConfirm(message, callback);
    } else {
      callback(confirm(message));
    }
  }

  // Set main button (if in Telegram)
  setMainButton(text: string, onClick: () => void) {
    if (this.isInTelegram() && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.MainButton.text = text;
      tg.MainButton.onClick(onClick);
      tg.MainButton.show();
    }
  }

  // Hide main button
  hideMainButton() {
    if (this.isInTelegram() && window.Telegram?.WebApp) {
      window.Telegram.WebApp.MainButton.hide();
    }
  }
}

// Export singleton instance
export const apiService = new APIService();
export default apiService;
