/**
 * Feature registry: central list of feature manifests and helpers.
 * Add new features here after scaffolding.
 */

import type { FeatureManifest, Platform } from './types';

// Import manifests from each feature (add new features here)
import { manifest as testPageManifest } from './test-page/manifest';
import { manifest as aboutManifest } from './about/manifest';

const allManifests: FeatureManifest[] = [
  testPageManifest,
  aboutManifest,
];

export { allManifests };
export type { FeatureManifest, Platform };

export function getEnabledFeatures(opts: { platform: Platform }): FeatureManifest[] {
  const { platform } = opts;
  return allManifests.filter((m) => {
    if (m.flags?.enabled === false) return false;
    const route = platform === 'desktop' ? m.routes.desktop : m.routes.mobile;
    return Boolean(route);
  });
}

export function getFeatureByKey(key: string): FeatureManifest | undefined {
  return allManifests.find((m) => m.key === key);
}
