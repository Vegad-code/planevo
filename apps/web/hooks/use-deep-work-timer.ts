import { useState, useEffect, useRef, useCallback } from 'react';

export function useDeepWorkTimer(initialMinutes: number, onComplete?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);

  useEffect(() => {
    // If the timer is reset with a new initialMinutes (e.g. from data loading), update it
    if (!isActive && accumulatedTimeRef.current === 0) {
      setSecondsLeft(initialMinutes * 60);
    }
  }, [initialMinutes, isActive]);

  useEffect(() => {
    let intervalId: any;

    if (isActive) {
      // Pin the absolute start point when played/resumed
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      intervalId = setInterval(() => {
        const totalElapsedMs = Date.now() - startTimeRef.current! + (accumulatedTimeRef.current * 1000);
        const totalElapsedSec = Math.floor(totalElapsedMs / 1000);
        
        const remaining = (initialMinutes * 60) - totalElapsedSec;
        
        if (remaining <= 0) {
          setSecondsLeft(0);
          setIsActive(false);
          setIsFinished(true);
          clearInterval(intervalId);
          if (onComplete) {
            onComplete();
          }
        } else {
          setSecondsLeft(remaining);
        }
      }, 100);
    }

    return () => clearInterval(intervalId);
  }, [isActive, initialMinutes, onComplete]);

  const handlePause = useCallback(() => {
    if (isActive && startTimeRef.current) {
      const sessionElapsed = (Date.now() - startTimeRef.current) / 1000;
      accumulatedTimeRef.current += sessionElapsed;
      startTimeRef.current = null;
    }
    setIsActive(false);
  }, [isActive]);

  const handleStart = useCallback(() => {
    setIsActive(true);
  }, []);

  const handleReset = useCallback(() => {
    setIsActive(false);
    setIsFinished(false);
    startTimeRef.current = null;
    accumulatedTimeRef.current = 0;
    setSecondsLeft(initialMinutes * 60);
  }, [initialMinutes]);

  // Calculate total focus time dynamically
  const totalElapsedFocusTime = (initialMinutes * 60) - secondsLeft;

  return { 
    secondsLeft, 
    isActive, 
    isFinished,
    handleStart, 
    handlePause, 
    handleReset,
    totalElapsedFocusTime 
  };
}
