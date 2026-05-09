'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

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
    { name: 'Features', href: '#features' },
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'Pricing', href: '/pricing' },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'py-4 bg-background/80 backdrop-blur-md border-b-2 border-surface-900 shadow-sm' 
          : 'py-6 bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div 
            whileHover={{ rotate: [-10, 10, -10, 0] }}
            className="text-3xl"
          >
            🦉
          </motion.div>
          <span className="font-black text-surface-900 uppercase tracking-widest text-lg hidden sm:block">
            Plan Pilot
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.name}
              href={link.href}
              className="font-black text-sm uppercase tracking-widest text-surface-600 hover:text-surface-900 transition-colors relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-500 transition-all group-hover:w-full" />
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link 
            href="/login" 
            className="font-black text-sm uppercase tracking-widest text-surface-900 hover:text-brand-500 transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Button 
            className="font-black uppercase tracking-widest text-xs py-5 px-6 border-2 border-surface-900 shadow-[4px_4px_0px_0px_var(--surface-900)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            asChild
          >
            <Link href="/signup">
              Get Started <ArrowRight weight="bold" className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-surface-900"
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
            className="absolute top-full left-0 right-0 bg-background border-b-2 border-surface-900 shadow-xl p-8 md:hidden flex flex-col gap-6"
          >
            {navLinks.map((link) => (
              <Link 
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="font-black text-2xl uppercase tracking-widest text-surface-900"
              >
                {link.name}
              </Link>
            ))}
            <hr className="border-surface-200" />
            <div className="flex flex-col gap-4">
              <Link 
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="font-black text-lg uppercase tracking-widest text-surface-600"
              >
                Sign In
              </Link>
              <Button 
                size="lg"
                className="w-full font-black uppercase tracking-widest py-6 border-2 border-surface-900 shadow-[6px_6px_0px_0px_var(--surface-900)]"
                asChild
              >
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
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
