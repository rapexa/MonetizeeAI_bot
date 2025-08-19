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
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEV_TELEGRAM_ID?: string;
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
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
    // Initialize Telegram WebApp if available
    if (typeof window !== 'undefined') {
      console.log('🔍 Window object available');
      console.log('🔍 window.Telegram:', window.Telegram);
      
      // First try to parse URL parameters
      this.parseURLParameters();
      
      if (window.Telegram?.WebApp) {
        console.log('✅ Telegram WebApp found');
        const tg = window.Telegram.WebApp;
        
        // Wait for WebApp to be ready
        tg.ready();
        
        console.log('📱 Telegram WebApp ready');
        console.log('📊 initData:', tg.initData);
        console.log('📊 initDataUnsafe:', tg.initDataUnsafe);
        
        // Use WebApp data if available and not empty, otherwise keep URL data
        if (tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0) {
          this.telegramData = tg.initDataUnsafe;
          console.log('✅ Using Telegram WebApp initDataUnsafe');
        } else if (tg.initData) {
          // Try to parse initData string
          this.parseInitDataString(tg.initData);
        } else {
          console.log('🔄 Using URL parameters or default data');
        }
        
        // Expand to full height
        tg.expand();
        
        // Set theme
        document.documentElement.style.setProperty('--tg-color-scheme', tg.colorScheme);
        
        console.log('🎨 Theme set:', tg.colorScheme);
      } else {
        console.log('❌ Telegram WebApp not found');
        console.log('🔍 Available on window:', Object.keys(window));
        
        // Try to wait for Telegram to load
        setTimeout(() => {
          if (window.Telegram?.WebApp) {
            console.log('⏰ Telegram WebApp found after delay');
            this.initTelegramWebApp();
          }
        }, 1000);
      }
    } else {
      console.log('❌ Window object not available');
    }
  }

  // Parse user data from URL parameters
  private parseURLParameters() {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.substring(1));
    
    console.log('🔍 Checking URL parameters...');
    console.log('📊 Current URL:', window.location.href);
    console.log('📊 Search params:', window.location.search);
    console.log('📊 Hash fragment:', window.location.hash);
    
    // Check for tgWebAppData parameter (Telegram Mini App format)
    const tgWebAppData = urlParams.get('tgWebAppData') || fragment.get('tgWebAppData');
    if (tgWebAppData) {
      console.log('🔍 Found tgWebAppData:', tgWebAppData);
      try {
        const decodedData = decodeURIComponent(tgWebAppData);
        const parsedData = new URLSearchParams(decodedData);
        const userStr = parsedData.get('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          this.telegramData = { user: userData };
          console.log('✅ Parsed user data from tgWebAppData:', userData);
          return;
        }
      } catch (error) {
        console.log('❌ Error parsing tgWebAppData:', error);
      }
    }
    
    // Try to get user data from various possible parameter names
    const possibleUserData = {
      id: urlParams.get('user_id') || fragment.get('user_id') || 
          urlParams.get('telegram_id') || fragment.get('telegram_id'),
      first_name: urlParams.get('first_name') || fragment.get('first_name'),
      last_name: urlParams.get('last_name') || fragment.get('last_name'),
      username: urlParams.get('username') || fragment.get('username'),
      language_code: urlParams.get('language_code') || fragment.get('language_code') || 'fa'
    };
    
    // If we found user ID from URL parameters
    if (possibleUserData.id) {
      this.telegramData = {
        user: {
          id: parseInt(possibleUserData.id, 10),
          first_name: possibleUserData.first_name || '',
          last_name: possibleUserData.last_name || '',
          username: possibleUserData.username || '',
          language_code: possibleUserData.language_code
        }
      };
      console.log('✅ Parsed user data from URL parameters:', this.telegramData.user);
    } else {
      console.log('❌ No user data found in URL parameters');
    }
  }

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
    
    if (this.telegramData?.user?.id) {
      console.log('✅ Found Telegram ID:', this.telegramData.user.id);
      return this.telegramData.user.id;
    }
    
    // Try direct access to Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      console.log('✅ Found Telegram ID via direct access:', window.Telegram.WebApp.initDataUnsafe.user.id);
      this.telegramData = window.Telegram.WebApp.initDataUnsafe; // Update cached data
      return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    
    // Check if we have empty initDataUnsafe (browser testing)
    const hasEmptyTelegramData = typeof window !== 'undefined' && 
      window.Telegram?.WebApp?.initDataUnsafe && 
      Object.keys(window.Telegram.WebApp.initDataUnsafe).length === 0;
    
    if (hasEmptyTelegramData) {
      console.log('🔧 Empty Telegram data detected (browser testing), using default ID: 76599340');
      return 76599340;
    }
    
    // Fallback for development/testing
    const devUserId = import.meta.env.VITE_DEV_TELEGRAM_ID;
    if (devUserId) {
      console.log('🔧 Using dev Telegram ID from env:', devUserId);
      return parseInt(devUserId, 10);
    }
    
    // Default test user ID for development outside Telegram
    if (!this.isInTelegram()) {
      console.log('🔧 Using default test Telegram ID: 76599340');
      return 76599340;
    }
    
    console.log('❌ No Telegram ID found');
    return null;
  }

  // Get current user info
  getCurrentUser(): any {
    // If we have real Telegram data, use it
    if (this.telegramData?.user) {
      return this.telegramData.user;
    }
    
    // Check if we have empty initDataUnsafe (browser testing) or not in Telegram
    const hasEmptyTelegramData = typeof window !== 'undefined' && 
      window.Telegram?.WebApp?.initDataUnsafe && 
      Object.keys(window.Telegram.WebApp.initDataUnsafe).length === 0;
    
    if (hasEmptyTelegramData || !this.isInTelegram()) {
      console.log('🔧 Using mock user data for testing');
      return {
        id: 76599340,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'fa'
      };
    }
    
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
