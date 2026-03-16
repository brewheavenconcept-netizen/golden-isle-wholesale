import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goldenisle.cms',
  appName: 'Golden Isle CMS',
  webDir: 'out',
  server: {
    url: 'https://goldenisle-wholesale.vercel.app/admin/login?ref=giv',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
