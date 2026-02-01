import type { FeatureManifest } from '../types';

export const manifest: FeatureManifest = {
  key: 'about',
  title: 'درباره ما',
  routes: { desktop: '/about', mobile: '/about' },
  nav: {
    desktop: { group: 'main', label: 'درباره ما', icon: 'Info', order: 90 },
    mobile: { tab: 'more', label: 'درباره ما', icon: 'Info', order: 90 },
  },
  screens: { desktop: 'Desktop', mobile: 'Mobile', shared: undefined },
  flags: { enabled: true },
};
