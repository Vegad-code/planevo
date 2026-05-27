import React from 'react';
import { Link } from '@phosphor-icons/react';

export interface IntegrationCardProps {
  id: string;
  title: string;
  description: string;
  status: 'connected' | 'available' | 'coming-soon';
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
    <div className="flex flex-col justify-between p-4 bg-white rounded-2xl border border-[#e6dcce] shadow-sm transition-all hover:shadow-md min-h-[190px]">
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-black text-lg overflow-hidden shrink-0">
            {icon}
          </div>
          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${
            status === 'connected' ? 'bg-[#D8E2D6] text-[#4A3F32]' : 
            status === 'available' ? 'bg-[#e6dcce] text-[#8a7b66]' :
            'bg-[#f4ece1] border border-[#e6dcce] text-[#8a7b66]'
          }`}>
            {status === 'coming-soon' ? 'COMING SOON' : status.toUpperCase()}
          </span>
        </div>
        <h4 className="font-semibold text-[#2A2118] text-sm mb-0.5">{title}</h4>
        <p className="text-[12px] font-medium text-[#8a7b66] line-clamp-2 leading-relaxed">
          {description}
        </p>
        {infoText && status === 'connected' && (
          <p className="text-[10px] font-bold text-[#8a7b66] mt-2 tracking-wide truncate">
            {infoText}
          </p>
        )}
      </div>
      
      <div className="flex gap-2.5 mt-3 pt-3 border-t border-[#e6dcce]/50">
        {status === 'connected' ? (
          <>
            <button 
              onClick={onManage}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white border border-[#e6dcce] text-[#4A3F32] rounded-lg hover:bg-[#f4ece1] transition-colors"
            >
              Manage
            </button>
            <button 
              onClick={onDisconnect}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C56B5E] hover:bg-[#C56B5E]/10 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : status === 'available' ? (
          <button 
            onClick={onConnect}
            className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-[#2A2118] text-white rounded-xl hover:bg-[#3d3026] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Link weight="bold" size={12} className="text-white/70" /> CONNECT →
          </button>
        ) : (
          <button 
            disabled
            className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest bg-[#f4ece1] text-[#8a7b66] rounded-xl cursor-not-allowed border border-[#e6dcce]"
          >
            Notify me
          </button>
        )}
      </div>
    </div>
  );
}
