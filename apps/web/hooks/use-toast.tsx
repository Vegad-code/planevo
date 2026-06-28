'use client';

import { toast } from 'sonner';
import { BrunoMark } from '@/components/dashboard/home/BrunoMark';

const brunoToastClass =
  'border-l-[var(--toast-brand)] bg-[color-mix(in_srgb,var(--toast-brand)_14%,var(--toast-bg))]';

/**
 * Standardized toast hook for Planevo.
 * Uses sonner internally but allows for Bruno-themed customization.
 */
export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
    });
  },
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
    });
  },
  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
    });
  },
  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
    });
  },
  /**
   * Bruno-specific toast for encouragement or nudges
   */
  bruno: (message: string, description?: string) => {
    toast(message, {
      description,
      icon: <BrunoMark size={20} />,
      classNames: {
        toast: brunoToastClass,
      },
    });
  },
};
