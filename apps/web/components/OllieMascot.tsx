'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export type OlliePose = 
  | 'thinking' 
  | 'syncing' 
  | 'zen' 
  | 'grumpy' 
  | 'crystals' 
  | 'banner' 
  | 'calendar'
  | 'celebrate';

interface OllieMascotProps {
  pose: OlliePose;
  className?: string;
}

const POSE_MAP: Record<string, string> = {
  thinking: '/images/ollie/thinking.png',
  syncing: '/images/ollie/syncing.png',
  zen: '/images/ollie/zen.png',
  grumpy: '/images/ollie/grumpy.png',
  crystals: '/images/ollie/crystals.png',
  banner: '/images/ollie/banner.png',
  calendar: '/images/ollie/calendar.png',
  celebrate: '/images/ollie/zen.png', // Fallback to zen if celebrate.png is missing
};

export function OllieMascot({ pose, className = '' }: OllieMascotProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Floating Base Animation - Simulates "Breathing/Hovering" */}
      <motion.div
        animate={{
          y: [0, -8, 0],
          rotate: [0, 1, -1, 0]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pose}
            // Narrative "Fly-In" Transition
            initial={{ opacity: 0, x: 100, rotate: 15, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, rotate: -15, scale: 0.8 }}
            transition={{ 
              type: 'spring', 
              damping: 20, 
              stiffness: 100,
              mass: 1
            }}
            className="relative w-48 h-48 md:w-64 md:h-64"
          >
            <Image
              src={POSE_MAP[pose] || POSE_MAP.thinking}
              alt={`Ollie the Owl - ${pose}`}
              fill
              className="object-contain"
              priority
            />
            
            {/* Subtle "Alive" Pulse for specific poses */}
            {pose === 'syncing' && (
              <motion.div 
                animate={{ opacity: [0, 0.5, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 bg-brand-500/10 rounded-full blur-2xl"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Dynamic Shadow that scales with height */}
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.08, 0.15]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-6 w-32 h-4 bg-black blur-xl rounded-full"
        />
      </motion.div>
    </div>
  );
}
