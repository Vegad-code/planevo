'use client';

import { useEffect, useRef } from 'react';
import { useFocusStore } from '@/store/useFocusStore';
import { FOCUS_SOUNDS } from '@/lib/audio/sounds';

export default function FocusAudioPlayer() {
  const { selectedSound, timerState, volume } = useFocusStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio object once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle Play/Pause and Source change
  useEffect(() => {
    if (!audioRef.current) return;

    const sound = FOCUS_SOUNDS.find(s => s.id === selectedSound);
    
    // If no sound selected or session not running, pause and return
    if (!sound || sound.id === 'none' || timerState !== 'running') {
      audioRef.current.pause();
      return;
    }

    // Update source if changed
    if (audioRef.current.src !== sound.url) {
      audioRef.current.src = sound.url;
      audioRef.current.load();
    }

    // Try to play
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        // Browser blocked autoplay (common if user hasn't clicked anything)
        console.warn('Focus Audio: Playback blocked by browser policy.', err);
      });
    }

  }, [selectedSound, timerState]);

  return null;
}
