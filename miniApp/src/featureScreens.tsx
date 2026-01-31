/**
 * Registry-driven feature screens: lazy-loaded Desktop/Mobile per feature.
 * Add new feature entries here (or use scaffold script).
 */

import { lazy } from 'react';

export const featureScreens = {
  'test-page': {
    desktop: lazy(() => import('@features/test-page/ui/Desktop')),
    mobile: lazy(() => import('@features/test-page/ui/Mobile')),
  },
} as const;

export type FeatureKey = keyof typeof featureScreens;
