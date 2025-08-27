import React from 'react';
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
  const { displayedText, isTyping } = useTypingEffect({
    text: message,
    speed: 20, // Faster typing speed for smoother effect
    onComplete: onTypingComplete,
    shouldAnimate: isNew,
    onTypingComplete: onTypingComplete
  });

  return (
    <div className="flex gap-3 max-w-[85%]">
      <div className="w-8 h-8 bg-gradient-to-r from-monetize-primary-600 to-monetize-secondary-600 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-semibold">AI</span>
      </div>
      <div className="flex flex-col">
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-3 border border-gray-700/50">
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
            {isLatest ? displayedText : message}
          </p>
          {isLatest && isTyping && (
            <span className="inline-block w-2 h-4 bg-monetize-primary-500 ml-1 animate-pulse"></span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-400 mt-1 px-1">{timestamp}</span>
      </div>
    </div>
  );
};

export default AIMessage;
