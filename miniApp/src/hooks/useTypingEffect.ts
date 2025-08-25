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
  const timerRef = useRef<number | null>(null);
  const textRef = useRef(text);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If no animation needed, show text immediately
    if (!shouldAnimate || !text) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // Reset state for new text
    setDisplayedText('');
    setIsTyping(true);
    textRef.current = text;

    let currentIndex = 0;
    
    const typeNextChar = () => {
      if (currentIndex < text.length && textRef.current === text) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
        timerRef.current = setTimeout(typeNextChar, speed);
      } else {
        setIsTyping(false);
        if (onComplete) onComplete();
      }
    };

    // Start typing
    timerRef.current = setTimeout(typeNextChar, speed);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, speed, onComplete, shouldAnimate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { displayedText, isTyping };
};
