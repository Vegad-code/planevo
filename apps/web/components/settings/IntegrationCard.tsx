import React from 'react';
import { Link } from '@phosphor-icons/react';

export interface IntegrationCardProps {
  id: string;
  title: string;
  description: string;
  status: 'connected' | 'available' | 'coming-soon' | 'error' | 'upgrade';
  infoText?: string;
  icon: React.ReactNode;
  onConnect?: () => void;
  onManage?: () => void;
  onDisconnect?: () => void;
}

export function IntegrationCard({
  id,
  title,
  description,
  status,
  infoText,
  icon,
  onConnect,
  onManage,
  onDisconnect
}: IntegrationCardProps) {
  return (
    <div className="flex flex-col justify-between p-4 bg-settings-card rounded-2xl border border-settings-border shadow-sm transition-all hover:shadow-md min-h-[190px]">
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-black text-lg overflow-hidden shrink-0">
            {icon}
          </div>
          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${
            status === 'connected' ? 'bg-[var(--color-sage-soft)] text-[var(--color-ink-soft)]' :
            status === 'error' ? 'bg-[var(--color-rose-soft)] text-[var(--color-rose)] border border-[#C56B5E]/20' :
            status === 'available' ? 'bg-settings-border text-settings-text-muted' :
            'bg-settings-bg border border-settings-border text-settings-text-muted'
          }`}>
            {status === 'coming-soon' ? 'COMING SOON' : status.toUpperCase()}
          </span>
        </div>
        <h4 className="font-semibold text-settings-text text-sm mb-0.5">{title}</h4>
        <p className="text-[12px] font-medium text-settings-text-muted line-clamp-2 leading-relaxed">
          {description}
        </p>
        {infoText && status === 'connected' && (
          <p className="text-[10px] font-bold text-settings-text-muted mt-2 tracking-wide truncate">
            {infoText}
          </p>
        )}
      </div>

      <div className="flex gap-2.5 mt-3 pt-3 border-t border-settings-border/50">
        {status === 'connected' || status === 'error' ? (
          <>
            <button
              onClick={onManage}
              className={`py-1.5 text-[10px] font-bold uppercase tracking-wider bg-settings-card border ${status === 'error' ? 'border-[#C56B5E]/30 text-[var(--color-rose)]' : 'border-settings-border text-[var(--color-ink-soft)]'} rounded-lg hover:bg-settings-bg transition-colors ${onDisconnect ? 'px-3' : 'flex-1 w-full'}`}
            >
              {status === 'error' ? 'Fix Error' : 'Manage'}
            </button>
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-rose)] hover:bg-[var(--color-rose)]/10 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            )}
          </>
        ) : status === 'available' ? (
          <button
            onClick={onConnect}
            className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-settings-text text-white rounded-xl hover:bg-[#3d3026] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Link weight="bold" size={12} className="text-white/70" /> CONNECT →
          </button>
        ) : (
          <button
            disabled
            className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest bg-settings-bg text-settings-text-muted rounded-xl cursor-not-allowed border border-settings-border"
          >
            Notify me
          </button>
        )}
      </div>
    </div>
  );
}
