import { useState, useEffect, useRef } from 'react';

interface UseTypingEffectProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  shouldAnimate?: boolean;
  onTypingComplete?: () => void;
}

export const useTypingEffect = ({ text, speed = 30, onComplete, shouldAnimate = true, onTypingComplete }: UseTypingEffectProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // If no animation needed, show text immediately
    if (!shouldAnimate || !text) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start typing effect
    setIsTyping(true);
    setDisplayedText('');

    let currentIndex = 0;
    
    intervalRef.current = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        if (onComplete) onComplete();
        if (onTypingComplete) onTypingComplete();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, speed);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, speed, onComplete, shouldAnimate, onTypingComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { displayedText, isTyping };
};
