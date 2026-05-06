import { toast } from 'sonner';

/**
 * Standardized toast hook for Plan Pilot.
 * Uses sonner internally but allows for Ollie-themed customization.
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
   * Ollie-specific toast for encouragement or nudges
   */
  ollie: (message: string, description?: string) => {
    toast(message, {
      description,
      icon: '🦉',
    });
  },
};
