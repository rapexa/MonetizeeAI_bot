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
    // Default to localhost for development, but allow override via environment
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
    this.initTelegramWebApp();
  }

  private initTelegramWebApp() {
    // Initialize Telegram WebApp if available
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      this.telegramData = tg.initDataUnsafe;
      
      // Expand to full height
      tg.expand();
      
      // Set theme
      document.documentElement.style.setProperty('--tg-color-scheme', tg.colorScheme);
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

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Get current user's Telegram ID
  getTelegramId(): number | null {
    if (this.telegramData?.user?.id) {
      return this.telegramData.user.id;
    }
    
    // Fallback for development/testing
    const devUserId = import.meta.env.VITE_DEV_TELEGRAM_ID;
    if (devUserId) {
      return parseInt(devUserId, 10);
    }
    
    return null;
  }

  // Get current user info
  getCurrentUser(): any {
    return this.telegramData?.user || null;
  }

  // Authenticate with Telegram user data
  async authenticateTelegramUser(): Promise<APIResponse<UserInfo>> {
    const telegramId = this.getTelegramId();
    const user = this.getCurrentUser();

    if (!telegramId) {
      return {
        success: false,
        error: 'Telegram user ID not available. Please open this app from Telegram.',
      };
    }

    return this.makeRequest<UserInfo>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: telegramId,
        username: user?.username || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
      }),
    });
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
    return this.makeRequest<{ status: string; service: string }>('/health', {
      method: 'GET',
    });
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
