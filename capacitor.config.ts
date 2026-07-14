import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xushuo.lk',
  appName: '叙说·春信',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['localhost']
  },
  plugins: {
    // CapacitorHttp 用于网络请求
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    backgroundColor: '#00000000',
    allowMixedContent: false
  }
};

export default config;
