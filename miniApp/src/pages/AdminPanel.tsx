import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  DollarSign, 
  Activity,
  Shield,
  Package,
  CreditCard,
  UserCheck,
  RefreshCw,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Ban,
  Unlock,
  BarChart3,
  LineChart,
  Search,
  Filter,
  Send,
  X,
  User,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Clock,
  Award,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import adminApiService from '../services/adminApi';

// WebSocket removed - no longer using WSMessage interface
// interface WSMessage {
//   type: string;
//   payload: any;
// }

interface StatsPayload {
  totalUsers: number;
  activeUsers: number;
  freeTrialUsers: number;
  paidUsers: number;
  todayRevenue: number;
  monthRevenue: number;
  onlineAdmins: number;
  pendingLicenses: number;
  recentUsers: User[];
  recentPayments: PaymentTransaction[];
  timestamp: string;
}

interface User {
  ID: number;
  TelegramID: number;
  Username: string;
  FirstName: string;
  LastName: string;
  Phone: string;
  PhoneNumber: string;
  SubscriptionType: string;
  PlanName: string;
  IsVerified: boolean;
  IsActive: boolean;
  IsBlocked: boolean;
  Points: number;
  CurrentSession?: number;
  CreatedAt: string;
}

interface PaymentTransaction {
  ID: number;
  UserID: number;
  Type: string;
  Amount: number;
  Status: string;
  CreatedAt: string;
}

const AdminPanel: React.FC = () => {
  // WebSocket removed - using REST API for all users (both Telegram and Web)
  // This ensures consistent behavior and avoids authentication issues
  // All users must login via web login page first
  
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [isWebUser, setIsWebUser] = useState(false); // Track if user is web user (not Telegram)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'payments' | 'content' | 'analytics'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersFilter, setUsersFilter] = useState('all');
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Payments state
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsFilter, setPaymentsFilter] = useState('all');
  const [loadingPayments, setLoadingPayments] = useState(false);

  // User detail modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [changingSession, setChangingSession] = useState(false);

  // Check authentication on mount
  // IMPORTANT: For both Telegram and Web users, we use web login
  // This ensures consistent authentication and avoids Telegram auth issues
  useEffect(() => {
    const checkAuth = async () => {
      // Check if we have web session token
      const webToken = localStorage.getItem('admin_session_token');
      
      if (webToken) {
        // Web authentication (works for both Telegram and Web users)
        try {
          const response = await adminApiService.checkAuth();
          if (response.success) {
            console.log('✅ Authentication successful');
            setAccessDenied(false);
            setIsWebUser(true); // Mark as web user (uses REST API instead of WebSocket)
            setConnected(true); // Show as connected
            // Fetch stats from REST API
            await fetchStatsFromAPI();
            return;
          } else {
            // Token invalid, redirect to login
            console.log('⚠️ Token invalid, redirecting to login');
            localStorage.removeItem('admin_session_token');
            window.location.href = '/admin-login';
            return;
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('admin_session_token');
          window.location.href = '/admin-login';
          return;
        }
      }

      // No token found - redirect to login (for both Telegram and Web users)
      console.log('⚠️ No authentication token found, redirecting to login');
      window.location.href = '/admin-login';
    };

    checkAuth();
  }, []);

  // Fetch stats from REST API (for web users)
  const fetchStatsFromAPI = useCallback(async () => {
    const webToken = localStorage.getItem('admin_session_token');
    if (!webToken) {
      return;
    }

    try {
      console.log('📊 Fetching stats from REST API...');
      const response = await adminApiService.getStats();
      if (response.success && response.data) {
        console.log('✅ Stats fetched successfully:', response.data);
        setStats(response.data);
        setLoading(false);
      } else {
        console.error('❌ Failed to fetch stats:', response.error);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      setLoading(false);
    }
  }, []);
  
  // Poll stats every 5 seconds for all users (both Telegram and Web)
  // We use REST API for all users to ensure consistent behavior
  useEffect(() => {
    const webToken = localStorage.getItem('admin_session_token');
    if (!webToken) {
      return;
    }

    // Initial fetch
    fetchStatsFromAPI();

    // Poll every 5 seconds
    const interval = setInterval(() => {
      fetchStatsFromAPI();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchStatsFromAPI]);

  // NOTE: WebSocket is disabled - we use REST API for all users (both Telegram and Web)
  // This ensures consistent behavior and avoids authentication issues
  // All users must login via web login page first, then use REST API with web session token

  // Load users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await adminApiService.getUsers(usersPage, 50, usersSearch, usersFilter);
      console.log('Users API Response:', response); // Debug log
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setUsersTotal(response.data.total || 0);
      } else {
        console.error('Failed to load users:', response.error);
        const errorMessage = response.error || 'خطای ناشناخته';
        // Don't show alert for authentication errors - they're handled elsewhere
        if (!errorMessage.includes('Unauthorized') && !errorMessage.includes('Forbidden') && !errorMessage.includes('Authentication')) {
          alert('خطا در بارگذاری کاربران: ' + errorMessage);
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('خطا در اتصال به سرور');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load payments
  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      const response = await adminApiService.getPayments(paymentsPage, 50, paymentsFilter);
      console.log('Payments API Response:', response); // Debug log
      if (response.success && response.data) {
        setPayments(response.data.payments || []);
        setPaymentsTotal(response.data.total || 0);
      } else {
        console.error('Failed to load payments:', response.error);
        alert('خطا در بارگذاری پرداخت‌ها: ' + (response.error || 'خطای ناشناخته'));
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
      alert('خطا در اتصال به سرور');
    } finally {
      setLoadingPayments(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'payments') {
      loadPayments();
    }
  }, [activeTab, usersPage, usersSearch, usersFilter, paymentsPage, paymentsFilter]);

  // Manual refresh
  const handleRefresh = () => {
    // Refresh stats from REST API
    fetchStatsFromAPI();
    
    // Refresh current tab data
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'payments') {
      loadPayments();
    }
  };

  // Handle user actions
  const handleBlockUser = async (userId: number) => {
    if (!confirm('آیا از مسدود کردن این کاربر اطمینان دارید؟')) return;
    
    const response = await adminApiService.blockUser(userId);
    if (response.success) {
      alert('✅ کاربر مسدود شد');
      loadUsers();
    } else {
      alert('❌ خطا: ' + response.error);
    }
  };

  const handleUnblockUser = async (userId: number) => {
    const response = await adminApiService.unblockUser(userId);
    if (response.success) {
      alert('✅ مسدودیت کاربر رفع شد');
      loadUsers();
    } else {
      alert('❌ خطا: ' + response.error);
    }
  };

  const handleChangePlan = async (userId: number) => {
    const planType = prompt('نوع پلن را وارد کنید:\nfree, starter, pro, ultimate');
    if (!planType) return;
    
    const response = await adminApiService.changeUserPlan(userId, planType);
    if (response.success) {
      alert('✅ پلن کاربر تغییر کرد');
      loadUsers();
    } else {
      alert('❌ خطا: ' + response.error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
    
    const response = await adminApiService.deleteUser(userId);
    if (response.success) {
      alert('✅ کاربر حذف شد');
      loadUsers();
    } else {
      alert('❌ خطا: ' + response.error);
    }
  };

  const handleOpenUserDetail = async (user: User) => {
    setSelectedUser(user);
    setLoadingUserDetail(true);
    setMessageText('');
    
    try {
      const response = await adminApiService.getUserDetail(user.ID);
      if (response.success) {
        setUserDetail(response.data);
        // Update selectedUser with fresh data from server
        if (response.data.user) {
          setSelectedUser({
            ...user,
            ...response.data.user,
            PlanName: response.data.user.plan_name || response.data.user.planName,
            SubscriptionType: response.data.user.subscription_type || response.data.user.subscriptionType,
            IsActive: response.data.user.is_active !== undefined ? response.data.user.is_active : response.data.user.isActive,
            IsBlocked: response.data.user.is_blocked !== undefined ? response.data.user.is_blocked : response.data.user.isBlocked,
            CurrentSession: response.data.user.current_session || response.data.user.currentSession,
            Points: response.data.statistics?.total_points || response.data.user.points || user.Points || 0,
          });
        }
      } else {
        alert('❌ خطا در دریافت جزئیات کاربر');
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error loading user detail:', error);
      alert('❌ خطا در دریافت جزئیات کاربر');
      setSelectedUser(null);
    } finally {
      setLoadingUserDetail(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !messageText.trim()) {
      alert('لطفا پیام را وارد کنید');
      return;
    }

    setSendingMessage(true);
    try {
      const response = await adminApiService.sendMessageToUser(selectedUser.ID, messageText);
      if (response.success) {
        alert('✅ پیام با موفقیت ارسال شد');
        setMessageText('');
      } else {
        alert('❌ خطا در ارسال پیام: ' + (response.error || 'خطای ناشناخته'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('❌ خطا در ارسال پیام');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleChangePlanFromModal = async (planType: string) => {
    if (!selectedUser || changingPlan) return;
    
    const planNames: { [key: string]: string } = {
      'free': 'رایگان (3 روزه)',
      'starter': 'Starter',
      'pro': 'Pro',
      'ultimate': 'Ultimate'
    };
    
    const planName = planNames[planType] || planType;
    if (!confirm(`آیا از تغییر پلن کاربر به "${planName}" اطمینان دارید؟`)) {
      return;
    }
    
    setChangingPlan(true);
    try {
      console.log('Changing plan for user:', selectedUser.ID, 'to:', planType);
      const response = await adminApiService.changeUserPlan(selectedUser.ID, planType);
      console.log('Change plan response:', response);
      
      if (response.success) {
        alert(`✅ پلن کاربر به "${planName}" تغییر کرد`);
        // Refresh user detail from server to get updated data
        await handleOpenUserDetail(selectedUser);
        // Refresh users list
        loadUsers();
      } else {
        alert('❌ خطا: ' + (response.error || 'خطای ناشناخته'));
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      alert('❌ خطا در تغییر پلن کاربر: ' + (error instanceof Error ? error.message : 'خطای ناشناخته'));
    } finally {
      setChangingPlan(false);
    }
  };

  const handleChangeSession = async (newSession: number) => {
    if (!selectedUser || changingSession) return;
    
    if (newSession < 1 || newSession > 29) {
      alert('❌ شماره مرحله باید بین 1 تا 29 باشد');
      return;
    }
    
    if (!confirm(`آیا از تغییر مرحله کاربر از ${selectedUser.CurrentSession || userDetail?.statistics?.current_session || 1} به ${newSession} اطمینان دارید؟`)) {
      return;
    }
    
    setChangingSession(true);
    try {
      const response = await adminApiService.changeUserSession(selectedUser.ID, newSession);
      if (response.success) {
        alert(`✅ مرحله کاربر به ${newSession} تغییر کرد`);
        // Refresh user detail from server
        await handleOpenUserDetail(selectedUser);
        // Refresh users list
        loadUsers();
      } else {
        alert('❌ خطا: ' + (response.error || 'خطای ناشناخته'));
      }
    } catch (error) {
      console.error('Error changing session:', error);
      alert('❌ خطا در تغییر مرحله: ' + (error instanceof Error ? error.message : 'خطای ناشناخته'));
    } finally {
      setChangingSession(false);
    }
  };

  // Format time helper
  const formatTime = (hours: number): string => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} دقیقه`;
    } else if (hours < 24) {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return `${h} ساعت ${m > 0 ? m + ' دقیقه' : ''}`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return `${days} روز ${remainingHours > 0 ? remainingHours + ' ساعت' : ''}`;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  // Get plan display name
  const getPlanDisplayName = (user: User): string => {
    // Check if user is blocked or inactive
    if (user.IsBlocked) {
      return 'مسدود شده';
    }
    if (!user.IsActive) {
      return 'غیرفعال';
    }
    
    // Check PlanName first (most accurate)
    if (user.PlanName) {
      const planName = user.PlanName.toLowerCase();
      if (planName === 'ultimate') return 'Ultimate';
      if (planName === 'pro') return 'Pro';
      if (planName === 'starter') return 'Starter';
      if (planName === 'free_trial') return 'رایگان (3 روزه)';
    }
    
    // Fallback to SubscriptionType
    if (user.SubscriptionType) {
      const subType = user.SubscriptionType.toLowerCase();
      if (subType === 'paid') {
        // If paid but no plan name, might be legacy
        return 'پولی';
      }
      if (subType === 'free_trial') {
        return 'رایگان (3 روزه)';
      }
    }
    
    // Default
    return 'بدون اشتراک';
  };

  // Access Denied state
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0e0817' }}>
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield size={40} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">🔒 دسترسی محدود</h1>
          <p className="text-gray-300 mb-6 leading-relaxed">
            پنل مدیریت فقط از طریق دکمه <span className="font-bold text-purple-400">"🎛️ پنل مدیریت"</span> در منوی ادمین تلگرام قابل دسترسی است.
          </p>
          <div className="bg-gray-800/40 rounded-2xl p-6 border border-gray-700/60 text-right">
            <p className="text-sm text-gray-400 mb-3">راهنمای دسترسی:</p>
            <ol className="text-sm text-gray-300 space-y-2">
              <li>۱. وارد ربات تلگرام شوید</li>
              <li>۲. روی دکمه <span className="text-purple-400 font-bold">🎛️ پنل مدیریت</span> کلیک کنید</li>
              <li>۳. منتظر باز شدن پنل باشید</li>
            </ol>
          </div>
          <p className="text-xs text-gray-500 mt-6">
            ⚠️ دسترسی مستقیم از وب به دلایل امنیتی غیرفعال است
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0e0817' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5a189a]/30 border-t-[#5a189a] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">در حال اتصال به پنل مدیریت...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#0e0817' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#2c189a]/95 via-[#5a189a]/95 to-[#7222F2]/95 backdrop-blur-xl border-b border-gray-700/60 shadow-2xl">
        <div className="flex items-center justify-between py-2 px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] rounded-xl flex items-center justify-center shadow-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">پنل مدیریت</h1>
              <p className="text-[10px] text-white/70">MonetizeAI Admin Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            {!isWebUser && (
              <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                connected 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                {connected ? 'متصل' : 'قطع شده'}
              </div>
            )}
            {isWebUser && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                متصل (وب)
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300"
            >
              <RefreshCw size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-4 pb-1.5 gap-2 max-w-7xl mx-auto">
          {[
            { id: 'dashboard', label: 'داشبورد', icon: BarChart3 },
            { id: 'users', label: 'کاربران', icon: Users },
            { id: 'payments', label: 'پرداخت‌ها', icon: CreditCard },
            { id: 'content', label: 'محتوا', icon: Package },
            { id: 'analytics', label: 'آنالیتیکس', icon: LineChart },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 whitespace-nowrap text-sm ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="pt-28 px-4 max-w-7xl mx-auto mt-4">
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
                <div className="flex items-center gap-3 mb-2">
                  <Users size={20} className="text-blue-400" />
                  <span className="text-gray-400 text-sm">کل کاربران</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString('fa-IR')}</p>
                <p className="text-xs text-green-400 mt-1">
                  {stats.activeUsers.toLocaleString('fa-IR')} فعال
                </p>
              </div>

              <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign size={20} className="text-green-400" />
                  <span className="text-gray-400 text-sm">درآمد ماه</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.monthRevenue)}
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  امروز: {formatCurrency(stats.todayRevenue)}
                </p>
              </div>

              <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
                <div className="flex items-center gap-3 mb-2">
                  <UserCheck size={20} className="text-purple-400" />
                  <span className="text-gray-400 text-sm">کاربران پولی</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.paidUsers.toLocaleString('fa-IR')}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {stats.freeTrialUsers.toLocaleString('fa-IR')} تست رایگان
                </p>
              </div>

              <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
                <div className="flex items-center gap-3 mb-2">
                  <Activity size={20} className="text-orange-400" />
                  <span className="text-gray-400 text-sm">ادمین‌های آنلاین</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.onlineAdmins}</p>
                <p className="text-xs text-yellow-400 mt-1">
                  {stats.pendingLicenses.toLocaleString('fa-IR')} لایسنس در انتظار
                </p>
              </div>
            </div>

            {/* Recent Users */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} />
                کاربران اخیر
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700/60">
                      <th className="text-right text-xs text-gray-400 pb-2">نام</th>
                      <th className="text-right text-xs text-gray-400 pb-2">نوع اشتراک</th>
                      <th className="text-right text-xs text-gray-400 pb-2">امتیاز</th>
                      <th className="text-right text-xs text-gray-400 pb-2">تاریخ</th>
                      <th className="text-right text-xs text-gray-400 pb-2">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentUsers.map((user) => (
                      <tr key={user.ID} className="border-b border-gray-700/30">
                        <td className="py-3 text-white text-sm">
                          {[user.FirstName, user.LastName].filter(Boolean).join(' ') || user.Username}
                        </td>
                        <td className="py-3 text-gray-300 text-sm">
                          {user.PlanName || user.SubscriptionType}
                        </td>
                        <td className="py-3 text-blue-400 text-sm">
                          {user.Points}
                        </td>
                        <td className="py-3 text-gray-400 text-xs">
                          {formatDate(user.CreatedAt)}
                        </td>
                        <td className="py-3">
                          {user.IsActive && !user.IsBlocked ? (
                            <CheckCircle size={16} className="text-green-400" />
                          ) : (
                            <XCircle size={16} className="text-red-400" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard size={20} />
                پرداخت‌های اخیر
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700/60">
                      <th className="text-right text-xs text-gray-400 pb-2">نوع</th>
                      <th className="text-right text-xs text-gray-400 pb-2">مبلغ</th>
                      <th className="text-right text-xs text-gray-400 pb-2">وضعیت</th>
                      <th className="text-right text-xs text-gray-400 pb-2">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentPayments.map((payment) => (
                      <tr key={payment.ID} className="border-b border-gray-700/30">
                        <td className="py-3 text-white text-sm">
                          {payment.Type}
                        </td>
                        <td className="py-3 text-green-400 text-sm font-bold">
                          {formatCurrency(payment.Amount)}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            payment.Status === 'success'
                              ? 'bg-green-500/20 text-green-400'
                              : payment.Status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {payment.Status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400 text-xs">
                          {formatDate(payment.CreatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Management */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search & Filter */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="جستجو (نام، شماره تلفن)..."
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60"
                  />
                </div>
                <select
                  value={usersFilter}
                  onChange={(e) => setUsersFilter(e.target.value)}
                  className="px-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white focus:outline-none focus:border-purple-500/60"
                >
                  <option value="all">همه کاربران</option>
                  <option value="free_trial">تست رایگان</option>
                  <option value="paid">پولی</option>
                  <option value="blocked">مسدود شده</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} />
                مدیریت کاربران ({usersTotal.toLocaleString('fa-IR')})
              </h3>
              
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-[#5a189a]/30 border-t-[#5a189a] rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700/60">
                        <th className="text-right text-xs text-gray-400 pb-2 px-2">نام</th>
                        <th className="text-right text-xs text-gray-400 pb-2 px-2">تلفن</th>
                        <th className="text-right text-xs text-gray-400 pb-2 px-2">اشتراک</th>
                        <th className="text-right text-xs text-gray-400 pb-2 px-2">امتیاز</th>
                        <th className="text-right text-xs text-gray-400 pb-2 px-2">وضعیت</th>
                        <th className="text-center text-xs text-gray-400 pb-2 px-2">عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.ID} className="border-b border-gray-700/30 hover:bg-gray-800/20">
                          <td className="py-3 px-2 text-white text-sm">
                            {[user.FirstName, user.LastName].filter(Boolean).join(' ') || user.Username || '-'}
                          </td>
                          <td className="py-3 px-2 text-gray-300 text-sm">
                            {user.PhoneNumber || user.Phone || '-'}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              user.IsBlocked
                                ? 'bg-red-500/20 text-red-400'
                                : !user.IsActive
                                ? 'bg-gray-500/20 text-gray-400'
                                : user.PlanName?.toLowerCase() === 'ultimate'
                                ? 'bg-green-500/20 text-green-400'
                                : user.PlanName?.toLowerCase() === 'pro'
                                ? 'bg-purple-500/20 text-purple-400'
                                : user.PlanName?.toLowerCase() === 'starter'
                                ? 'bg-blue-500/20 text-blue-400'
                                : user.PlanName?.toLowerCase() === 'free_trial' || user.SubscriptionType === 'free_trial'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {getPlanDisplayName(user)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-blue-400 text-sm">
                            {user.Points}
                          </td>
                          <td className="py-3 px-2">
                            {user.IsActive && !user.IsBlocked ? (
                              <CheckCircle size={16} className="text-green-400" />
                            ) : user.IsBlocked ? (
                              <Ban size={16} className="text-red-400" />
                            ) : (
                              <XCircle size={16} className="text-gray-400" />
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenUserDetail(user)}
                                className="p-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                                title="جزئیات و مدیریت"
                              >
                                <User size={14} className="text-purple-400" />
                              </button>
                              <button
                                onClick={() => handleChangePlan(user.ID)}
                                className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                                title="تغییر پلن"
                              >
                                <Edit size={14} className="text-blue-400" />
                              </button>
                              {user.IsBlocked ? (
                                <button
                                  onClick={() => handleUnblockUser(user.ID)}
                                  className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                                  title="رفع مسدودیت"
                                >
                                  <Unlock size={14} className="text-green-400" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBlockUser(user.ID)}
                                  className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                                  title="مسدود کردن"
                                >
                                  <Ban size={14} className="text-red-400" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user.ID)}
                                className="p-1.5 bg-gray-500/20 hover:bg-gray-500/30 rounded-lg transition-colors"
                                title="حذف"
                              >
                                <Trash2 size={14} className="text-gray-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  {usersTotal > 50 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/60">
                      <button
                        onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                        disabled={usersPage === 1}
                        className="px-4 py-2 bg-gray-700/40 hover:bg-gray-700/60 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm transition-colors"
                      >
                        قبلی
                      </button>
                      <span className="text-gray-400 text-sm">
                        صفحه {usersPage.toLocaleString('fa-IR')} از {Math.ceil(usersTotal / 50).toLocaleString('fa-IR')}
                      </span>
                      <button
                        onClick={() => setUsersPage(p => p + 1)}
                        disabled={usersPage >= Math.ceil(usersTotal / 50)}
                        className="px-4 py-2 bg-gray-700/40 hover:bg-gray-700/60 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm transition-colors"
                      >
                        بعدی
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments Management */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Filter */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
              <div className="flex items-center gap-4">
                <Filter size={18} className="text-gray-400" />
                <select
                  value={paymentsFilter}
                  onChange={(e) => setPaymentsFilter(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-800/40 border border-gray-700/40 rounded-xl text-white focus:outline-none focus:border-purple-500/60"
                >
                  <option value="all">همه تراکنش‌ها</option>
                  <option value="success">موفق</option>
                  <option value="pending">در انتظار</option>
                  <option value="failed">ناموفق</option>
                </select>
              </div>
            </div>

            {/* Payments Table */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard size={20} />
                مدیریت پرداخت‌ها ({paymentsTotal.toLocaleString('fa-IR')})
              </h3>
              
              {loadingPayments ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-[#5a189a]/30 border-t-[#5a189a] rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700/60">
                        <th className="text-right text-xs text-gray-400 pb-2 px-2">ID</th>
                        <th className="text-right text-xs text-gray-400 pb-2 px-2">نوع پلن</th>
                        <th className="text-right text-xs text-gray-400 pb-2 px-2">مبلغ</th>
                        <th className="text-right text-xs text-gray-400 pb-2 px-2">وضعیت</th>
                        <th className="text-right text-xs text-gray-400 pb-2 px-2">تاریخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.ID} className="border-b border-gray-700/30 hover:bg-gray-800/20">
                          <td className="py-3 px-2 text-white text-sm">
                            #{payment.ID}
                          </td>
                          <td className="py-3 px-2 text-gray-300 text-sm">
                            {payment.Type}
                          </td>
                          <td className="py-3 px-2 text-green-400 text-sm font-bold">
                            {formatCurrency(payment.Amount)}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              payment.Status === 'success'
                                ? 'bg-green-500/20 text-green-400'
                                : payment.Status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {payment.Status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-gray-400 text-xs">
                            {formatDate(payment.CreatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  {paymentsTotal > 50 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/60">
                      <button
                        onClick={() => setPaymentsPage(p => Math.max(1, p - 1))}
                        disabled={paymentsPage === 1}
                        className="px-4 py-2 bg-gray-700/40 hover:bg-gray-700/60 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm transition-colors"
                      >
                        قبلی
                      </button>
                      <span className="text-gray-400 text-sm">
                        صفحه {paymentsPage.toLocaleString('fa-IR')} از {Math.ceil(paymentsTotal / 50).toLocaleString('fa-IR')}
                      </span>
                      <button
                        onClick={() => setPaymentsPage(p => p + 1)}
                        disabled={paymentsPage >= Math.ceil(paymentsTotal / 50)}
                        className="px-4 py-2 bg-gray-700/40 hover:bg-gray-700/60 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm transition-colors"
                      >
                        بعدی
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content & Analytics - Coming Soon */}
        {(activeTab === 'content' || activeTab === 'analytics') && (
          <div className="backdrop-blur-xl rounded-3xl p-6 border border-gray-700/60 text-center" style={{ backgroundColor: '#10091c' }}>
            <p className="text-white text-lg mb-2">🚧 در حال توسعه</p>
            <p className="text-gray-400 text-sm">
              بخش {activeTab === 'content' ? 'مدیریت محتوا' : 'آنالیتیکس'} به زودی اضافه خواهد شد
            </p>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-xl rounded-3xl border border-gray-700/60" style={{ backgroundColor: '#10091c' }}>
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-700/60 bg-[#10091c]/95 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User size={24} />
                جزئیات کاربر
              </h2>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserDetail(null);
                  setMessageText('');
                }}
                className="p-2 hover:bg-gray-700/40 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {loadingUserDetail ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-[#5a189a]/30 border-t-[#5a189a] rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                <>
                  {/* User Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                        <User size={16} />
                        نام کاربر
                      </div>
                      <div className="text-white font-medium">
                        {[selectedUser.FirstName, selectedUser.LastName].filter(Boolean).join(' ') || selectedUser.Username || 'نامشخص'}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                        <Phone size={16} />
                        شماره تلفن
                      </div>
                      <div className="text-white font-medium">{selectedUser.PhoneNumber || selectedUser.Phone || 'نامشخص'}</div>
                    </div>
                    <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                        <Package size={16} />
                        نوع اشتراک
                      </div>
                      <div className="text-white font-medium">{getPlanDisplayName(selectedUser)}</div>
                      {userDetail && userDetail.user && userDetail.user.subscription_expiry && (
                        <div className="text-gray-400 text-xs mt-1">
                          انقضا: {new Date(userDetail.user.subscription_expiry).toLocaleDateString('fa-IR')}
                        </div>
                      )}
                      {userDetail && userDetail.user && !userDetail.user.subscription_expiry && selectedUser.PlanName?.toLowerCase() === 'ultimate' && (
                        <div className="text-green-400 text-xs mt-1">
                          مادام‌العمر
                        </div>
                      )}
                    </div>
                    
                    {/* Progress Statistics */}
                    {userDetail && userDetail.statistics && (
                      <>
                        <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <TrendingUp size={16} />
                            مرحله فعلی
                          </div>
                          <div className="text-white font-bold text-lg mb-3">
                            مرحله {userDetail.statistics.current_session || selectedUser.CurrentSession || 1}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleChangeSession((userDetail.statistics.current_session || selectedUser.CurrentSession || 1) - 1)}
                              disabled={changingSession || (userDetail.statistics.current_session || selectedUser.CurrentSession || 1) <= 1}
                              className="px-3 py-1.5 bg-purple-600/40 hover:bg-purple-600/60 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors flex items-center gap-1"
                            >
                              <ChevronLeft size={14} />
                              قبلی
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="29"
                              value={userDetail.statistics.current_session || selectedUser.CurrentSession || 1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (val >= 1 && val <= 29) {
                                  handleChangeSession(val);
                                }
                              }}
                              disabled={changingSession}
                              className="flex-1 px-3 py-1.5 bg-gray-900/60 border border-gray-700/40 rounded-lg text-white text-center text-sm focus:outline-none focus:border-purple-500/60 disabled:opacity-50"
                            />
                            <button
                              onClick={() => handleChangeSession((userDetail.statistics.current_session || selectedUser.CurrentSession || 1) + 1)}
                              disabled={changingSession || (userDetail.statistics.current_session || selectedUser.CurrentSession || 1) >= 29}
                              className="px-3 py-1.5 bg-purple-600/40 hover:bg-purple-600/60 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors flex items-center gap-1"
                            >
                              بعدی
                              <ChevronRight size={14} />
                            </button>
                          </div>
                          {changingSession && (
                            <div className="mt-2 text-center">
                              <RefreshCw size={14} className="animate-spin text-purple-400 inline-block" />
                            </div>
                          )}
                          <div className="mt-3 text-gray-400 text-xs">
                            مراحل تکمیل شده: {userDetail.statistics.completed_sessions || 0}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <Award size={16} />
                            امتیاز کل
                          </div>
                          <div className="text-white font-bold text-lg">
                            {userDetail.statistics.total_points?.toLocaleString('fa-IR') || selectedUser.Points?.toLocaleString('fa-IR') || '0'}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <Clock size={16} />
                            زمان استفاده
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-xs">کل زمان:</span>
                              <span className="text-white font-medium">
                                {formatTime(userDetail.statistics.total_time_hours || 0)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-xs">میانگین روزانه:</span>
                              <span className="text-white font-medium">
                                {formatTime(userDetail.statistics.avg_daily_time_hours || 0)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-xs">روزهای عضویت:</span>
                              <span className="text-white font-medium">
                                {Math.floor(userDetail.statistics.total_time_days || 0)} روز
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                        <Activity size={16} />
                        وضعیت
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedUser.IsActive && !selectedUser.IsBlocked ? (
                          <CheckCircle size={16} className="text-green-400" />
                        ) : selectedUser.IsBlocked ? (
                          <Ban size={16} className="text-red-400" />
                        ) : (
                          <XCircle size={16} className="text-gray-400" />
                        )}
                        <span className="text-white font-medium">
                          {selectedUser.IsBlocked ? 'مسدود شده' : selectedUser.IsActive ? 'فعال' : 'غیرفعال'}
                        </span>
                      </div>
                    </div>
                    {userDetail && (
                      <>
                        {userDetail.telegram_id && (
                          <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                              <Mail size={16} />
                              تلگرام ID
                            </div>
                            <div className="text-white font-medium">{userDetail.telegram_id}</div>
                          </div>
                        )}
                        {userDetail.subscription_expiry && (
                          <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                              <Calendar size={16} />
                              تاریخ انقضا
                            </div>
                            <div className="text-white font-medium">
                              {new Date(userDetail.subscription_expiry).toLocaleDateString('fa-IR')}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Send Message Section */}
                  <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <MessageSquare size={20} />
                      ارسال پیام به کاربر
                    </h3>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="پیام خود را وارد کنید..."
                      className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/40 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 resize-none"
                      rows={4}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendingMessage}
                      className="mt-3 w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {sendingMessage ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          در حال ارسال...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          ارسال پیام
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                    <h3 className="text-lg font-bold text-white mb-4">عملیات سریع</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button
                        onClick={() => handleChangePlanFromModal('free')}
                        disabled={changingPlan}
                        className="px-4 py-2 bg-gray-700/40 hover:bg-gray-700/60 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {changingPlan ? <RefreshCw size={14} className="animate-spin" /> : null}
                        پلن رایگان
                      </button>
                      <button
                        onClick={() => handleChangePlanFromModal('starter')}
                        disabled={changingPlan}
                        className="px-4 py-2 bg-blue-600/40 hover:bg-blue-600/60 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {changingPlan ? <RefreshCw size={14} className="animate-spin" /> : null}
                        Starter
                      </button>
                      <button
                        onClick={() => handleChangePlanFromModal('pro')}
                        disabled={changingPlan}
                        className="px-4 py-2 bg-purple-600/40 hover:bg-purple-600/60 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {changingPlan ? <RefreshCw size={14} className="animate-spin" /> : null}
                        Pro
                      </button>
                      <button
                        onClick={() => handleChangePlanFromModal('ultimate')}
                        disabled={changingPlan}
                        className="px-4 py-2 bg-yellow-600/40 hover:bg-yellow-600/60 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {changingPlan ? <RefreshCw size={14} className="animate-spin" /> : null}
                        Ultimate
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {selectedUser.IsBlocked ? (
                        <button
                          onClick={() => {
                            handleUnblockUser(selectedUser.ID);
                            setSelectedUser(null);
                          }}
                          className="px-4 py-2 bg-green-600/40 hover:bg-green-600/60 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <Unlock size={16} />
                          رفع مسدودیت
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handleBlockUser(selectedUser.ID);
                            setSelectedUser(null);
                          }}
                          className="px-4 py-2 bg-red-600/40 hover:bg-red-600/60 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <Ban size={16} />
                          مسدود کردن
                        </button>
                      )}
                      <button
                        onClick={() => {
                          handleDeleteUser(selectedUser.ID);
                          setSelectedUser(null);
                        }}
                        className="px-4 py-2 bg-gray-600/40 hover:bg-gray-600/60 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} />
                        حذف کاربر
                      </button>
                    </div>
                  </div>

                  {/* User Payments (if available) */}
                  {userDetail && userDetail.payments && userDetail.payments.length > 0 && (
                    <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
                      <h3 className="text-lg font-bold text-white mb-4">تراکنش‌های اخیر</h3>
                      <div className="space-y-2">
                        {userDetail.payments.slice(0, 5).map((payment: any) => (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-900/60 rounded-lg">
                            <div>
                              <div className="text-white text-sm font-medium">{payment.type}</div>
                              <div className="text-gray-400 text-xs">{new Date(payment.created_at).toLocaleDateString('fa-IR')}</div>
                            </div>
                            <div className="text-green-400 font-bold">{formatCurrency(payment.amount)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

