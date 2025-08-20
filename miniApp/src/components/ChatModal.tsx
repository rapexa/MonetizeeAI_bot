import React, { useState, useEffect } from 'react';
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
    setIsLoading(true);

    try {
      if (isAPIConnected) {
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
        } else {
          throw new Error(response.error || 'Failed to get response');
        }
      } else {
        throw new Error('API not connected');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse = {
        id: chatMessages.length + 2,
        text: '❌ متأسفانه در حال حاضر نمی‌توانم پاسخ دهم. لطفا دوباره تلاش کنید.',
        sender: 'ai' as const,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        isNew: true
      };
      setChatMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && message.trim()) {
        handleSendMessage();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-4xl h-screen md:h-[90vh] md:rounded-3xl bg-gradient-to-br from-gray-900 to-black border-0 md:border border-gray-700/50 overflow-hidden flex flex-col">
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
                  <p className="text-xs opacity-70 mt-2 text-right px-2">{msg.timestamp}</p>
                </div>
              ) : (
                <AIMessage
                  message={msg.text}
                  timestamp={msg.timestamp}
                  isLatest={index === chatMessages.length - 1}
                  isNew={msg.isNew || false}
                  onTypingComplete={scrollToBottom}
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
        <div className="p-4 md:p-6 border-t border-gray-700/50 bg-gray-800/30 pb-safe-area-inset-bottom">
          <div className="flex gap-3 items-end">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="سوال خود را بپرسید..."
              className="flex-1 p-3 md:p-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-[#2c189a] focus:ring-1 focus:ring-[#2c189a] transition-colors text-base"
              style={{ fontSize: '16px' }} // Prevents zoom on iOS
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="px-4 py-3 md:px-5 md:py-4 bg-gradient-to-r from-[#2c189a] to-[#5a189a] hover:from-[#2c189a]/90 hover:to-[#5a189a]/90 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center min-w-[52px]"
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
