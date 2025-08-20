// Simple logger for debugging
const logger = {
  debug: (...args: any[]) => console.log('[DEBUG]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args)
};

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Telegram WebApp types
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    start_param?: string;
  };
  ready(): void;
  expand(): void;
  close(): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
  
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

class APIService {
  private baseURL: string;
  private cachedTelegramId: number | null = null;
  private cachedIsInTelegram: boolean | null = null;

  constructor() {
    // Hardcoded API URL as requested
    this.baseURL = 'https://sianmarketing.com/api/api/v1';
    this.initTelegramWebApp();
  }

  private initTelegramWebApp() {
    logger.debug('🚀 Initializing Telegram WebApp...');
    
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        logger.debug('✅ Telegram WebApp initialized successfully');
        logger.debug('📱 WebApp data:', window.Telegram.WebApp.initDataUnsafe);
      } catch (error) {
        logger.error('❌ Error initializing Telegram WebApp:', error);
      }
    } else {
      logger.debug('⚠️ Telegram WebApp not available (likely in browser)');
    }
  }

  isInTelegram(): boolean {
    if (this.cachedIsInTelegram !== null) {
      return this.cachedIsInTelegram;
    }

    const inTelegram = typeof window !== 'undefined' && 
                      window.Telegram?.WebApp && 
                      (window.Telegram.WebApp.initDataUnsafe?.user?.id || 
                       window.Telegram.WebApp.initData);
    
    this.cachedIsInTelegram = !!inTelegram;
    logger.debug(`🔍 Is in Telegram: ${this.cachedIsInTelegram}`);
    return this.cachedIsInTelegram;
  }

  getTelegramId(): number | null {
    if (this.cachedTelegramId !== null) {
      return this.cachedTelegramId;
    }

    try {
      // Method 1: Try initDataUnsafe
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        this.cachedTelegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        logger.debug(`🔍 Got Telegram ID from initDataUnsafe: ${this.cachedTelegramId}`);
        return this.cachedTelegramId;
      }

      // Method 2: Try parsing initData string
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
        const initData = window.Telegram.WebApp.initData;
        const userMatch = initData.match(/user=([^&]+)/);
        if (userMatch) {
          try {
            const userData = JSON.parse(decodeURIComponent(userMatch[1]));
            if (userData.id) {
              this.cachedTelegramId = userData.id;
              logger.debug(`🔍 Got Telegram ID from initData string: ${this.cachedTelegramId}`);
              return this.cachedTelegramId;
            }
          } catch (e) {
            logger.debug('❌ Failed to parse user data from initData string');
          }
        }
      }

      // Method 3: Try URL parameters (startapp)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const startParam = urlParams.get('startapp');
        if (startParam && !isNaN(Number(startParam))) {
          this.cachedTelegramId = Number(startParam);
          logger.debug(`🔍 Got Telegram ID from URL startapp: ${this.cachedTelegramId}`);
          return this.cachedTelegramId;
        }
      }

      // Method 4: Default for browser testing
      if (!this.isInTelegram()) {
        this.cachedTelegramId = 76599340; // Default ID for browser testing
        logger.debug(`🔍 Using default ID for browser testing: ${this.cachedTelegramId}`);
        return this.cachedTelegramId;
      }

      logger.debug('❌ No Telegram ID found');
      return null;
    } catch (error) {
      logger.error('❌ Error getting Telegram ID:', error || '');
      return null;
    }
  }

  async makeRequest<T = any>(method: string, endpoint: string, data?: any): Promise<APIResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      logger.debug(`📡 ${method} ${url}`, data || '');

      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      logger.debug(`✅ ${method} ${url} - Success:`, result || '');
      return result;
    } catch (error) {
      logger.error(`❌ API Request failed:`, error || '');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch('https://sianmarketing.com/api/health');
      return response.ok;
    } catch (error) {
      logger.error('Health check failed:', error || '');
      return false;
    }
  }

  async isAPIAvailable(): Promise<boolean> {
    return this.healthCheck();
  }

  // Get current user info
  async getCurrentUser(): Promise<APIResponse> {
    const telegramId = this.getTelegramId();
    
    if (!telegramId) {
      // Return mock data for browser testing
      if (!this.isInTelegram()) {
        return {
          success: true,
          data: {
            telegram_id: 76599340,
            username: "test_user",
            first_name: "Test",
            last_name: "User",
            current_session: 1,
            is_active: true,
            phone: "+98 912 345 6789"
          }
        };
      }
      
      return {
        success: false,
        error: 'No user ID available'
      };
    }

    return this.makeRequest('GET', `/user/${telegramId}`);
  }

  // Get user progress
  async getUserProgress(): Promise<APIResponse> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest('GET', `/user/${telegramId}/progress`);
  }

  // Send chat message to AI Coach
  async sendChatMessage(message: string): Promise<APIResponse<{
    response: string;
    message_id?: number;
  }>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<{
      response: string;
      message_id?: number;
    }>('POST', '/chat', {
      telegram_id: telegramId,
      message: message
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
    }>>('GET', `/user/${telegramId}/chat-history`);
  }

  // Get user profile (only requested fields)
  async getUserProfile(): Promise<APIResponse<{
    username: string;
    phone: string;
    email: string;
    monthly_income: number;
  }>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<{
      username: string;
      phone: string;
      email: string;
      monthly_income: number;
    }>('GET', `/user/${telegramId}/profile`);
  }

  // Update user profile (only requested fields)
  async updateUserProfile(profileData: {
    username: string;
    phone: string;
    email: string;
    monthly_income: number;
  }): Promise<APIResponse<{ message: string }>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<{ message: string }>('PUT', `/user/${telegramId}/profile`, profileData);
  }

  // Business Builder AI - Generate business plan with ChatGPT
  async generateBusinessPlan(businessData: {
    user_name: string;
    interests: string;
    skills: string;
    market: string;
  }): Promise<APIResponse<{
    businessName: string;
    tagline: string;
    description: string;
    targetAudience: string;
    products: string[];
    monetization: string[];
    firstAction: string;
  }>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<{
      businessName: string;
      tagline: string;
      description: string;
      targetAudience: string;
      products: string[];
      monetization: string[];
      firstAction: string;
    }>('POST', '/business-builder', {
      telegram_id: telegramId,
      ...businessData
    });
  }

  // SellKit AI - Generate sales kit with ChatGPT
  async generateSellKit(sellKitData: {
    product_name: string;
    description: string;
    target_audience: string;
    benefits: string;
  }): Promise<APIResponse<{
    title: string;
    headline: string;
    description: string;
    benefits: string[];
    priceRange: string;
    offer: string;
    visualSuggestion: string;
  }>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<{
      title: string;
      headline: string;
      description: string;
      benefits: string[];
      priceRange: string;
      offer: string;
      visualSuggestion: string;
    }>('POST', '/sellkit', {
      telegram_id: telegramId,
      ...sellKitData
    });
  }
}

const apiService = new APIService();
export default apiService;