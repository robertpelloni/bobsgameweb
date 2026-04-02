import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bobsgame.okgame',
  appName: "bob's game",
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
