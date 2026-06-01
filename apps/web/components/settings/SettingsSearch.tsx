'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

import { settingsRegistry } from '@/lib/settings/registry';

export default function SettingsSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = settingsRegistry.filter((opt) =>
    opt.name.toLowerCase().includes(query.toLowerCase()) ||
    opt.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2 rounded-full border border-settings-border bg-settings-card text-settings-text-muted hover:border-settings-text-muted transition-colors w-64 justify-between shadow-sm"
      >
        <div className="flex items-center gap-2">
          <MagnifyingGlass weight="bold" />
          <span className="text-xs font-bold">Search settings...</span>
        </div>
        <kbd className="text-[10px] font-black font-mono border border-settings-border rounded px-1.5 py-0.5 text-settings-text-muted">⌘ K</kbd>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="absolute top-12 right-0 w-80 bg-settings-bg border border-settings-border rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-settings-border">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent border-none outline-none text-sm font-bold text-settings-text placeholder:text-settings-text-muted"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.path}
                    onClick={() => {
                      router.push(opt.path);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-settings-text hover:bg-settings-card-hover transition-colors"
                  >
                    {opt.name}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs font-bold text-settings-text-muted">
                  No results found.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
