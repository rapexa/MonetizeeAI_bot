import { useState, useEffect, useRef } from 'react';

interface UseTypingEffectProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  shouldAnimate?: boolean;
}

export const useTypingEffect = ({ text, speed = 30, onComplete, shouldAnimate = true }: UseTypingEffectProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const currentTextRef = useRef(text);

  useEffect(() => {
    // If no animation needed, show text immediately
    if (!shouldAnimate || !text) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // If this is the same text and we're already typing, don't restart
    if (currentTextRef.current === text && isTyping) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset state for new text
    setDisplayedText('');
    setIsTyping(true);
    currentTextRef.current = text;

    let currentIndex = 0;
    
    intervalRef.current = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        if (onComplete) onComplete();
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
  }, [text, speed, onComplete, shouldAnimate]);

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
