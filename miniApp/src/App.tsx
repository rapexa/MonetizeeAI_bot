import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import TelegramWebAppGuard from './components/TelegramWebAppGuard';
import WebAuthGuard from './components/WebAuthGuard';

// ⚡ PERFORMANCE: Eager load only Dashboard (main page) and Layout
import Dashboard from './pages/Dashboard';

// ⚡ PERFORMANCE: Lazy load all other pages for faster initial load
const Levels = lazy(() => import('./pages/Levels'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Tools = lazy(() => import('./pages/Tools'));
const AICoach = lazy(() => import('./pages/AICoach'));
const Chatbot = lazy(() => import('./pages/Chatbot'));
const SocialGrowth = lazy(() => import('./pages/GrowthClub'));
const Messages = lazy(() => import('./pages/Messages'));
const Chat = lazy(() => import('./pages/Chat'));
const EnergyBoost = lazy(() => import('./pages/EnergyBoost'));
const BusinessBuilderAI = lazy(() => import('./pages/BusinessBuilderAI'));
const SellKitAI = lazy(() => import('./pages/SellKitAI'));
const ClientFinderAI = lazy(() => import('./pages/ClientFinderAI'));
const SalesPathAI = lazy(() => import('./pages/SalesPathAI'));
const CRM = lazy(() => import('./pages/CRM'));
const LeadProfile = lazy(() => import('./pages/LeadProfile'));
const ReadyPrompts = lazy(() => import('./pages/ReadyPrompts'));
const CoursePlayer = lazy(() => import('./pages/CoursePlayer'));
const SubscriptionManagement = lazy(() => import('./pages/SubscriptionManagement'));
const GuideTutorial = lazy(() => import('./pages/GuideTutorial'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const WebLogin = lazy(() => import('./pages/WebLogin'));
const TestPage = lazy(() => import('./pages/TestPage'));

// ⚡ PERFORMANCE: Simple loading component for lazy loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#0e0817' }}>
    <div className="text-center space-y-4">
      <div className="relative w-16 h-16 mx-auto">
        <div className="w-16 h-16 border-4 border-[#5a189a]/30 border-t-[#5a189a] rounded-full animate-spin"></div>
      </div>
      <p className="text-white/80 text-sm">در حال بارگذاری...</p>
    </div>
  </div>
);

// Component to check if user is in Telegram
function isInTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if Telegram WebApp object exists
  const telegramWebApp = window.Telegram?.WebApp;
  if (telegramWebApp && (telegramWebApp.initData || telegramWebApp.initDataUnsafe?.user?.id)) {
    return true;
  }
  
  // Check User-Agent for Telegram indicators
  const userAgent = navigator.userAgent;
  const telegramPatterns = ['Telegram', 'TelegramBot', 'tdesktop', 'Telegram Desktop', 'Telegram Web'];
  if (telegramPatterns.some(pattern => userAgent.includes(pattern))) {
    return true;
  }
  
  // Check referrer for Telegram domains
  const referrer = document.referrer;
  if (referrer && (referrer.includes('t.me') || referrer.includes('telegram.org') || referrer.includes('telegram.me'))) {
    return true;
  }
  
  return false;
}

// Component to handle Telegram WebApp start_param navigation
function AppRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  

  useEffect(() => {
    // Check if Telegram WebApp has start_param for subscription
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
      const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
      
      // If start_param is "subscription", navigate to the Subscription Management page
      if (startParam === 'subscription' && location.pathname !== '/subscription-management') {
        navigate('/subscription-management', { replace: true });
      } else if (startParam.startsWith('admin_') && location.pathname !== '/admin-panel') {
        // Admin panel access with admin telegram_id (format: admin_76599340)
        navigate('/admin-panel', { replace: true });
      } else if (startParam === 'dashboard' && location.pathname !== '/') {
        navigate('/', { replace: true });
      } else if (startParam === 'levels' && location.pathname !== '/levels') {
        navigate('/levels', { replace: true });
      } else if (startParam === 'tools' && location.pathname !== '/tools') {
        navigate('/tools', { replace: true });
      } else if (startParam === 'profile' && location.pathname !== '/profile') {
        navigate('/profile', { replace: true });
      } else if (startParam === 'tickets') {
        // Navigate to profile page to open tickets modal
        if (location.pathname !== '/profile') {
          navigate('/profile', { replace: true });
        }
      }
    }
    
    // Check if user is accessing non-admin routes from web (not Telegram)
    const isAdminRoute = location.pathname === '/admin-login' || 
                        location.pathname.startsWith('/admin-login/') ||
                        location.pathname === '/admin-panel' || 
                        location.pathname.startsWith('/admin-panel/');
    
    if (!isAdminRoute && !isInTelegramWebApp()) {
      // User is accessing non-admin route from web - show access denied message
      // This will be handled by backend middleware, but we can also show a message here
      console.log('⚠️ Non-Telegram access to non-admin route:', location.pathname);
    }
  }, [navigate, location.pathname]);

  return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Admin Login - Full page without layout */}
          <Route path="/admin-login" element={<AdminLogin />} />
          
          {/* Web Login - Full page without layout */}
          <Route path="/web-login" element={<WebLogin />} />
          
          {/* Admin Panel - Full page without layout */}
          <Route path="/admin-panel" element={<AdminPanel />} />
        
          {/* Subscription Management - Full page without layout */}
          <Route path="/subscription-management" element={<SubscriptionManagement />} />
          
          {/* Guide Tutorial - Full page without layout */}
          <Route path="/guide-tutorial" element={<GuideTutorial />} />
          
          {/* All other routes with Layout */}
          <Route path="/*" element={
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/levels" element={<Levels />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/ai-coach" element={<AICoach />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/chatbot" element={<Chatbot />} />
                  <Route path="/growth-club" element={<SocialGrowth />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/chat/:userId" element={<Chat />} />
                  <Route path="/energy-boost" element={<EnergyBoost />} />

                  <Route path="/business-builder-ai" element={<BusinessBuilderAI />} />
                  <Route path="/sell-kit-ai" element={<SellKitAI />} />
                  <Route path="/client-finder-ai" element={<ClientFinderAI />} />
                  <Route path="/sales-path-ai" element={<SalesPathAI />} />
                  <Route path="/crm" element={<CRM />} />
                  <Route path="/lead-profile" element={<LeadProfile />} />
                  {/* SalesPanel removed */}
                  <Route path="/ready-prompts" element={<ReadyPrompts />} />
                  <Route path="/courses/:courseId" element={<CoursePlayer />} />
                  <Route path="/test" element={<TestPage />} />
                </Routes>
              </Suspense>
            </Layout>
          } />
        </Routes>
      </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <TelegramWebAppGuard>
        <div className="min-h-screen transition-colors duration-300 app-container" dir="rtl" style={{ backgroundColor: '#0e0817', fontFamily: 'IranSansX, Vazir, system-ui, sans-serif' }}>
          <style dangerouslySetInnerHTML={{
            __html: `
              html.dark .app-container {
                background: #08000f !important;
              }
              @media (prefers-color-scheme: dark) {
                .app-container {
                  background: #08000f !important;
                }
              }
              /* Global font application */
              * {
                font-family: 'IranSansX', Vazir, system-ui, sans-serif !important;
              }
              body, html {
                font-family: 'IranSansX', Vazir, system-ui, sans-serif !important;
              }
            `
          }} />
          <ThemeProvider>
            <AppProvider>
              <Router>
                <WebAuthGuard>
                  <AppRouter />
                </WebAuthGuard>
              </Router>
            </AppProvider>
          </ThemeProvider>
        </div>
      </TelegramWebAppGuard>
    </ErrorBoundary>
  );
}

export default App;