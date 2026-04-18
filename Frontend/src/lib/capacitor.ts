/**
 * Capacitor platform detection utilities.
 * These are safe to import anywhere — they return false on the web.
 */

/**
 * Returns true if the app is running inside a native Capacitor shell
 * (Android/iOS), false on the web.
 */
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return cap?.isNativePlatform?.() ?? false;
};

/**
 * Returns the native platform name ('android', 'ios') or 'web'.
 */
export const getPlatform = (): 'android' | 'ios' | 'web' => {
  if (typeof window === 'undefined') return 'web';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return cap?.getPlatform?.() ?? 'web';
};
