export interface SettingsTab {
  id: string;
  name: string;
  path: string;
  keywords: string[];
}

export const settingsRegistry: SettingsTab[] = [
  {
    id: 'profile',
    name: 'Profile',
    path: '/dashboard/settings/profile',
    keywords: ['profile', 'name', 'timezone', 'account', 'identity'],
  },
  {
    id: 'integrations',
    name: 'Sources & Integrations',
    path: '/dashboard/settings/integrations',
    keywords: ['integrations', 'sources', 'canvas', 'google', 'calendar', 'notion', 'slack', 'linear', 'sync'],
  },
  {
    id: 'calendar',
    name: 'Calendar & Planning',
    path: '/dashboard/settings/calendar',
    keywords: ['calendar', 'planning', 'time', 'blocks', 'breaks', 'scheduling'],
  },
  {
    id: 'bruno',
    name: 'Bruno preferences',
    path: '/dashboard/settings/bruno',
    keywords: ['bruno', 'preferences', 'ai', 'prompt', 'memory', 'style', 'personality'],
  },
  {
    id: 'appearance',
    name: 'Appearance',
    path: '/dashboard/settings/appearance',
    keywords: ['appearance', 'theme', 'dark mode', 'light mode', 'sepia', 'colors', 'visual'],
  },
  {
    id: 'notifications',
    name: 'Notifications',
    path: '/dashboard/settings/notifications',
    keywords: ['notifications', 'alerts', 'push', 'quiet hours', 'reminders'],
  },
  {
    id: 'membership',
    name: 'Membership',
    path: '/dashboard/settings/membership',
    keywords: ['membership', 'billing', 'plan', 'subscription', 'upgrade', 'stripe', 'payment'],
  },
  {
    id: 'privacy',
    name: 'Data & privacy',
    path: '/dashboard/settings/privacy',
    keywords: ['data', 'privacy', 'export', 'delete', 'terms', 'cookies', 'legal'],
  },
];
