'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';
import { useState } from 'react';
import { testCanvasConnectionAction, saveCanvasCredentialsAction } from '@/lib/canvas/actions';
import { posthog } from '@/lib/posthog';

interface CanvasConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (url: string, token: string) => void;
}

export function CanvasConnectModal({ isOpen, onClose, onSuccess }: CanvasConnectModalProps) {
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    if (!canvasUrl || !canvasToken) {
      setResult({ success: false, message: 'Please provide both URL and Token.' });
      return;
    }
    setTesting(true);
    setResult(null);
    const isOk = await testCanvasConnectionAction(canvasUrl, canvasToken);
    if (isOk) {
      setResult({ success: true, message: 'Connection verified!' });
    } else {
      setResult({ success: false, message: 'Connection failed. Check URL and Token.' });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    if (!canvasUrl.startsWith('https://')) {
      setResult({ success: false, message: 'URL must start with https://' });
      return;
    }
    setSaving(true);
    const res = await saveCanvasCredentialsAction(canvasUrl, canvasToken);
    if (!res.success) {
      setResult({ success: false, message: res.error || 'Failed to save Canvas settings.' });
    } else {
      setResult({ success: true, message: 'Canvas connected successfully.' });
      posthog.capture('canvas_connected', { source: 'settings' });
      onSuccess(canvasUrl, canvasToken);
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#f4ece1] rounded-3xl p-8 max-w-lg w-full pointer-events-auto shadow-2xl border border-[#e6dcce] flex flex-col gap-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-serif italic text-[#2A2118]">Connect Canvas</h3>
                  <p className="text-sm font-medium text-[#8a7b66] mt-1">
                    Paste your Canvas URL and New Access Token below.
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors border border-[#e6dcce]"
                >
                  <X size={20} className="text-[#4A3F32]" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#8a7b66]">
                    Instance URL
                  </label>
                  <input
                    type="url"
                    value={canvasUrl}
                    onChange={(e) => setCanvasUrl(e.target.value)}
                    placeholder="https://canvas.instructure.com"
                    className="w-full bg-white border border-[#e6dcce] p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-[#D08741] transition-colors text-[#2A2118]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#8a7b66]">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={canvasToken}
                    onChange={(e) => setCanvasToken(e.target.value)}
                    placeholder="Paste your token..."
                    className="w-full bg-white border border-[#e6dcce] p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-[#D08741] transition-colors text-[#2A2118]"
                  />
                </div>

                {result && (
                  <div className={`p-4 text-xs font-bold rounded-xl border ${result.success ? 'bg-[#D8E2D6] border-[#4A3F32]/10 text-[#4A3F32]' : 'bg-[#F5D5D0] border-[#C56B5E]/10 text-[#C56B5E]'}`}>
                    {result.message}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#e6dcce]/50">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex-1 py-3 bg-white border border-[#e6dcce] text-[#2A2118] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !canvasUrl || !canvasToken}
                  className="flex-1 py-3 bg-[#2A2118] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#3d3026] transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
