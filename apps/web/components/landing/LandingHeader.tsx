'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { PlanevoLogo } from '@/components/PlanevoLogo';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BrunoMark = ({ size = 28, mood = 'normal' }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} style={{ flex: 'none' }}>
    <circle cx="14" cy="14" r="7" fill="var(--color-bruno-deep)" />
    <circle cx="34" cy="14" r="7" fill="var(--color-bruno-deep)" />
    <circle cx="14" cy="14" r="3.2" fill="var(--color-belly)" />
    <circle cx="34" cy="14" r="3.2" fill="var(--color-belly)" />
    <circle cx="24" cy="26" r="16" fill="var(--color-bruno)" />
    <ellipse cx="24" cy="30" rx="9" ry="7" fill="var(--color-belly)" />
    <circle cx="19" cy="23" r="1.7" fill="var(--color-bruno-ink)" />
    <circle cx="29" cy="23" r="1.7" fill="var(--color-bruno-ink)" />
    <ellipse cx="24" cy="28" rx="1.8" ry="1.3" fill="var(--color-bruno-ink)" />
    {mood === 'happy' && (
      <path d="M 21 32 Q 24 34 27 32" stroke="var(--color-bruno-ink)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    )}
  </svg>
);

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Product', href: '#pillars' },
    { name: 'How it works', href: '#magic' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'For students', href: '#pricing' },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'py-4 bg-[var(--color-cream)]/90 backdrop-blur-md border-b border-[var(--color-line)] shadow-sm' 
          : 'py-6 bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div 
            whileHover={{ rotate: [-10, 10, -10, 0] }}
            className="flex items-center"
          >
            <PlanevoLogo size={32} gapColor="var(--color-paper)" />
          </motion.div>
          <span className="font-serif text-[28px] hidden sm:flex items-baseline tracking-tight font-normal leading-none text-[var(--color-ink)] select-none">
            <span className="font-bold">Plan</span>
            <span className="italic font-serif">evo</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link, index) => (
            <div key={link.name} className="flex items-center">
              <Link 
                href={link.href}
                className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-honey)] transition-colors relative group uppercase tracking-widest font-mono"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--color-honey)] transition-all group-hover:w-full" />
              </Link>
              {index < navLinks.length - 1 && (
                <span className="w-1 h-1 rounded-full bg-[var(--color-ink)] opacity-[0.25] ml-6 pointer-events-none" />
              )}
            </div>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-5">
          <Link 
            href="/login" 
            className="text-[15px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors px-2 py-1.5"
          >
            Sign in
          </Link>
          <Button 
            className="bg-[var(--color-ink)] text-[var(--color-cream)] text-[14px] font-semibold py-5.5 px-6 border-none shadow-none hover:bg-[var(--color-ink-2)] transition-all rounded-full font-sans gap-1"
            asChild
          >
            <Link href="/onboarding">
              Start free <span className="text-base font-normal">-&gt;</span>
            </Link>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-[var(--color-ink)]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X size={32} weight="bold" /> : <List size={32} weight="bold" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-[var(--color-cream)] border-b border-[var(--color-line)] shadow-xl p-8 md:hidden flex flex-col gap-6"
          >
            {navLinks.map((link) => (
              <Link 
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="font-serif font-bold text-2xl text-[var(--color-ink)] tracking-tight"
              >
                {link.name}
              </Link>
            ))}
            <hr className="border-[var(--color-line)]" />
            <div className="flex flex-col gap-4">
              <Link 
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="font-mono font-medium text-lg uppercase tracking-widest text-[var(--color-ink-soft)]"
              >
                Sign In
              </Link>
              <Button 
                size="lg"
                className="w-full font-mono font-bold uppercase tracking-widest py-6 border-none shadow-none bg-[var(--color-ink)] text-[var(--color-cream)] rounded-full hover:bg-[var(--color-ink-2)]"
                asChild
              >
                <Link href="/onboarding" onClick={() => setMobileMenuOpen(false)}>
                  Get Started Free
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
