/**
 * Renders Route elements for all enabled registry-driven features.
 * Include inside <Routes> so feature paths (e.g. /test) are handled.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { getEnabledFeatures } from '@features/registry';
import FeaturePageRenderer from './FeaturePageRenderer';
import { featureScreens, type FeatureKey } from '../featureScreens';

const featureKeysWithScreens: FeatureKey[] = Object.keys(featureScreens) as FeatureKey[];

function useRegistryRouteEntries(): Array<{ path: string; featureKey: FeatureKey }> {
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

export default function RegistryRoutes() {
  const entries = useRegistryRouteEntries();
  return (
    <>
      {entries.map(({ path, featureKey }) => (
        <Route
          key={featureKey}
          path={path}
          element={<FeaturePageRenderer featureKey={featureKey} />}
        />
      ))}
    </>
  );
}
