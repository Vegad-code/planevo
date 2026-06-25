import type { SidebarStyleId } from '@/components/providers/AppearanceProvider';

export function getSidebarMainOffset(style: SidebarStyleId, collapsed: boolean): string {
  if (style === 'floating') {
    return collapsed ? 'lg:ml-[110px]' : 'lg:ml-[320px]';
  }
  return collapsed ? 'lg:ml-17' : 'lg:ml-60';
}
