import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.absolutrip.app',
  appName: 'AbsoluTrip',

  // ❌ REMOVE this for now
  // webDir: 'out',

  server: {
    url: 'http://10.0.2.2:3000', // your Next.js dev server
    cleartext: true
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a192f',
      showSpinner: false,
    },
  },
};

export default config;