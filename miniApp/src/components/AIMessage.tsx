import React, { useState } from 'react';
import { Brain, Copy, Check } from 'lucide-react';
import { useTypingEffect } from '../hooks/useTypingEffect';

interface AIMessageProps {
  message: string;
  timestamp: string;
  isLatest?: boolean;
  isNew?: boolean;
  onTypingComplete?: () => void;
}

const AIMessage: React.FC<AIMessageProps> = ({ 
  message, 
  timestamp, 
  isLatest = false,
  isNew = false,
  onTypingComplete 
}) => {
  const [copied, setCopied] = useState(false);
  const { displayedText, isTyping } = useTypingEffect({
    text: message,
    speed: 15, // Even faster typing speed
    onComplete: onTypingComplete,
    shouldAnimate: isNew,
    onTypingComplete: onTypingComplete
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8A00FF] to-[#C738FF] flex items-center justify-center flex-shrink-0">
          <Brain size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-base leading-relaxed whitespace-pre-wrap">
            {isNew && displayedText ? displayedText : message}
          </p>
          {isLatest && isTyping && (
            <span className="inline-block w-2 h-4 bg-[#8A00FF] ml-1 animate-pulse"></span>
          )}
        </div>
      </div>
      
      {/* Copy Button - always visible and aligned */}
      <div className="flex items-center gap-3 mt-2">
        <div className="w-8 h-8 flex-shrink-0"></div> {/* Spacer to align with avatar */}
        <div className="flex-1 flex justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
          >
            {copied ? (
              <>
                <Check size={12} className="text-green-400" />
                <span className="text-green-400">کپی شد!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>کپی</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIMessage;
