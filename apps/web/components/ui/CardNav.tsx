'use client';

import { useState, FC, ReactNode } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight } from '@phosphor-icons/react';
import './CardNav.css';

interface LinkItem {
  label: string;
  ariaLabel?: string;
  href?: string;
}

interface CardNavItem {
  label: string;
  bgColor: string;
  textColor: string;
  links: LinkItem[];
}

interface CardNavProps {
  logo?: string | ReactNode;
  logoAlt?: string;
  items: CardNavItem[];
  className?: string;

  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

const CardNav: FC<CardNavProps> = ({
  logo,
  logoAlt = 'Logo',
  items,
  className = '',

  baseColor = '#fff',
  menuColor,
  buttonBgColor,
  buttonTextColor,
  ctaText = 'Get Started',
  onCtaClick
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleMenu = () => {
    setIsExpanded(!isExpanded);
    setIsHamburgerOpen(!isHamburgerOpen);
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <motion.nav 
        initial={false}
        animate={{ 
          height: isExpanded ? 'auto' : 60,
        }}
        transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
        className={`card-nav ${isExpanded ? 'open' : ''} overflow-hidden`} 
        style={{ backgroundColor: baseColor }}
      >
        <div className="card-nav-top">
          <div
            className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            role="button"
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            tabIndex={0}
            style={{ color: menuColor || '#000' }}
          >
            <motion.div 
              className="hamburger-line" 
              animate={{ rotate: isHamburgerOpen ? 45 : 0, y: isHamburgerOpen ? 3 : 0 }}
            />
            <motion.div 
              className="hamburger-line" 
              animate={{ rotate: isHamburgerOpen ? -45 : 0, y: isHamburgerOpen ? -3 : 0 }}
            />
          </div>

          <div className="logo-container">
            {typeof logo === 'string' ? (
              <Image src={logo} alt={logoAlt} className="logo" width={32} height={32} unoptimized />
            ) : (
              logo
            )}
          </div>

          <button
            type="button"
            className="card-nav-cta-button"
            style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
            onClick={onCtaClick}
          >
            {ctaText}
          </button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              className="card-nav-content" 
              initial="collapsed"
              animate="open"
              exit="collapsed"
              variants={{
                open: { transition: { staggerChildren: 0.08 } },
                collapsed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
              }}
            >
              {(items || []).slice(0, 3).map((item, idx) => (
                <motion.div
                  key={`${item.label}-${idx}`}
                  className="nav-card"
                  variants={{
                    open: { y: 0, opacity: 1 },
                    collapsed: { y: 20, opacity: 0 }
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{ backgroundColor: item.bgColor, color: item.textColor }}
                >
                  <div className="nav-card-label">{item.label}</div>
                  <div className="nav-card-links">
                    {item.links?.map((lnk, i) => (
                      <a key={`${lnk.label}-${i}`} className="nav-card-link" href={lnk.href} aria-label={lnk.ariaLabel}>
                        <ArrowUpRight className="nav-card-link-icon" aria-hidden="true" />
                        {lnk.label}
                      </a>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
};

export default CardNav;
