import React, { useState, useEffect } from 'react';
import { X, Send, Maximize2 } from 'lucide-react';
import AIMessage from './AIMessage';
import { useAutoScroll } from '../hooks/useAutoScroll';
import apiService from '../services/api';
import { useApp } from '../context/AppContext';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ 
  isOpen, 
  onClose, 
  title = "چت با AI Coach" 
}) => {
  const { isAPIConnected } = useApp();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { messagesEndRef, scrollToBottom } = useAutoScroll([chatMessages]);

  // Welcome message
  useEffect(() => {
    if (isOpen && chatMessages.length === 0) {
      const welcomeMessage = {
        id: 1,
        text: "سلام! من AI Coach هستم 👋\n\nآماده‌ام تا در مسیر یادگیری و کسب‌وکارتان راهنمایی‌تان کنم. چه سوالی دارید؟",
        sender: 'ai' as const,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages([welcomeMessage]);
    }
  }, [isOpen]);

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
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
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
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[90vh] mx-4 bg-gradient-to-br from-gray-900 to-black rounded-3xl border border-gray-700/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50 bg-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-monetize-primary-600 to-monetize-secondary-600 rounded-xl flex items-center justify-center">
              <Maximize2 size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400">دستیار هوشمند شما</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.map((msg, index) => (
            <div key={msg.id}>
              {msg.sender === 'user' ? (
                <div className="flex justify-end">
                  <div className="flex flex-col max-w-[85%]">
                    <div className="bg-gradient-to-r from-monetize-primary-600 to-monetize-secondary-600 rounded-2xl rounded-br-md px-4 py-3">
                      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 px-1 text-right">{msg.timestamp}</span>
                  </div>
                </div>
              ) : (
                <AIMessage
                  message={msg.text}
                  timestamp={msg.timestamp}
                  isLatest={index === chatMessages.length - 1}
                  onTypingComplete={scrollToBottom}
                />
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 bg-gradient-to-r from-monetize-primary-600 to-monetize-secondary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">AI</span>
              </div>
              <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-3 border border-gray-700/50">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-monetize-primary-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-monetize-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-monetize-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-700/50 bg-gray-800/30">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 p-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-monetize-primary-500 focus:ring-1 focus:ring-monetize-primary-500 transition-colors"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="px-4 py-3 bg-gradient-to-r from-monetize-primary-600 to-monetize-secondary-600 hover:from-monetize-primary-700 hover:to-monetize-secondary-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center min-w-[50px]"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
