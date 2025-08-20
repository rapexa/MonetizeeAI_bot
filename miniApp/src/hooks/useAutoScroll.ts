import { useEffect, useRef } from 'react';

export const useAutoScroll = (dependencies: any[]) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };

  useEffect(() => {
    // Use requestAnimationFrame for better timing with DOM updates
    const timer = requestAnimationFrame(() => {
      setTimeout(() => {
        scrollToBottom();
      }, 150); // Slightly longer delay to ensure DOM is updated
    });

    return () => cancelAnimationFrame(timer);
  }, dependencies);

  return { messagesEndRef, containerRef, scrollToBottom };
};
