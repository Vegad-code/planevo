'use client';

import { CircleNotch } from '@phosphor-icons/react';
import { SlackIcon, NotionIcon, LinearIcon, GoogleIcon } from '../icons/BrandIcons';

interface OAuthConnectingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: 'notion' | 'slack' | 'linear' | 'google' | null;
  error?: string | null;
  mode?: 'oauth' | 'sync';
}

export function OAuthConnectingModal({
  isOpen,
  onClose,
  provider,
  error,
  mode = 'oauth',
}: OAuthConnectingModalProps) {
  if (!isOpen || !provider) return null;

  const getProviderInfo = () => {
    switch (provider) {
      case 'notion': return { name: 'Notion', icon: <NotionIcon className="w-8 h-8 text-black" /> };
      case 'slack': return { name: 'Slack', icon: <SlackIcon className="w-8 h-8" /> };
      case 'linear': return { name: 'Linear', icon: <LinearIcon className="w-8 h-8" /> };
      case 'google': return { name: 'Google Calendar', icon: <GoogleIcon className="w-8 h-8" /> };
      default: return { name: 'Integration', icon: null };
    }
  };

  const { name, icon } = getProviderInfo();
  const isSync = mode === 'sync';
  const title = error
    ? isSync
      ? `Could not sync ${name}`
      : `Could not connect to ${name}`
    : isSync
      ? `Syncing ${name}`
      : `Connecting to ${name}`;
  const message = error
    ? error
    : isSync
      ? 'Pulling your latest items into Planevo. This usually takes a few seconds.'
      : "Please complete the authorization in the newly opened secure window. This popup will automatically close when you're done.";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-[#1A1A1A] border border-settings-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col items-center p-8 text-center">
        
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-inner mb-6 relative">
          {icon}
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#1A1A1A] rounded-full flex items-center justify-center border-4 border-[#1A1A1A]">
            <CircleNotch weight="bold" className="text-amber-500 animate-spin" size={16} />
          </div>
        </div>

        <h3 className="text-[22px] font-medium text-settings-text mb-2 leading-tight">
          {title}
        </h3>
        
        <p className={`text-[13px] font-medium leading-relaxed mb-8 px-4 ${error ? 'text-red-400' : 'text-settings-text-muted'}`}>
          {message}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 text-[11px] font-black uppercase tracking-widest text-settings-text bg-settings-card hover:bg-settings-border border border-settings-border rounded-xl transition-colors"
        >
          {error ? 'Close' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
