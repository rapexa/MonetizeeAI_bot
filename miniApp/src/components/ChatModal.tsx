import React, { useState, useEffect, useCallback } from 'react';
import { X, Send, Brain } from 'lucide-react';
import AIMessage from './AIMessage';
import { useAutoScroll } from '../hooks/useAutoScroll';
import apiService from '../services/api';
import { useApp } from '../context/AppContext';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  isNew?: boolean;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  chatMessages?: ChatMessage[];
  setChatMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const ChatModal: React.FC<ChatModalProps> = ({ 
  isOpen, 
  onClose, 
  title = "چت با AI Coach",
  chatMessages: externalChatMessages,
  setChatMessages: externalSetChatMessages
}) => {
  const { isAPIConnected } = useApp();
  const [internalChatMessages, setInternalChatMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Use external messages if provided, otherwise use internal state
  const chatMessages = externalChatMessages || internalChatMessages;
  const setChatMessages = externalSetChatMessages || setInternalChatMessages;
  
  const { messagesEndRef, scrollToBottom } = useAutoScroll([chatMessages]);

  // Welcome message only for internal chat (when no external messages provided)
  useEffect(() => {
    if (isOpen && !externalChatMessages && chatMessages.length === 0) {
      const welcomeMessage = {
        id: 1,
        text: "سلام! من AI Coach هستم 👋\n\nآماده‌ام تا در مسیر یادگیری و کسب‌وکارتان راهنمایی‌تان کنم. چه سوالی دارید؟",
        sender: 'ai' as const,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages([welcomeMessage]);
    }
  }, [isOpen, externalChatMessages, chatMessages.length, setChatMessages]);

  const handleSendMessage = useCallback(async () => {
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
    setIsLoading(true);

    try {
      if (isAPIConnected) {
        const response = await apiService.sendChatMessage(currentMessage);
        
        if (response.success && response.data) {
          // Debug logging to see what we're getting from API
          console.log('🔍 === API RESPONSE DEBUG ===');
          console.log('🔍 Full Response:', response);
          console.log('🔍 Response Data:', response.data);
          console.log('🔍 Response Data Keys:', Object.keys(response.data));
          console.log('🔍 Response Text:', response.data.response);
          console.log('🔍 Text Length:', response.data.response?.length);
          console.log('🔍 Text Preview (first 200 chars):', response.data.response?.substring(0, 200));
          console.log('🔍 Text Preview (last 100 chars):', response.data.response?.substring(-100));
          console.log('🔍 Is Response String?', typeof response.data.response);
          console.log('🔍 Response Data Type:', typeof response.data);
          console.log('🔍 === END DEBUG ===');
          
          const aiResponse = {
            id: chatMessages.length + 2,
            text: response.data.response,
            sender: 'ai' as const,
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            isNew: true
          };
          setChatMessages(prev => [...prev, aiResponse]);
          
          // Check if response seems incomplete and add a note
          if (response.data.response && response.data.response.length < 100) {
            const incompleteNote = {
              id: chatMessages.length + 3,
              text: '⚠️ توجه: پاسخ دریافتی کوتاه است. ممکن است مشکل در سرور باشد. لطفا دوباره سوال کنید.',
              sender: 'ai' as const,
              timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
              isNew: true
            };
            setChatMessages(prev => [...prev, incompleteNote]);
          }
        } else {
          // Check if subscription expired
          if (response.error === 'SUBSCRIPTION_EXPIRED' || response.subscriptionExpired) {
            throw new Error('SUBSCRIPTION_EXPIRED');
          }
          throw new Error(response.error || 'Failed to get response');
        }
      } else {
        throw new Error('API not connected');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if it's a rate limit error or subscription expired
      let errorMessage = '❌ متأسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفا دوباره تلاش کنید.';
      
      if (error instanceof Error) {
        if (error.message.includes('محدودیت سه تا سوال') || error.message.includes('rate limit')) {
          errorMessage = '⚠️ ' + error.message;
        } else if (error.message.includes('SUBSCRIPTION_EXPIRED') || error.message.includes('subscription has expired')) {
          errorMessage = '⚠️ اشتراک شما به پایان رسید!\n\n🔒 برای ادامه استفاده از امکانات، لطفا به ربات برگردید و اشتراک خریداری کنید یا لایسنس خود را وارد کنید.';
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
    } finally {
      setIsLoading(false);
    }
  }, [message, chatMessages.length, setChatMessages, isAPIConnected]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && message.trim()) {
        handleSendMessage();
      }
    }
  }, [handleSendMessage, isLoading, message]);

  if (!isOpen) {
    console.log('🔥 ChatModal: isOpen is false, returning null');
    return null;
  }

  console.log('🔥 ChatModal: Rendering modal!');
  return (
    <div className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4"
         style={{ 
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           zIndex: 99999,
           backgroundColor: 'rgba(0,0,0,0.8)'
         }}>
      <div className="w-full max-w-4xl h-screen md:h-[90vh] md:rounded-3xl bg-gradient-to-br from-gray-900 to-black border-0 md:border border-gray-700/50 overflow-hidden flex flex-col" style={{ height: '100vh', maxHeight: '100vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-700/50 bg-gray-800/30 pt-safe">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#2c189a] to-[#5a189a] rounded-xl flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400">مربی هوشمند شما</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-gray-300" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4">
          {chatMessages.map((msg, index) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'user' ? (
                <div className="max-w-xs lg:max-w-md">
                  <div className="bg-gradient-to-r from-[#2c189a] to-[#5a189a] text-white p-3 md:p-4 rounded-2xl">
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-400 opacity-70 mt-2 text-right px-2">{msg.timestamp}</p>
                </div>
              ) : (
                <AIMessage
                  message={msg.text}
                  timestamp={msg.timestamp}
                  isLatest={index === chatMessages.length - 1}
                  isNew={msg.isNew || false}
                  onTypingComplete={() => {
                    // Freeze the latest AI message so it won't re-type on future renders
                    setChatMessages(prev => {
                      if (!prev || prev.length === 0) return prev;
                      const lastIndex = prev.length - 1;
                      const updated = [...prev];
                      const lastMessage = updated[lastIndex];
                      if (lastMessage.sender === 'ai' && 'isNew' in lastMessage && lastMessage.isNew) {
                        updated[lastIndex] = { ...lastMessage, isNew: false };
                      }
                      return updated;
                    });
                    scrollToBottom();
                  }}
                />
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 max-w-[80%] flex-row animate-fade-in">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#2c189a] to-[#5a189a]">
                  <Brain size={12} className="text-white" />
                </div>
                <div className="bg-purple-100/70 dark:bg-purple-900/30 text-gray-800 dark:text-gray-200 backdrop-blur-sm rounded-lg px-3 py-2 text-xs">
                  <p className="leading-relaxed">
                    <span className="inline-block ml-1 text-gray-500 animate-bounce-dots">...</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-4 md:p-6 border-t border-gray-700/50 bg-gray-800/95 backdrop-blur-xl" 
             style={{ 
               paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
               position: 'sticky',
               bottom: 0,
               zIndex: 10
             }}>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="سوال خود را بپرسید..."
              className="flex-1 p-3 md:p-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-[#2c189a] focus:ring-1 focus:ring-[#2c189a] transition-colors resize-none outline-none"
              style={{ 
                fontSize: '16px',
                height: '52px',
                WebkitAppearance: 'none'
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="w-[52px] h-[52px] bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0"
            >
              {isLoading ? (
                <span className="animate-bounce-dots">...</span>
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
