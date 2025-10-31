import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Send, Wifi, WifiOff, Brain, X, Sparkles, Crown } from 'lucide-react';
import apiService from '../services/api';
import { useAutoScroll } from '../hooks/useAutoScroll';
import AIMessage from '../components/AIMessage';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  isNew?: boolean;
}

const Chatbot: React.FC = () => {
  const { isOnline, userData, isAPIConnected, isSubscriptionExpired } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { messagesEndRef, scrollToBottom } = useAutoScroll([messages]);

  const faqItems = [
    'چطور درآمد کسب کنم؟',
    'بهترین ابزارها کدامند؟',
    'تمرین‌های امروز',
    'تحلیل پیشرفت من',
    'راهنمای شروع'
  ];

  // Check if user can use chat
  const canUseChat = () => {
    // If subscription expired, no access
    if (isSubscriptionExpired()) {
      return false;
    }
    if (userData.subscriptionType === 'paid') {
      return true;
    }
    if (userData.subscriptionType === 'free_trial') {
      return (userData.chatMessagesUsed || 0) < 5; // Only 5 messages per day for free trial users
    }
    // For users without subscription type (legacy), also allow 5 messages
    if (!userData.subscriptionType || userData.subscriptionType === 'none') {
      return (userData.chatMessagesUsed || 0) < 5;
    }
    return false;
  };

  // Initialize Telegram WebApp
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        console.log('Telegram WebApp initialized in Chatbot');
        console.log('Telegram user data:', window.Telegram.WebApp.initDataUnsafe);
      } catch (error) {
        console.error('Error initializing Telegram WebApp:', error);
      }
    }
  }, []);

  // Debug userData changes
  useEffect(() => {
    console.log('UserData changed:', userData);
  }, [userData]);

  // Load chat history on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (isAPIConnected) {
        try {
          const response = await apiService.getChatHistory();
          if (response.success && response.data) {
            const historyMessages: Message[] = response.data.flatMap((item: any, index): Message[] => [
              {
                id: index * 2 + 1,
                text: String(item.message),
                sender: 'user' as const,
                timestamp: new Date(item.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
              },
              {
                id: index * 2 + 2,
                text: String(item.response),
                sender: 'ai' as const,
                timestamp: new Date(item.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
              }
            ]);

            if (historyMessages.length === 0) {
              // Add welcome message if no history
              setMessages([{
                id: 1,
                text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
              }]);
            } else {
              // Add welcome message at the beginning if it's not already there
              const hasWelcomeMessage = historyMessages.some(msg => 
                msg.sender === 'ai' && msg.text.includes('سلام! من AI کوچ شخصی شما هستم')
              );
              
              if (!hasWelcomeMessage) {
                const welcomeMessage: Message = {
                  id: 0,
                  text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
                  sender: 'ai',
                  timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                };
                setMessages([welcomeMessage, ...historyMessages]);
              } else {
                setMessages(historyMessages);
              }
            }
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
          // Add welcome message on error
          setMessages([{
            id: 1,
            text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      } else {
        // Add welcome message if API not connected
        setMessages([{
          id: 1,
          text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    };

    loadChatHistory();
  }, [isAPIConnected]);

  const handleSend = async () => {
    if (!inputValue.trim() || !isOnline) return;

    // Check subscription limits
    if (!canUseChat()) {
      alert('🔒 شما به محدودیت پیام روزانه رسیده‌اید. امروز یک پیام ارسال کردید. برای استفاده بیشتر، اشتراک پولی تهیه کنید.');
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToProcess = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      console.log('Debug info:', { 
        isAPIConnected, 
        telegramId: userData?.telegramId, 
        userData: userData 
      }); // Debug user data
      
      // Try to get telegramId from multiple sources
      let telegramId = userData?.telegramId;
      
      // If no telegramId from userData, try to get it from Telegram WebApp
      if (!telegramId && typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        console.log('Got telegramId from Telegram WebApp:', telegramId);
      }
      
      // If still no telegramId, use a fallback for testing
      if (!telegramId) {
        telegramId = 76599340; // Fallback ID for testing
        console.log('Using fallback telegramId:', telegramId);
      }
      
      // Always try to make the API call, regardless of isAPIConnected
      if (telegramId) {
        // Use the telegramId we found
        const response = await fetch('https://sianmarketing.com/api/api/v1/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            telegram_id: telegramId,
            message: messageToProcess
          })
        });

        const result = await response.json();
        
        console.log('API Response:', { response: response.ok, result }); // Debug full response
        
        if (response.ok && result.success && result.data && result.data.response) {
          const aiResponse: Message = {
            id: Date.now() + 1,
            text: result.data.response,
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            isNew: true
          };
          setMessages(prev => [...prev, aiResponse]);
          
          console.log('AI Response added successfully:', aiResponse); // Debug log
        } else {
          console.error('API response error or missing data:', { 
            responseOk: response.ok, 
            resultSuccess: result.success, 
            hasData: !!result.data, 
            hasResponse: !!result.data?.response,
            result 
          });
          // Fallback response if API fails
          const fallbackResponse: Message = {
            id: Date.now() + 1,
            text: 'متأسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفاً دوباره تلاش کنید.',
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, fallbackResponse]);
        }
      } else {
        console.error('API not connected or no telegramId:', { isAPIConnected, telegramId: userData?.telegramId });
        // Fallback response if API not connected
        const fallbackResponse: Message = {
          id: Date.now() + 1,
          text: 'اتصال به سرور برقرار نیست. لطفاً دوباره تلاش کنید.',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, fallbackResponse]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Error response
      const errorResponse: Message = {
        id: Date.now() + 1,
        text: 'خطا در ارسال پیام. لطفاً دوباره تلاش کنید.',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };



  const handleFAQClick = (question: string) => {
    setInputValue(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: '#0e0817' }}>
              {/* Header */}
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#2c189a]/95 via-[#5a189a]/95 to-[#7222F2]/95 backdrop-blur-xl border-b border-gray-700/60 shadow-2xl">
          <div className="flex items-center justify-between p-4 max-w-md mx-auto">
            {/* Icon Container */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2c189a] via-[#5a189a] to-[#7222F2] rounded-xl flex items-center justify-center shadow-lg">
                <Brain size={24} className="text-white" />
              </div>
              {/* Icon Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#2c189a]/30 via-[#5a189a]/30 to-[#7222F2]/30 rounded-xl blur-md animate-pulse"></div>
            </div>
            
            {/* Title Section */}
            <div className="text-right flex-1 mr-4">
              <h1 className="text-xl font-bold text-white mb-1">AI کوچ</h1>
              <p className="text-xs text-gray-300">دستیار هوشمند شخصی</p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                // Check if we came from levels page with specific level
                const state = location.state as { fromLevel?: number; fromStage?: number; fromPage?: string } | null;
                if (state?.fromPage === 'levels' && state?.fromLevel) {
                  // Navigate back to levels page with the specific level and stage
                  navigate('/levels', { state: { selectedLevel: state.fromLevel, selectedStage: state.fromStage } });
                } else {
                  // Default behavior - go back
                  navigate(-1);
                }
              }}
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-110 border border-white/30"
              title="بازگشت"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto pb-32 bg-gradient-to-b from-transparent to-gray-900/20 pt-24">
        <div className="space-y-3 max-w-md mx-auto">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}
            >
              {message.sender === 'user' ? (
                <div className="flex flex-col max-w-[80%]">
                  <div className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-lg rounded-br-md px-3 py-2">
                    <p className="text-white text-xs leading-relaxed">{message.text}</p>
                  </div>
                  <span className="text-xs text-gray-400 mt-1 px-1 text-right">{message.timestamp}</span>
                </div>
              ) : (
                <AIMessage
                  message={message.text}
                  timestamp={message.timestamp}
                  isLatest={index === messages.length - 1}
                  isNew={message.isNew}
                  onTypingComplete={() => {
                    // When typing is complete, set isNew to false
                    if (message.isNew) {
                      setMessages(prev => prev.map(msg => 
                        msg.id === message.id ? { ...msg, isNew: false } : msg
                      ));
                    }
                  }}
                />
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white px-4 py-3 rounded-2xl max-w-xs shadow-lg backdrop-blur-sm border border-[#5A189A]/30">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 backdrop-blur-xl rounded-3xl border border-gray-700/60 p-7 shadow-lg transition-all duration-500 pb-safe-area-inset-bottom z-40" style={{ backgroundColor: 'rgb(16, 9, 28)' }}>
        {/* Subscription limit warning */}
        {!canUseChat() && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Crown className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h4 className="text-red-400 font-bold text-sm mb-1">محدودیت اشتراک</h4>
                <p className="text-red-300 text-xs">
                  شما امروز یک پیام ارسال کرده‌اید. برای استفاده بیشتر، اشتراک پولی تهیه کنید.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isOnline ? "پیام خود را بنویسید..." : "اتصال اینترنت قطع است"}
            disabled={!isOnline}
            className="flex-1 bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 text-base"
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || !isOnline}
            className="p-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-300 hover:scale-105 shadow-lg flex-shrink-0 min-w-[48px]"
          >
            <Send size={18} className="text-white drop-shadow-lg font-bold" />
          </button>
        </div>
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => navigate('/ready-prompts')}
            className="w-full py-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 border border-purple-200/50 dark:border-purple-700/50 hover:border-purple-300/70 dark:hover:border-purple-600/70 rounded-lg hover:bg-purple-50/30 dark:hover:bg-purple-900/20 transition-all duration-300 flex items-center justify-center gap-1"
          >
            <Sparkles size={12} />
            <span>پرامپت‌های آماده</span>
          </button>
        </div>
      </div>

      {/* Offline Toast */}
      {!isOnline && (
        <div className="fixed bottom-32 left-4 right-4 bg-red-600/90 dark:bg-red-600/90 backdrop-blur-xl text-white px-4 py-3 rounded-2xl shadow-2xl transition-colors duration-300 animate-fade-in border border-red-500/30">
          <div className="flex items-center gap-2 text-sm">
            <WifiOff size={16} />
            شبکه قطع شد، دوباره تلاش کنید
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;