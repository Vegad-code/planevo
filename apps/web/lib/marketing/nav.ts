import type { NavIconKey } from './nav-icons';

export interface NavLink {
  label: string;
  href: string;
  description?: string;
  icon?: NavIconKey;
}

export interface NavDropdown {
  id: string;
  label: string;
  eyebrow: string;
  items: NavLink[];
}

export const PRODUCT_DROPDOWN: NavDropdown = {
  id: 'product',
  label: 'Product',
  eyebrow: 'Explore Planevo',
  items: [
    {
      label: 'Features',
      href: '/features',
      description: 'Calendar, notes, tasks, and Command',
      icon: 'SquaresFour',
    },
    {
      label: 'Command',
      href: '/features#command',
      description: 'Dump chaos. Get a calm board.',
      icon: 'Command',
    },
    {
      label: 'Plan my day',
      href: '/features#calendar',
      description: 'Work placed in real free time',
      icon: 'CalendarDots',
    },
    {
      label: 'Tasks',
      href: '/features#tasks',
      description: 'A backlog that stays honest',
      icon: 'ListChecks',
    },
    {
      label: 'Notes',
      href: '/features#notes',
      description: 'Capture, organize, flashcards',
      icon: 'Notebook',
    },
    {
      label: 'Bruno',
      href: '/features#bruno',
      description: 'Your AI companion with approval',
      icon: 'Sparkle',
    },
    {
      label: 'How it works',
      href: '/#capture',
      description: 'See capture, board, and plan my day',
      icon: 'Waveform',
    },
    {
      label: 'Pricing',
      href: '/pricing',
      description: 'Free forever — Pro when you outgrow it',
      icon: 'CurrencyCircleDollar',
    },
    {
      label: 'FAQ',
      href: '/pricing#faq',
      description: 'Fair questions, answered',
      icon: 'Question',
    },
  ],
};

export const COMPANY_DROPDOWN: NavDropdown = {
  id: 'company',
  label: 'Company',
  eyebrow: 'About Planevo',
  items: [
    {
      label: 'About',
      href: '/about',
      description: 'Our mission and story',
      icon: 'Info',
    },
    {
      label: 'Privacy Policy',
      href: '/privacy',
      description: 'Your data, your control',
      icon: 'ShieldCheck',
    },
    {
      label: 'Terms of Service',
      href: '/terms',
      description: 'The fine print',
      icon: 'Scales',
    },
    {
      label: 'Cookie Policy',
      href: '/cookies',
      description: 'How we use cookies',
      icon: 'Cookie',
    },
  ],
};

/** Top-level route links in the center nav bar */
export const ROUTE_NAV_LINKS: NavLink[] = [{ label: 'Pricing', href: '/pricing' }];

export const FOOTER_COLUMNS: Array<{
  title: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Command', href: '/features#command' },
      { label: 'Plan my day', href: '/features#calendar' },
      { label: 'Bruno', href: '/features#bruno' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Integrations',
    links: [
      { label: 'Canvas LMS', href: '/signup' },
      { label: 'Google Calendar', href: '/signup' },
      { label: 'Tasks & notes', href: '/signup' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Start free', href: '/signup' },
      { label: 'Sign in', href: '/login' },
      { label: 'For students', href: '/pricing#edu' },
      { label: 'FAQ', href: '/pricing#faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
];

export const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
];

/** Section ids on features page for scroll-spy */
export const FEATURE_TAB_IDS = ['command', 'calendar', 'tasks', 'notes'] as const;

export type FeatureTabId = (typeof FEATURE_TAB_IDS)[number];
