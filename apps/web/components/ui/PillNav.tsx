'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import './PillNav.css';

export interface PillNavItem {
  label: string;
  href: string;
  ariaLabel?: string;
}

interface PillNavProps {
  logo?: string;
  logoEmoji?: string;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;

  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
}

const PillNav = ({
  logo,
  logoEmoji = '🦉',
  logoAlt = 'Planevo Logo',
  items,
  activeHref: manualActiveHref,
  className = '',

  baseColor = '#22201e',
  pillColor = '#ffffff',
  hoveredPillTextColor = '#ffffff',
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = true
}: PillNavProps) => {
  const pathname = usePathname();
  const activeHref = manualActiveHref || pathname;
  
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    onMobileMenuClick?.();
  };

  const cssVars = {
    '--base': baseColor,
    '--pill-bg': pillColor,
    '--hover-text': hoveredPillTextColor,
    '--pill-text': resolvedPillTextColor
  } as React.CSSProperties;

  return (
    <div className={`pill-nav-container ${className}`}>
      <nav className="pill-nav" aria-label="Primary" style={cssVars}>
        <Link
          className="pill-logo"
          href="/"
          aria-label="Home"
        >
          <motion.div
            initial={initialLoadAnimation ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ rotate: 360, scale: 1.2 }}
            transition={{ duration: 0.8, ease: 'backOut', delay: 0.2 }}
            className="flex items-center justify-center w-full h-full"
          >
            {logo ? (
              <Image src={logo} alt={logoAlt} width={32} height={32} unoptimized />
            ) : (
              <span className="logo-content">{logoEmoji}</span>
            )}
          </motion.div>
        </Link>

        <motion.div 
          className="pill-nav-items desktop-only"
          initial={initialLoadAnimation ? { width: 0, opacity: 0 } : false}
          animate={{ width: 'auto', opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
        >
          <ul className="pill-list" role="menubar">
            {items.map((item, i) => (
              <li key={item.href || `item-${i}`} role="none">
                <Link
                  role="menuitem"
                  href={item.href}
                  className={`pill${activeHref === item.href ? ' is-active' : ''}`}
                  aria-label={item.ariaLabel || item.label}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <motion.span
                    className="hover-circle"
                    aria-hidden="true"
                    initial={false}
                    animate={{ 
                      scale: hoveredIndex === i ? 1.2 : 0,
                    }}
                    transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                    style={{ 
                      width: '150px', // Fallback sizing since we're not doing manual math anymore
                      height: '150px',
                      x: '-50%',
                      bottom: '-40px'
                    }}
                  />
                  <span className="label-stack">
                    <motion.span 
                      className="pill-label"
                      animate={{ y: hoveredIndex === i ? -40 : 0 }}
                      transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                    >
                      {item.label}
                    </motion.span>
                    <motion.span 
                      className="pill-label-hover" 
                      aria-hidden="true"
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ 
                        y: hoveredIndex === i ? 0 : 40,
                        opacity: hoveredIndex === i ? 1 : 0
                      }}
                      transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                    >
                      {item.label}
                    </motion.span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>

        <button
          className="mobile-menu-button mobile-only"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <motion.span 
            className="hamburger-line" 
            animate={{ rotate: isMobileMenuOpen ? 45 : 0, y: isMobileMenuOpen ? 3 : 0 }}
          />
          <motion.span 
            className="hamburger-line" 
            animate={{ rotate: isMobileMenuOpen ? -45 : 0, y: isMobileMenuOpen ? -3 : 0 }}
          />
        </button>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            className="mobile-menu-popover mobile-only" 
            style={{ ...cssVars, visibility: 'visible' }}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: 'backOut' }}
          >
        <ul className="mobile-menu-list">
          {items.map((item, i) => (
            <li key={item.href || `mobile-item-${i}`}>
              <Link
                href={item.href}
                className={`mobile-menu-link${activeHref === item.href ? ' is-active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

export default PillNav;
