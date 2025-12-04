/**
 * Admin API Service
 * Handles all API calls for Admin Panel
 */

// Dynamic BASE_URL - works in both development and production
function getBaseURL(): string {
  // Check if we're in development (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8080/api/v1/admin';
  }
  
  // Production: use current host or fallback
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${window.location.host}/api/v1/admin`;
}

const BASE_URL = getBaseURL();

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get Telegram init data for authentication
 */
function getTelegramInitData(): string {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.initData || '';
  }
  return '';
}

/**
 * Get web session token for authentication (for web login)
 */
function getWebSessionToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_session_token') || '';
  }
  return '';
}

/**
 * Make authenticated API request
 */
async function makeRequest<T = any>(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<APIResponse<T>> {
  try {
    const initData = getTelegramInitData();
    const webToken = getWebSessionToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Use Telegram auth if available, otherwise use web session token
    if (initData) {
      headers['X-Telegram-Init-Data'] = initData;
      headers['X-Telegram-WebApp'] = 'true';
    } else if (webToken) {
      headers['Authorization'] = `Bearer ${webToken}`;
      headers['X-Web-Auth'] = 'true';
    }

    const options: RequestInit = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    };

    const fullURL = `${BASE_URL}${endpoint}`;
    console.log('Making API request:', {
      method,
      url: fullURL,
      hasBody: !!body,
      headers: Object.keys(headers)
    });
    
    const response = await fetch(fullURL, options);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type') || '';
    const isJSON = contentType.includes('application/json');
    
    console.log('API response received:', {
      status: response.status,
      statusText: response.statusText,
      contentType,
      isJSON,
      url: fullURL
    });
    
    if (!isJSON) {
      // If not JSON, try to get text for error message
      const text = await response.text();
      console.error('Non-JSON response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        text: text.substring(0, 500), // First 500 chars
        url: fullURL
      });
      
      // Try to parse as JSON if it looks like JSON
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          const data = JSON.parse(text);
          if (!response.ok) {
            return {
              success: false,
              error: data.error || `HTTP ${response.status}`,
            };
          }
          return {
            success: true,
            data: data.data || data,
          };
        } catch (e) {
          // Not valid JSON
          console.error('Failed to parse as JSON:', e);
        }
      }
      
      // If response is HTML (likely index.html from SPA routing), the endpoint wasn't reached
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<!DOCTYPE') || text.includes('<html')) {
        return {
          success: false,
          error: `API endpoint not found. The request may have been intercepted by frontend routing. Please check that the endpoint ${fullURL} is correctly configured on the server.`,
        };
      }
      
      return {
        success: false,
        error: `Server returned non-JSON response: ${response.status} ${response.statusText}. ${text.substring(0, 100)}`,
      };
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      data: data.data || data,
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Admin API Service
 */
const adminApiService = {
  // Authentication
  login: (username: string, password: string) => 
    makeRequest('/auth/login', 'POST', { username, password }),
  logout: () => {
    localStorage.removeItem('admin_session_token');
    return Promise.resolve({ success: true });
  },
  checkAuth: () => makeRequest('/auth/check'),

  // Stats
  getStats: () => makeRequest('/stats'),
  getChartData: (type: string, period: string) => 
    makeRequest(`/stats/chart?type=${type}&period=${period}`),

  // Users
  getUsers: (page: number = 1, limit: number = 50, search: string = '', filterType: string = 'all') => 
    makeRequest(`/users?page=${page}&limit=${limit}&search=${search}&type=${filterType}`),
  getUserDetail: (userId: number) => makeRequest(`/users/${userId}`),
  blockUser: (userId: number) => makeRequest(`/users/${userId}/block`, 'POST'),
  unblockUser: (userId: number) => makeRequest(`/users/${userId}/unblock`, 'POST'),
  changeUserPlan: (userId: number, planType: string) => 
    makeRequest(`/users/${userId}/change-plan`, 'POST', { plan_type: planType }),
  deleteUser: (userId: number) => makeRequest(`/users/${userId}`, 'DELETE'),

  // Payments
  getPayments: (page: number = 1, limit: number = 50, status: string = 'all') => 
    makeRequest(`/payments?page=${page}&limit=${limit}&status=${status}`),
  getPaymentDetail: (paymentId: number) => makeRequest(`/payments/${paymentId}`),

  // Sessions
  getSessions: () => makeRequest('/sessions'),
  createSession: (session: any) => makeRequest('/sessions', 'POST', session),
  updateSession: (sessionId: number, session: any) => 
    makeRequest(`/sessions/${sessionId}`, 'PUT', session),
  deleteSession: (sessionId: number) => makeRequest(`/sessions/${sessionId}`, 'DELETE'),

  // Videos
  getVideos: (sessionId?: number) => 
    makeRequest(`/videos${sessionId ? `?session_id=${sessionId}` : ''}`),
  createVideo: (video: any) => makeRequest('/videos', 'POST', video),
  updateVideo: (videoId: number, video: any) => 
    makeRequest(`/videos/${videoId}`, 'PUT', video),
  deleteVideo: (videoId: number) => makeRequest(`/videos/${videoId}`, 'DELETE'),

  // Exercises
  getExercises: (sessionId?: number) => 
    makeRequest(`/exercises${sessionId ? `?session_id=${sessionId}` : ''}`),
  createExercise: (exercise: any) => makeRequest('/exercises', 'POST', exercise),
  updateExercise: (exerciseId: number, exercise: any) => 
    makeRequest(`/exercises/${exerciseId}`, 'PUT', exercise),
  deleteExercise: (exerciseId: number) => makeRequest(`/exercises/${exerciseId}`, 'DELETE'),

  // Licenses
  getLicenses: (status: string = 'pending') => makeRequest(`/licenses?status=${status}`),
  approveLicense: (licenseId: number) => makeRequest(`/licenses/${licenseId}/approve`, 'POST'),
  rejectLicense: (licenseId: number) => makeRequest(`/licenses/${licenseId}/reject`, 'POST'),

  // Broadcast
  sendTelegramBroadcast: (message: string, type: string, fileUrl?: string) => 
    makeRequest('/broadcast/telegram', 'POST', { message, type, file_url: fileUrl }),
  sendSMSBroadcast: (message: string) => 
    makeRequest('/broadcast/sms', 'POST', { message }),

  // Security
  getBlockedUsers: () => makeRequest('/security/blocked'),
  getSuspiciousActivity: () => makeRequest('/security/suspicious'),

  // Analytics
  getRevenueAnalytics: (period: string = 'month') => 
    makeRequest(`/analytics/revenue?period=${period}`),
  getUserAnalytics: (period: string = 'month') => 
    makeRequest(`/analytics/users?period=${period}`),
  getEngagementAnalytics: (period: string = 'month') => 
    makeRequest(`/analytics/engagement?period=${period}`),
};

export default adminApiService;

