import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bobsgame.okengine',
  appName: "bob's game (Omni-Engine)",
  webDir: 'dist/renderer',
  server: {
    androidScheme: 'https'
  }
};

export default config;
