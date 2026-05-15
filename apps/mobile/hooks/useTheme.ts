import { useColorScheme as _useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';

export function useTheme() {
  const scheme = _useColorScheme() ?? 'light';
  return {
    colors: Colors[scheme],
    isDark: scheme === 'dark',
    scheme,
  };
}
