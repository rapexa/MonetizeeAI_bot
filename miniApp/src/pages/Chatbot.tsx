import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Send, Wifi, WifiOff, Brain, X } from 'lucide-react';
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
  const { isOnline, userData, isAPIConnected } = useApp();
  const navigate = useNavigate();
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
      if (isAPIConnected && userData?.telegramId) {
        // Use userData.telegramId directly instead of apiService.getTelegramId()
        const response = await fetch('https://sianmarketing.com/api/api/v1/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            telegram_id: userData.telegramId,
            message: messageToProcess
          })
        });

        const result = await response.json();
        
        if (response.ok && result.success && result.data) {
          const aiResponse: Message = {
            id: Date.now() + 1,
            text: result.data.response,
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            isNew: true
          };
          setMessages(prev => [...prev, aiResponse]);
          
          console.log('AI Response added:', aiResponse); // Debug log
        } else {
          console.error('API response error:', result);
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
              onClick={() => navigate(-1)}
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-110 border border-white/30"
              title="بازگشت"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto pb-32 bg-gradient-to-b from-transparent to-gray-900/20 pt-24">
        <div className="space-y-4 max-w-md mx-auto">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              {message.sender === 'user' ? (
                <div className="max-w-xs px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm bg-gray-700/80 dark:bg-gray-700/80 text-white dark:text-white border border-gray-600/30 transition-colors duration-300">
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 text-gray-400 dark:text-gray-400">
                    {message.timestamp}
                  </p>
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
      <div className="fixed bottom-20 left-0 right-0 bg-gray-800/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-gray-700/50 dark:border-gray-700/50 p-4 transition-colors duration-300 shadow-2xl">
        <div className="max-w-md mx-auto">
          {/* FAQ Chips */}
          <div className="mb-3 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {faqItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleFAQClick(item)}
                  className="whitespace-nowrap bg-gray-700/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-300 dark:text-gray-300 px-3 py-1 rounded-full text-sm hover:bg-gray-600/80 dark:hover:bg-gray-600/80 hover:scale-105 transition-all duration-300 shadow-lg border border-gray-600/30"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isOnline ? "پیام خود را بنویسید..." : "اتصال اینترنت قطع است"}
              disabled={!isOnline}
              className={`flex-1 px-4 py-3 border rounded-2xl text-sm transition-all duration-300 backdrop-blur-sm shadow-inner ${
                isOnline 
                  ? 'border-gray-600/50 dark:border-gray-600/50 placeholder-gray-400 dark:placeholder-gray-400 focus:border-[#5A189A]/50 dark:focus:border-[#5A189A]/40 focus:outline-none focus:ring-2 focus:ring-[#5A189A]/20 bg-gray-700/80 dark:bg-gray-700/80 text-white dark:text-white' 
                  : 'border-gray-600/50 dark:border-gray-600/50 placeholder-gray-500 dark:placeholder-gray-500 bg-gray-700/60 dark:bg-gray-700/60 text-gray-400 dark:text-gray-400'
              }`}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || !isOnline}
              className={`px-4 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:scale-105 ${
                inputValue.trim() && isOnline
                  ? 'bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white hover:shadow-xl'
                  : 'bg-gradient-to-r from-[#2c189a]/60 to-[#5a189a]/60 text-white/60 border border-[#5A189A]/20 dark:border-[#5A189A]/40'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
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