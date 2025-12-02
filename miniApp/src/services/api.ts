// Production-safe logger
import { logger } from '../utils/logger';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  subscriptionExpired?: boolean;
  message?: string;
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
      logger.debug('🔍 Window object:', typeof window);
      logger.debug('🔍 Telegram object:', typeof window?.Telegram);
      logger.debug('🔍 WebApp object:', typeof window?.Telegram?.WebApp);
    }
  }

  isInTelegram(): boolean {
    if (this.cachedIsInTelegram !== null) {
      return this.cachedIsInTelegram;
    }

    const inTelegram = typeof window !== 'undefined' && 
                      window.Telegram?.WebApp && 
                      (window.Telegram.WebApp.initDataUnsafe?.user?.id || 
                       window.Telegram.WebApp.initData ||
                       window.Telegram.WebApp.initDataUnsafe?.start_param ||
                       window.location.href.includes('t.me'));
    
    this.cachedIsInTelegram = !!inTelegram;
    logger.debug(`🔍 Is in Telegram: ${this.cachedIsInTelegram}`);
    logger.debug(`🔍 Telegram WebApp available: ${!!window.Telegram?.WebApp}`);
    logger.debug(`🔍 initDataUnsafe:`, window.Telegram?.WebApp?.initDataUnsafe);
    logger.debug(`🔍 initData:`, window.Telegram?.WebApp?.initData);
    logger.debug(`🔍 URL:`, window.location.href);
    return this.cachedIsInTelegram;
  }

  getTelegramId(): number | null {
    if (this.cachedTelegramId !== null) {
      return this.cachedTelegramId;
    }

    try {
      logger.debug('🔍 Starting Telegram ID detection...');
      logger.debug('🔍 Telegram WebApp available:', !!window.Telegram?.WebApp);
      logger.debug('🔍 initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);
      logger.debug('🔍 initData:', window.Telegram?.WebApp?.initData);
      logger.debug('🔍 URL:', window.location.href);

      // Method 1: Try initDataUnsafe
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        this.cachedTelegramId = telegramId;
        this.saveTelegramIdToStorage(telegramId);
        logger.debug(`🔍 Got Telegram ID from initDataUnsafe: ${telegramId}`);
        return telegramId;
      }

      // Method 2: Try parsing initData string
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
        const initData = window.Telegram.WebApp.initData;
        const userMatch = initData.match(/user=([^&]+)/);
        if (userMatch) {
          try {
            const userData = JSON.parse(decodeURIComponent(userMatch[1]));
            if (userData.id) {
              const telegramId = userData.id;
              this.cachedTelegramId = telegramId;
              this.saveTelegramIdToStorage(telegramId);
              logger.debug(`🔍 Got Telegram ID from initData string: ${telegramId}`);
              return telegramId;
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
          const telegramId = Number(startParam);
          this.cachedTelegramId = telegramId;
          this.saveTelegramIdToStorage(telegramId);
          logger.debug(`🔍 Got Telegram ID from URL startapp: ${telegramId}`);
          return telegramId;
        }
      }

      // Method 4: Use test user for browser testing (both dev and production)
      // Priority: Always use 76599340 as test user when not in Telegram
      if (!this.isInTelegram()) {
        // Clear any saved telegram_id from localStorage to force using test user
        if (typeof window !== 'undefined') {
          localStorage.removeItem('telegram_id');
        }
        this.cachedTelegramId = 76599340; // Test user: RAPEXA (@Rapexam)
        this.saveTelegramIdToStorage(76599340);
        logger.debug(`🔍 Using test user ID for browser testing: ${this.cachedTelegramId} (RAPEXA)`);
        return this.cachedTelegramId;
      }

      logger.debug('❌ No Telegram ID found - user must access from Telegram');
      return null;
    } catch (error) {
      logger.error('❌ Error getting Telegram ID:', error || '');
      return null;
    }
  }

  private saveTelegramIdToStorage(telegramId: number): void {
    if (typeof window !== 'undefined') {
      try {
        // Only save to localStorage if we're not in Telegram WebApp
        if (!this.isInTelegram()) {
          localStorage.setItem('telegram_id', telegramId.toString());
          logger.debug(`💾 Saved Telegram ID to localStorage: ${telegramId}`);
        } else {
          // Clear localStorage when in Telegram WebApp to avoid conflicts
          localStorage.removeItem('telegram_id');
          logger.debug(`🗑️ Cleared localStorage for Telegram WebApp user: ${telegramId}`);
        }
      } catch (error) {
        logger.error('❌ Failed to save Telegram ID to localStorage:', error);
      }
    }
  }

  // Clear cached data when switching between Telegram and browser
  clearCache(): void {
    this.cachedTelegramId = null;
    this.cachedIsInTelegram = null;
    logger.debug('🗑️ Cleared API service cache');
  }

  async makeRequest<T = any>(method: string, endpoint: string, data?: any): Promise<APIResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      logger.debug(`📡 ${method} ${url}`, data || '');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add Telegram WebApp authentication headers
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        // Add init data if available
        if (window.Telegram.WebApp.initData) {
          headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
        }
        
        // Add user agent info to help with authentication
        headers['X-Telegram-WebApp'] = 'true';
        
        // Add start param if available
        if (window.Telegram.WebApp.initDataUnsafe?.start_param) {
          headers['X-Telegram-Start-Param'] = window.Telegram.WebApp.initDataUnsafe.start_param;
        }
      }

      const config: RequestInit = {
        method,
        headers,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        // Handle rate limit errors specifically
        if (response.status === 429) {
          return {
            success: false,
            error: result.error || 'شما به محدودیت سه تا سوال در دقیقه رسیدید لطفا دقایق دیگر امتحان کنید'
          };
        }
        // Handle subscription expired (403 Forbidden)
        if (response.status === 403 && result.error && result.error.includes('subscription has expired')) {
          return {
            success: false,
            error: 'SUBSCRIPTION_EXPIRED',
            subscriptionExpired: true,
            message: result.error || 'اشتراک شما به پایان رسید است. لطفا به ربات برگردید و اشتراک خریداری کنید.'
          };
        }
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
      return {
        success: false,
        error: 'No user ID available - please access from Telegram or provide valid telegram_id'
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

  // ClientFinder AI - Generate client finding strategy with ChatGPT
  async generateClientFinder(clientFinderData: {
    product: string;
    target_client: string;
    platforms: string[];
  }): Promise<APIResponse<{
    channels: Array<{
      name: string;
      reason: string;
    }>;
    outreachMessage: string;
    hashtags: string[];
    actionPlan: string[];
  }>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<{
      channels: Array<{
        name: string;
        reason: string;
      }>;
      outreachMessage: string;
      hashtags: string[];
      actionPlan: string[];
    }>('POST', '/clientfinder', {
      telegram_id: telegramId,
      ...clientFinderData
    });
  }

  // SalesPath AI - Generate sales path strategy with ChatGPT
  async generateSalesPath(salesPathData: {
    product_name: string;
    target_audience: string;
    sales_channel: string;
    goal: string;
  }): Promise<APIResponse<{
    dailyPlan: Array<{
      day: string;
      action: string;
      content: string;
    }>;
    salesTips: string[];
    engagement: string[];
  }>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<{
      dailyPlan: Array<{
        day: string;
        action: string;
        content: string;
      }>;
      salesTips: string[];
      engagement: string[];
    }>('POST', '/salespath', {
      telegram_id: telegramId,
      ...salesPathData
    });
  }

  // Quiz evaluation - Evaluate quiz answers with ChatGPT
  async evaluateQuiz(quizData: {
    stage_id: number;
    answers: { [key: string]: any };
  }): Promise<APIResponse<{
    passed: boolean;
    score: number;
    feedback: string;
    next_stage_unlocked: boolean;
  }>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<{
      passed: boolean;
      score: number;
      feedback: string;
      next_stage_unlocked: boolean;
    }>('POST', '/evaluate-quiz', {
      telegram_id: telegramId,
      ...quizData
    });
  }

  // Create payment request
  async createPaymentRequest(planType: 'starter' | 'pro' | 'ultimate'): Promise<APIResponse<{
    authority: string;
    payment_url: string;
    amount: number;
    plan_type: string;
  }>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    return this.makeRequest<{
      authority: string;
      payment_url: string;
      amount: number;
      plan_type: string;
    }>('POST', '/payment/create', {
      telegram_id: telegramId,
      plan_type: planType
    });
  }

  // Check payment status
  async checkPaymentStatus(authority: string): Promise<APIResponse<{
    status: string;
    ref_id: string;
    amount: number;
    type: string;
    success: boolean;
    failed: boolean;
    pending: boolean;
  }>> {
    return this.makeRequest<{
      status: string;
      ref_id: string;
      amount: number;
      type: string;
      success: boolean;
      failed: boolean;
      pending: boolean;
    }>('GET', `/payment/status?authority=${encodeURIComponent(authority)}`);
  }
}

const apiService = new APIService();
export default apiService;