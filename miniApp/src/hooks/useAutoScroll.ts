import { useEffect, useRef } from 'react';

export const useAutoScroll = (dependencies: any[]) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };

  useEffect(() => {
    // Skip auto-scroll on initial load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Only auto-scroll if there are messages and dependencies changed
    if (dependencies.length > 0 && dependencies[0] && dependencies[0].length > 0) {
      // Use requestAnimationFrame for better timing with DOM updates
      const timer = requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToBottom();
        }, 150); // Slightly longer delay to ensure DOM is updated
      });

      return () => cancelAnimationFrame(timer);
    }
  }, dependencies);

  return { messagesEndRef, containerRef, scrollToBottom };
};
