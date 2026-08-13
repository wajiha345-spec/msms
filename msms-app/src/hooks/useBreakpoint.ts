import { useWindowDimensions } from 'react-native';

// No responsive/breakpoint infrastructure existed before the desktop shell —
// this is the one shared source for it. Only meaningful on Platform.OS ===
// 'web' (desktop shell); mobile screens don't consume this.
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    width,
    isDesktop: width >= 1024,
    isTablet: width >= 768 && width < 1024,
  };
}
