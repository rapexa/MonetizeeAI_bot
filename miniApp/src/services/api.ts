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

// ⚡ PERFORMANCE: Request cache for GET requests
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class APIService {
  private baseURL: string;
  private cachedTelegramId: number | null = null;
  private cachedIsInTelegram: boolean | null = null;
  // ⚡ PERFORMANCE: Request cache (5 minute TTL for GET requests)
  private requestCache = new Map<string, CacheEntry<any>>();

  constructor() {
    // Hardcoded API URL as requested
    this.baseURL = 'https://sianmarketing.com/api/api/v1';
    this.initTelegramWebApp();
  }

  private initTelegramWebApp() {
    // ⚡ PERFORMANCE: Minimal initialization - skip debug logging
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      } catch (error) {
        // Silently fail - don't log in production
      }
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
    // ⚡ PERFORMANCE: Removed debug logging for faster execution
    return this.cachedIsInTelegram;
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
    this.requestCache.clear();
    logger.debug('🗑️ Cleared API service cache');
  }

  // Clear cache for tickets-related endpoints
  clearTicketsCache(): void {
    const telegramId = this.getTelegramId();
    if (telegramId) {
      // Clear tickets list cache
      const ticketsListUrl = `${this.baseURL}/user/${telegramId}/tickets`;
      this.requestCache.delete(ticketsListUrl);
    }
    // Clear all ticket detail caches (pattern: /tickets/{id})
    for (const key of this.requestCache.keys()) {
      if (key.includes('/tickets/')) {
        this.requestCache.delete(key);
      }
    }
    logger.debug('🗑️ Cleared tickets cache');
  }

  // ⚡ PERFORMANCE: Get from cache or return null
  private getCached<T>(key: string): T | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      logger.debug(`📦 Cache hit for ${key}`);
      return cached.data as T;
    }
    if (cached) {
      this.requestCache.delete(key); // Remove expired entry
    }
    return null;
  }

  // ⚡ PERFORMANCE: Set cache entry
  private setCache<T>(key: string, data: T, ttlMinutes: number = 5): void {
    this.requestCache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    });
  }

  async makeRequest<T = any>(method: string, endpoint: string, data?: any, useCache: boolean = false): Promise<APIResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      
      // ⚡ PERFORMANCE: Check cache for GET requests
      if (method === 'GET' && useCache) {
        const cached = this.getCached<APIResponse<T>>(url);
        if (cached) {
          return cached;
        }
      }

      // ⚡ PERFORMANCE: Removed verbose debug logging

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add Telegram WebApp authentication headers (if in Telegram)
      // ⚠️ SECURITY: Only send X-Telegram-WebApp header if we have valid initData
      // Don't trust just the presence of window.Telegram.WebApp (it can exist in web browsers too)
      const isInTelegram = this.isInTelegram();
      const hasInitData = typeof window !== 'undefined' && 
                         window.Telegram?.WebApp?.initData && 
                         window.Telegram.WebApp.initData.length > 0;
      
      if (isInTelegram && hasInitData && window.Telegram?.WebApp) {
        // Only send Telegram headers if we're actually in Telegram with valid initData
        headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
        
        // ⚠️ REMOVED: X-Telegram-WebApp header - backend doesn't trust it anymore
        // Backend now only trusts: startapp query parameter, validated initData, User-Agent, and Referer
        
        // Add start param if available
        if (window.Telegram.WebApp.initDataUnsafe?.start_param) {
          headers['X-Telegram-Start-Param'] = window.Telegram.WebApp.initDataUnsafe.start_param;
        }
      } else {
        // If not in Telegram, check for web session token
        const webToken = localStorage.getItem('web_session_token');
        if (webToken) {
          headers['Authorization'] = `Bearer ${webToken}`;
        }
      }

      const config: RequestInit = {
        method,
        headers,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
      }

      // ⚡ PERFORMANCE & RELIABILITY: Add timeout to prevent hanging requests (10 seconds max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
      config.signal = controller.signal;

      const response = await fetch(url, config);
      clearTimeout(timeoutId);
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
        // Handle access denied (403 Forbidden) - redirect to web login if not already there
        if (response.status === 403) {
          const errorMessage = (result.error || '').toLowerCase();
          // Check if it's an authentication error (not subscription expired)
          // Backend sends: "Access denied. Please login via /web-login or use Telegram Mini App."
          if ((errorMessage.includes('access denied') || 
               errorMessage.includes('please login') || 
               errorMessage.includes('login via')) &&
              !errorMessage.includes('subscription has expired')) {
            // Only redirect if we're not already on web-login page
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/web-login')) {
              // Clear any invalid web session tokens
              localStorage.removeItem('web_session_token');
              localStorage.removeItem('web_telegram_id');
              // Redirect to web login
              window.location.href = '/web-login';
              return {
                success: false,
                error: 'Access denied. Redirecting to login...'
              };
            }
          }
        }
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      // ⚡ PERFORMANCE: Cache successful GET responses
      if (method === 'GET' && useCache && result.success) {
        this.setCache(url, result);
      }
      
      return result;
    } catch (error) {
      // ⚡ PERFORMANCE: Reduced error logging
      // Handle timeout and network errors gracefully
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout - لطفا دوباره تلاش کنید'
          };
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          return {
            success: false,
            error: 'Failed to fetch - اتصال به سرور برقرار نشد'
          };
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // ⚡ PERFORMANCE: Add timeout to health check (3 seconds max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://sianmarketing.com/api/health', {
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // Silently fail health check - don't log in production
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

    // ⚡ PERFORMANCE: Cache user info for 2 minutes
    return this.makeRequest('GET', `/user/${telegramId}`, undefined, true);
  }

  // Get user progress
  async getUserProgress(): Promise<APIResponse> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }

    // ⚡ PERFORMANCE: Cache progress for 2 minutes
    return this.makeRequest('GET', `/user/${telegramId}/progress`, undefined, true);
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

    // ⚡ PERFORMANCE: Cache profile for 2 minutes
    return this.makeRequest<{
      username: string;
      phone: string;
      email: string;
      monthly_income: number;
    }>('GET', `/user/${telegramId}/profile`, undefined, true);
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

  // Ticket methods
  async getUserTickets(): Promise<APIResponse<any[]>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }
    return this.makeRequest<any[]>('GET', `/user/${telegramId}/tickets`, undefined, true);
  }

  async createTicket(data: { subject: string; priority: string; message: string }): Promise<APIResponse<any>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }
    const response = await this.makeRequest<any>('POST', '/tickets', {
      telegram_id: telegramId,
      subject: data.subject,
      priority: data.priority,
      message: data.message
    });
    // Clear tickets cache after creating a ticket
    if (response.success) {
      this.clearTicketsCache();
    }
    return response;
  }

  async getTicket(ticketId: number): Promise<APIResponse<any>> {
    return this.makeRequest<any>('GET', `/tickets/${ticketId}`, undefined, true);
  }

  async replyTicket(ticketId: number, message: string): Promise<APIResponse<any>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }
    const response = await this.makeRequest<any>('POST', `/tickets/${ticketId}/reply`, {
      telegram_id: telegramId,
      message: message
    });
    // Clear tickets cache after replying to a ticket
    if (response.success) {
      this.clearTicketsCache();
    }
    return response;
  }

  async closeTicket(ticketId: number): Promise<APIResponse<any>> {
    const telegramId = this.getTelegramId();
    if (!telegramId) {
      return { success: false, error: 'No user ID available' };
    }
    const response = await this.makeRequest<any>('POST', `/tickets/${ticketId}/close`, {
      telegram_id: telegramId
    });
    // Clear tickets cache after closing a ticket
    if (response.success) {
      this.clearTicketsCache();
    }
    return response;
  }

  // Web login methods
  async webLogin(telegramId: number, password: string): Promise<APIResponse<{ token: string; telegram_id: number }>> {
    return this.makeRequest<{ token: string; telegram_id: number }>('POST', '/web/login', {
      telegram_id: telegramId,
      password: password
    });
  }

  async verifyWebSession(telegramId: number): Promise<APIResponse<{ valid: boolean }>> {
    const token = localStorage.getItem('web_session_token');
    if (!token) {
      return { success: false, error: 'No session token' };
    }
    
    // Add token to headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    const url = `${this.baseURL}/web/verify?telegram_id=${telegramId}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Session verification failed'
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  setWebTelegramId(telegramId: number): void {
    this.cachedTelegramId = telegramId;
    this.saveTelegramIdToStorage(telegramId);
  }

  // Override getTelegramId to check web session first
  getTelegramId(): number | null {
    // First check if we have a web session
    const webTelegramId = localStorage.getItem('web_telegram_id');
    if (webTelegramId) {
      const id = parseInt(webTelegramId);
      if (!isNaN(id) && id > 0) {
        if (this.cachedTelegramId !== id) {
          this.cachedTelegramId = id;
        }
        return id;
      }
    }

    // Fall back to original Telegram WebApp detection
    if (this.cachedTelegramId !== null) {
      return this.cachedTelegramId;
    }

    try {
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

      // Method 4: Use test user for browser testing (only if not in Telegram and no web session)
      if (!this.isInTelegram() && !webTelegramId) {
        // Clear any saved telegram_id from localStorage to force using test user
        if (typeof window !== 'undefined') {
          localStorage.removeItem('telegram_id');
        }
        this.cachedTelegramId = 76599340; // Test user: RAPEXA (@Rapexam)
        this.saveTelegramIdToStorage(76599340);
        logger.debug(`🔍 Using test user ID for browser testing: ${this.cachedTelegramId} (RAPEXA)`);
        return this.cachedTelegramId;
      }

      logger.debug('❌ No Telegram ID found - user must access from Telegram or login via web');
      return null;
    } catch (error) {
      logger.error('❌ Error getting Telegram ID:', error || '');
      return null;
    }
  }
}

const apiService = new APIService();
export default apiService;