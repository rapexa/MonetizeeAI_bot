import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Send, Wifi, WifiOff, Brain } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const Chatbot: React.FC = () => {
  const { isOnline } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'سلام! من دستیار هوشمند MonetizeAI هستم. چطور می‌تونم کمکتان کنم؟',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const faqItems = [
    'چطور درآمد کسب کنم؟',
    'بهترین ابزارها کدامند؟',
    'تمرین‌های امروز',
    'تحلیل پیشرفت من',
    'راهنمای شروع'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !isOnline) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse: Message = {
        id: Date.now() + 1,
        text: generateAIResponse(inputValue),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userMessage: string): string => {
    const responses = {
      'چطور درآمد کسب کنم؟': 'برای کسب درآمد آنلاین، ابتدا مهارت‌های خود را شناسایی کنید. سپس می‌توانید از طریق فریلنسینگ، فروش محصولات دیجیتال، یا ایجاد کسب‌وکار آنلاین شروع کنید. من می‌تونم مرحله به مرحله راهنماییتان کنم.',
      'بهترین ابزارها کدامند؟': 'بهترین ابزارها بستگی به نوع کسب‌وکارتان دارد. برای شروع پیشنهاد می‌کنم از ابزارهای رایگان مثل Canva برای طراحی، MailChimp برای ایمیل مارکتینگ و Google Analytics برای تحلیل استفاده کنید.',
      'تمرین‌های امروز': 'تمرین‌های امروز شما شامل: ۱) ایجاد یک پست اینستاگرام جذاب ۲) نوشتن ۵ ایده محتوا ۳) بررسی رقبای خود. هر کدام را که انجام دادید، به من اطلاع دهید تا امتیاز بگیرید!',
      'تحلیل پیشرفت من': `پیشرفت شما عالی است! تا الان ${userData.completedTasks} تسک انجام داده‌اید و در سطح ${userData.currentLevel} قرار دارید. درآمد ماهانه شما ${new Intl.NumberFormat('fa-IR').format(userData.incomeMonth)} تومان است که نسبت به ماه قبل رشد داشته.`,
      'راهنمای شروع': 'برای شروع، این مراحل را دنبال کنید: ۱) تعیین نیش (حوزه تخصصی) ۲) ساخت محتوا ۳) جذب مخاطب ۴) فروش محصول/خدمات. من در هر مرحله کمکتان می‌کنم!'
    };

    // Check for exact matches first
    for (const [key, response] of Object.entries(responses)) {
      if (userMessage.includes(key)) {
        return response;
      }
    }

    // Default responses based on keywords
    if (userMessage.includes('درآمد') || userMessage.includes('پول')) {
      return 'درآمدزایی آنلاین نیاز به صبر و استراتژی دارد. بهترین راه شروع، شناسایی مهارت‌هایتان و تبدیل آن‌ها به محصول یا خدمات قابل فروش است. چه مهارتی دارید؟';
    }
    
    if (userMessage.includes('کمک') || userMessage.includes('راهنمایی')) {
      return 'البته! من اینجا هستم تا کمکتان کنم. می‌توانید از من در مورد استراتژی‌های درآمدزایی، بازاریابی، فروش و توسعه کسب‌وکار سوال بپرسید. چه موضوعی برایتان مهم است؟';
    }

    return 'سوال جالبی پرسیدید! بر اساس تجربه‌ام در حوزه درآمدزایی آنلاین، پیشنهاد می‌کنم ابتدا اهداف مشخصی تعریف کنید. می‌توانید سوال خود را واضح‌تر بپرسید تا بتوانم راهنمایی دقیق‌تری ارائه دهم؟';
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
          </div>
        </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto pb-32 bg-gradient-to-b from-transparent to-gray-900/20 pt-24">
        <div className="space-y-4 max-w-md mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm ${
                  message.sender === 'user'
                    ? 'bg-gray-700/80 dark:bg-gray-700/80 text-white dark:text-white border border-gray-600/30'
                    : 'bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white border border-[#5A189A]/30 dark:border-[#5A189A]/40'
                } transition-colors duration-300`}
              >
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-gray-400 dark:text-gray-400' : 'text-[#5A189A]/80 dark:text-[#5A189A]/70'
                }`}>
                  {message.timestamp.toLocaleTimeString('fa-IR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
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