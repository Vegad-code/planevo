'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlass, X, File, Target, GraduationCap, SpinnerGap, LockKey } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  type: 'task' | 'goal' | 'assignment';
  id: string;
  title: string;
  subtitle: string;
  due: string | null;
  href: string;
}

export default function AcademicSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (res.status === 403) {
        setError('Search limit reached. Upgrade for more.');
        setResults([]);
        return;
      }

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setError('Search unavailable. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  };

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    const url = result.type === 'assignment' 
      ? `/dashboard/briefing?assignmentId=${result.id}`
      : result.href;
    router.push(url);
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'task': return <File weight="bold" className="w-4 h-4" />;
      case 'goal': return <Target weight="bold" className="w-4 h-4" />;
      case 'assignment': return <GraduationCap weight="bold" className="w-4 h-4" />;
      default: return <File weight="bold" className="w-4 h-4" />;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-brand-300';
      case 'goal': return 'bg-accent-300';
      case 'assignment': return 'bg-success';
      default: return 'bg-surface-300';
    }
  };

  if (!mounted) return (
    <div className="h-[46px] w-full max-w-md bg-surface-100 border-2 border-surface-900 rounded-xl animate-pulse" />
  );

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        id="academic-search-trigger"
        className="flex items-center gap-3 px-4 py-2.5 bg-surface-100 border-2 border-surface-900 text-surface-500 hover:text-surface-900 hover:bg-surface-200 transition-all shadow-[3px_3px_0_0_var(--surface-900)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] rounded-xl w-full max-w-md"
      >
        <MagnifyingGlass weight="bold" className="w-4 h-4 shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest flex-1 text-left">Search tasks, goals, assignments…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 bg-surface-200 border border-surface-300 text-[10px] font-black text-surface-500 rounded">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-surface-900/60 backdrop-blur-sm z-[100]"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[101] px-4"
            >
              <div className="bg-surface-100 border-4 border-surface-900 shadow-[12px_12px_0_0_var(--surface-900)] rounded-3xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-6 py-5 border-b-2 border-surface-900">
                  {loading ? (
                    <SpinnerGap weight="bold" className="w-5 h-5 text-brand-500 animate-spin shrink-0" />
                  ) : (
                    <MagnifyingGlass weight="bold" className="w-5 h-5 text-surface-400 shrink-0" />
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search across all your data…"
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="flex-1 bg-transparent text-surface-900 font-bold text-lg placeholder:text-surface-400 outline-none"
                  />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-surface-400 hover:text-surface-900 transition-colors"
                  >
                    <X weight="bold" className="w-5 h-5" />
                  </button>
                </div>

                {/* Results */}
                <div className="max-h-[50vh] overflow-y-auto">
                  {error && (
                    <div className="px-6 py-8 text-center">
                      <LockKey weight="bold" className="w-10 h-10 text-accent-500 mx-auto mb-3" />
                      <p className="text-sm font-black text-surface-900 uppercase">{error}</p>
                      <p className="text-xs text-surface-500 font-bold mt-1">Flight Tier users get 100 searches/day.</p>
                    </div>
                  )}

                  {!error && results.length === 0 && query.length >= 2 && !loading && (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm font-black text-surface-500 uppercase">No results found for "{query}"</p>
                      <p className="text-xs text-surface-400 font-bold mt-2">Try a different search term, or connect more sensors in Settings.</p>
                    </div>
                  )}

                  {!error && query.length < 2 && (
                    <div className="px-6 py-10 text-center">
                      <p className="text-xs font-black text-surface-400 uppercase tracking-widest">
                        Type to search across tasks, goals, and Canvas assignments
                      </p>
                    </div>
                  )}

                  {results.length > 0 && (
                    <div className="py-2">
                      {results.map((result, i) => (
                        <motion.button
                          key={`${result.type}-${result.id}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => handleResultClick(result)}
                          className="flex items-center gap-4 w-full px-6 py-4 text-left hover:bg-surface-200 transition-colors group"
                        >
                          <div className={`w-8 h-8 ${typeColor(result.type)} border-2 border-surface-900 rounded-lg flex items-center justify-center text-surface-900 shrink-0 group-hover:scale-110 transition-transform`}>
                            {typeIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-surface-900 truncate">{result.title}</p>
                            <p className="text-xs font-bold text-surface-500">{result.subtitle}</p>
                          </div>
                          {result.due && (
                            <span className="text-[10px] font-black text-surface-400 uppercase shrink-0">
                              {new Date(result.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t-2 border-surface-900 bg-surface-200">
                  <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                    Academic Search · Powered by Ollie
                  </span>
                  <kbd className="px-2 py-0.5 bg-surface-300 border border-surface-400 text-[10px] font-black text-surface-500 rounded">
                    ESC
                  </kbd>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
