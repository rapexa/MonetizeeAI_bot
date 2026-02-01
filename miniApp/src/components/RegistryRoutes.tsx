/**
 * Registry-driven feature routes: Fragment of <Route> elements.
 * Inject directly inside <Routes> as {registryRouteElements} (NOT as a component).
 * React Router v6: only <Route> or <React.Fragment> as children of <Routes>.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { getEnabledFeatures } from '@features/registry';
import FeaturePageRenderer from './FeaturePageRenderer';
import { featureScreens, type FeatureKey } from '../featureScreens';

const featureKeysWithScreens: FeatureKey[] = Object.keys(featureScreens) as FeatureKey[];

function getRegistryRouteEntries(): Array<{ path: string; featureKey: FeatureKey }> {
  const desktop = getEnabledFeatures({ platform: 'desktop' });
  const mobile = getEnabledFeatures({ platform: 'mobile' });
  const pathToKey = new Map<string, FeatureKey>();
  for (const m of desktop) {
    if (m.routes.desktop && featureKeysWithScreens.includes(m.key as FeatureKey)) {
      pathToKey.set(m.routes.desktop, m.key as FeatureKey);
    }
  }
  for (const m of mobile) {
    if (m.routes.mobile && featureKeysWithScreens.includes(m.key as FeatureKey)) {
      pathToKey.set(m.routes.mobile, m.key as FeatureKey);
    }
  }
  return Array.from(pathToKey.entries()).map(([path, featureKey]) => ({ path, featureKey }));
}

const _entries = getRegistryRouteEntries();

export const registryRouteElements: React.ReactNode = (
  <>
    {_entries.map(({ path, featureKey }) => (
      <Route
        key={featureKey}
        path={path.startsWith('/') ? path.slice(1) : path}
        element={<FeaturePageRenderer featureKey={featureKey} />}
      />
    ))}
  </>
);
