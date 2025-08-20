import { useState, useEffect } from 'react';

interface UseTypingEffectProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  shouldAnimate?: boolean; // New prop to control animation
}

export const useTypingEffect = ({ text, speed = 30, onComplete, shouldAnimate = true }: UseTypingEffectProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!text) return;
    
    // If shouldAnimate is false, show text immediately
    if (!shouldAnimate) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }
    
    setIsTyping(true);
    setDisplayedText('');
    
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);

    return () => {
      clearInterval(timer);
      setIsTyping(false);
    };
  }, [text, speed, onComplete, shouldAnimate]);

  return { displayedText, isTyping };
};
