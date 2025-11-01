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
import PaymentResult from './pages/PaymentResult';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';

// Component to handle Telegram WebApp start_param navigation
function AppRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if Telegram WebApp has start_param for subscription
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
      const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
      
      // If start_param is "subscription", navigate to profile page
      // The Profile component will handle opening the subscription modal
      if (startParam === 'subscription' && location.pathname !== '/profile') {
        navigate('/profile?startapp=subscription', { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  return (
    <>
      <Routes>
        <Route path="/payment/result" element={<PaymentResult />} />
      </Routes>
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
        </Routes>
      </Layout>
    </>
  );
}

function App() {
  return (
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
}

export default App;