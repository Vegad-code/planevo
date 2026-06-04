'use client';

import { X, Star } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UpgradeToProModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export function UpgradeToProModal({ isOpen, onClose, featureName }: UpgradeToProModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    setIsLoading(true);
    router.push('/pricing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-[#1A1A1A] border border-settings-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-5 border-b border-settings-border flex justify-between items-center bg-settings-card">
          <div className="flex items-center gap-2">
            <Star weight="fill" className="text-amber-400" size={20} />
            <h3 className="text-lg font-medium text-settings-text">
              Pro Feature
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-settings-text-muted hover:text-settings-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <p className="text-settings-text text-[15px] leading-relaxed">
              The <strong className="text-white font-semibold">{featureName}</strong> integration is available exclusively on the <span className="font-serif italic text-amber-400">Builder</span> plan.
            </p>
            <p className="text-settings-text-muted text-[14px] leading-relaxed">
              Upgrade to unlock premium integrations, advanced AI insights, unlimited ghosts blocks, and more powerful productivity features.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-settings-text hover:text-white transition-colors"
            >
              Maybe later
            </button>
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="px-5 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'View Plans'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
