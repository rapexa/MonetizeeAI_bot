/**
 * Admin API Service
 * Handles all API calls for Admin Panel
 */

const BASE_URL = 'https://sianmarketing.com/api/v1/admin';

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
 * Make authenticated API request
 */
async function makeRequest<T = any>(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<APIResponse<T>> {
  try {
    const initData = getTelegramInitData();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
      'X-Telegram-WebApp': 'true',
    };

    const options: RequestInit = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
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

