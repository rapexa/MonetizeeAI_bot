import type { FeatureManifest } from '../types';

export const manifest: FeatureManifest = {
  key: 'test-page',
  title: 'صفحه تست',
  routes: { desktop: '/test', mobile: '/test' },
  nav: {
    desktop: { group: 'main', label: 'تست', icon: 'TestTube', order: 100 },
    mobile: { tab: 'more', label: 'تست', icon: 'TestTube', order: 100 },
  },
  screens: { desktop: 'Desktop', mobile: 'Mobile', shared: undefined },
  flags: { enabled: true },
};
