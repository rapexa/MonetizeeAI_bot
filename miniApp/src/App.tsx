import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Levels from './pages/Levels';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Tools from './pages/Tools';
import AICoach from './pages/AICoach';
import Chatbot from './pages/Chatbot';
import SocialGrowth from './pages/GrowthClub';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import EnergyBoost from './pages/EnergyBoost';


import BusinessBuilderAI from './pages/BusinessBuilderAI';
import SellKitAI from './pages/SellKitAI';
import ClientFinderAI from './pages/ClientFinderAI';
import SalesPathAI from './pages/SalesPathAI';
import CRM from './pages/CRM';
import LeadProfile from './pages/LeadProfile';
import ReadyPrompts from './pages/ReadyPrompts';
import CoursePlayer from './pages/CoursePlayer';
import SubscriptionManagement from './pages/SubscriptionManagement';
import GuideTutorial from './pages/GuideTutorial';
import AdminPanel from './pages/AdminPanel';
import AdminLogin from './pages/AdminLogin';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import TestPage from './pages/TestPage';
import TelegramWebAppGuard from './components/TelegramWebAppGuard';

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
      <Routes>
        {/* Admin Login - Full page without layout */}
        <Route path="/admin-login" element={<AdminLogin />} />
        
        {/* Admin Panel - Full page without layout */}
        <Route path="/admin-panel" element={<AdminPanel />} />
      
      {/* Subscription Management - Full page without layout */}
      <Route path="/subscription-management" element={<SubscriptionManagement />} />
      
      {/* Guide Tutorial - Full page without layout */}
      <Route path="/guide-tutorial" element={<GuideTutorial />} />
      
      {/* All other routes with Layout */}
      <Route path="/*" element={
        <Layout>
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
        </Layout>
      } />
    </Routes>
  );
}

function App() {
  const appContent = (
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
            <AppRouter />
          </Router>
        </AppProvider>
      </ThemeProvider>
    </div>
  );

  return (
    <ErrorBoundary>
      <TelegramWebAppGuard>
        {appContent}
      </TelegramWebAppGuard>
    </ErrorBoundary>
  );
}

export default App;