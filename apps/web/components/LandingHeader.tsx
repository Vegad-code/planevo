'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown, List, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  {
    label: 'Product',
    items: [
      { label: 'Features', href: '#features', description: 'Everything you need to stay focused.' },
      { label: 'How it Works', href: '#how-it-works', description: 'Our 3-step cognitive load removal.' },
      { label: 'Canvas Sync', href: '#canvas', description: 'Automatic assignment importing.' },
    ],
  },
  {
    label: 'AI',
    items: [
      { label: 'Ollie Co-pilot', href: '#ollie', description: 'Meet your nocturnal academic guide.' },
      { label: 'AI Planning', href: '#planning', description: 'Daily schedules built for your brain.' },
    ],
  },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Resources', href: '#resources' },
];

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-surface-900/90 backdrop-blur-md border-b border-surface-800 py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">🦉</span>
          <span className="font-black text-xl text-white uppercase tracking-tighter">
            Plan Pilot
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <div
              key={link.label}
              className="relative"
              onMouseEnter={() => setActiveDropdown(link.label)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              {link.items ? (
                <button className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-surface-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  {link.label}
                  <CaretDown weight="bold" className={`w-3 h-3 transition-transform ${activeDropdown === link.label ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <Link
                  href={link.href!}
                  className="px-4 py-2 text-sm font-bold text-surface-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              )}

              {/* Dropdown Menu */}
              <AnimatePresence>
                {link.items && activeDropdown === link.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-surface-900 border border-surface-800 shadow-2xl rounded-xl p-2 overflow-hidden"
                  >
                    {link.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex flex-col p-3 hover:bg-white/5 rounded-lg transition-colors group"
                      >
                        <span className="text-sm font-black text-white group-hover:text-brand-400 transition-colors">
                          {item.label}
                        </span>
                        {item.description && (
                          <span className="text-xs text-surface-500 font-medium">
                            {item.description}
                          </span>
                        )}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-bold text-surface-400 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-sm font-black bg-white text-surface-900 hover:bg-brand-400 hover:text-white transition-all rounded-lg"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={28} weight="bold" /> : <List size={28} weight="bold" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-surface-900 border-b border-surface-800 overflow-hidden"
          >
            <div className="px-6 py-8 flex flex-col gap-6">
              {NAV_LINKS.map((link) => (
                <div key={link.label} className="flex flex-col gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-surface-600">
                    {link.label}
                  </span>
                  {link.items ? (
                    <div className="flex flex-col gap-3 pl-2">
                      {link.items.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-lg font-bold text-white hover:text-brand-400 transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      href={link.href!}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-bold text-white hover:text-brand-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
              <div className="flex flex-col gap-4 pt-6 border-t border-surface-800">
                <Link
                  href="/login"
                  className="flex items-center justify-center w-full py-4 text-lg font-bold text-white border-2 border-surface-800 rounded-xl"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center justify-center w-full py-4 text-lg font-black bg-white text-surface-900 rounded-xl"
                >
                  Start free
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
