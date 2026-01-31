/**
 * Feature portability: shared contract for all features.
 * Used by registry and by feature modules.
 */

export type FeatureManifest = {
  key: string;
  title: string;
  routes: { desktop?: string; mobile?: string };
  nav?: {
    desktop?: { group?: string; label?: string; icon?: string; order?: number };
    mobile?: { tab?: string; label?: string; icon?: string; order?: number };
  };
  screens: { desktop?: string; mobile?: string; shared?: string };
  flags?: { enabled?: boolean; roles?: string[] };
};

export type Platform = 'desktop' | 'mobile';
