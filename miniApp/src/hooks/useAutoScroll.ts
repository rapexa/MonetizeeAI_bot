import { useEffect, useRef } from 'react';

/**
 * Hook to auto-scroll to bottom when messages (or other list) changes.
 * @param messages - Array to depend on (e.g. chatMessages). Effect runs when this reference/length changes.
 */
export const useAutoScroll = (messages: unknown[] = []) => {
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
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (messages.length > 0) {
      const timer = requestAnimationFrame(() => {
        setTimeout(() => scrollToBottom(), 150);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [messages]);

  return { messagesEndRef, containerRef, scrollToBottom };
};
