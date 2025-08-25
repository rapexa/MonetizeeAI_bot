import { useState, useEffect, useRef } from 'react';

interface UseTypingEffectProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  shouldAnimate?: boolean; // New prop to control animation
}

export const useTypingEffect = ({ text, speed = 30, onComplete, shouldAnimate = true }: UseTypingEffectProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const previousTextRef = useRef('');
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!text) return;
    
    // If shouldAnimate is false, show text immediately
    if (!shouldAnimate) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // If this is the same text, don't restart animation
    if (previousTextRef.current === text) {
      return;
    }

    // If we're currently typing and the new text is longer, continue from where we left off
    if (isTyping && text.startsWith(displayedText) && text.length > displayedText.length) {
      // Continue typing from current position
      let index = displayedText.length;
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

      animationRef.current = timer;
      return () => {
        clearInterval(timer);
      };
    }

    // Start new animation
    setIsTyping(true);
    setDisplayedText('');
    previousTextRef.current = text;
    
    // Clear any existing animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
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

    animationRef.current = timer;

    return () => {
      clearInterval(timer);
      setIsTyping(false);
    };
  }, [text, speed, onComplete, shouldAnimate, displayedText, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  return { displayedText, isTyping };
};
