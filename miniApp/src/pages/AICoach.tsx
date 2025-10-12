import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Send, Brain, Sparkles, MessageSquare, Target, TrendingUp, Lightbulb, Copy, ChevronRight, Zap, BookOpen, Users, DollarSign, Rocket, BarChart3 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import apiService from '../services/api';
import AIMessage from '../components/AIMessage';
import { useAutoScroll } from '../hooks/useAutoScroll';

const AICoach: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAPIConnected } = useApp();
  const [message, setMessage] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: number;
    text: string;
    sender: 'user' | 'ai';
    timestamp: string;
    isNew?: boolean;
  }>>([]);
  const { messagesEndRef, scrollToBottom } = useAutoScroll([chatMessages]);

  // Load chat history on component mount
  React.useEffect(() => {
    const loadChatHistory = async () => {
      if (isAPIConnected) {
        try {
          const response = await apiService.getChatHistory();
          if (response.success && response.data) {
            const historyMessages = response.data.flatMap((item, index) => [
              {
                id: index * 2 + 1,
                text: item.message,
                sender: 'user' as const,
                timestamp: new Date(item.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
              },
              {
                id: index * 2 + 2,
                text: item.response,
                sender: 'ai' as const,
                timestamp: new Date(item.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
              }
            ]);

            if (historyMessages.length === 0) {
              // Add welcome message if no history
              setChatMessages([{
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
                const welcomeMessage = {
                  id: 0,
                  text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
                  sender: 'ai' as const,
                  timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                };
                setChatMessages([welcomeMessage, ...historyMessages]);
              } else {
                setChatMessages(historyMessages);
              }
            }
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
          // Add welcome message on error
          setChatMessages([{
            id: 1,
            text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      } else {
        // Add welcome message if API not connected
        setChatMessages([{
          id: 1,
          text: 'سلام! من AI کوچ شخصی شما هستم. آماده‌ام تا در مسیر کسب‌وکار و درآمدزایی کمکتون کنم. چطور می‌تونم کمکتون کنم؟',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    };

    loadChatHistory();
  }, [isAPIConnected]);

  // Check if we have a prompt from ReadyPrompts page
  React.useEffect(() => {
    if (location.state?.promptText) {
      setMessage(location.state.promptText);
      setIsEditingPrompt(true); // Enable editing mode
      // Clear the state to prevent re-processing
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const handleCancelPromptEdit = () => {
    setIsEditingPrompt(false);
    setMessage('');
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = {
      id: chatMessages.length + 1,
      text: message,
      sender: 'user' as const,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMessage]);
    const currentMessage = message;
    setMessage('');

    // If we were editing a prompt, exit editing mode
    if (isEditingPrompt) {
      setIsEditingPrompt(false);
    }

    // Get AI response
    setIsLoading(true);
    
    try {
      if (isAPIConnected) {
        // Use real ChatGPT API
        const response = await apiService.sendChatMessage(currentMessage);
        
        if (response.success && response.data) {
          const aiResponse = {
            id: chatMessages.length + 2,
            text: response.data.response,
            sender: 'ai' as const,
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            isNew: true
          };
          setChatMessages(prev => [...prev, aiResponse]);
          // Auto scroll after AI response
          setTimeout(scrollToBottom, 100);
        } else {
          throw new Error(response.error || 'Failed to get response');
        }
      } else {
        // Fallback to simulated response
        throw new Error('API not connected');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if it's a rate limit error
      let errorMessage = '❌ متأسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفا دوباره تلاش کنید.';
      
      if (error instanceof Error) {
        if (error.message.includes('محدودیت سه تا سوال') || error.message.includes('rate limit')) {
          errorMessage = '⚠️ ' + error.message;
        }
      }
      
      const errorResponse = {
        id: chatMessages.length + 2,
        text: errorMessage,
        sender: 'ai' as const,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        isNew: true
      };
      setChatMessages(prev => [...prev, errorResponse]);
      // Auto scroll after error response
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsLoading(false);
    }
  };

      return (
      <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: '#0e0817' }}>
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
          </div>
        </div>

        {/* Main Content */}
        <div className="pt-24 max-w-4xl mx-auto p-6 pb-32">
          {/* Chat Messages */}
          <div className="h-[calc(100vh-200px)] overflow-y-auto space-y-1">
            {chatMessages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                {msg.sender === 'user' ? (
                  <div className="max-w-xs lg:max-w-md">
                    <div className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white p-4 rounded-2xl">
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                    <p className="text-xs opacity-70 mt-2 text-right px-2">{msg.timestamp}</p>
                  </div>
                ) : (
                  <div className="w-full">
                    <AIMessage
                      message={msg.text}
                      timestamp={msg.timestamp}
                      isLatest={index === chatMessages.length - 1}
                      isNew={msg.isNew || false}
                      onTypingComplete={scrollToBottom}
                    />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input - Fixed at Bottom */}
        <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 backdrop-blur-xl rounded-3xl border border-gray-700/60 p-7 shadow-lg transition-all duration-500 ${isEditingPrompt ? 'ring-2 ring-[#7222F2]/50' : ''} pb-safe-area-inset-bottom z-40`} style={{ backgroundColor: '#10091c' }}>
          {isEditingPrompt ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h6 className="text-sm font-medium text-[#7222F2]">
                  ویرایش پرامپت - جاهای خالی رو پر کنید:
                </h6>
                <button
                  onClick={handleCancelPromptEdit}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  انصراف ✕
                </button>
              </div>
              
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="پرامپت خود را ویرایش کنید..."
                className="w-full h-32 px-4 py-3 bg-gray-800/40 backdrop-blur-md rounded-xl border border-purple-300/50 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 resize-none leading-relaxed"
              />
              
              <div className="flex gap-2">
                <button 
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  ارسال پرامپت 🚀
                </button>
                <button 
                  onClick={handleCancelPromptEdit}
                  className="px-4 py-3 bg-gray-700/70 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600/70 transition-all duration-300"
                >
                  انصراف
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="پیام خود را بنویسید..."
                  className="flex-1 bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all duration-300 text-base"
                  style={{ fontSize: '16px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  className="p-3 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-300 hover:scale-105 shadow-lg flex-shrink-0 min-w-[48px]"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send size={18} className="text-white drop-shadow-lg font-bold" style={{ color: 'white', stroke: 'white' }} />
                  )}
                </button>
              </div>
              
              {/* Ready Prompts Button */}
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => navigate('/ready-prompts?from=ai-coach')}
                  className="w-full py-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 border border-purple-200/50 dark:border-purple-700/50 hover:border-purple-300/70 dark:hover:border-purple-600/70 rounded-lg hover:bg-purple-50/30 dark:hover:bg-purple-900/20 transition-all duration-300 flex items-center justify-center gap-1"
                >
                  <Sparkles size={12} />
                  پرامپت‌های آماده
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
};

export default AICoach; 