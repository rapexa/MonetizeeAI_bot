/**
 * Renders a feature screen by key using registry + platform.
 * Use in routes: <Route path="..." element={<FeaturePageRenderer featureKey="test-page" />} />
 */

import React, { Suspense } from 'react';
import { getFeatureByKey } from '@features/registry';
import { getPlatformInfo } from '../utils/platformDetection';
import { featureScreens, type FeatureKey } from '../featureScreens';

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#0e0817' }}>
    <div className="w-16 h-16 border-4 border-[#5a189a]/30 border-t-[#5a189a] rounded-full animate-spin" />
  </div>
);

interface FeaturePageRendererProps {
  featureKey: FeatureKey;
}

export default function FeaturePageRenderer({ featureKey }: FeaturePageRendererProps) {
  const manifest = getFeatureByKey(featureKey);
  const platform = getPlatformInfo().isMobile ? 'mobile' : 'desktop';
  const screens = featureScreens[featureKey];
  const Screen = screens?.[platform];

  if (!manifest || !Screen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e0817] text-white p-4">
        <p>صفحه یافت نشد.</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Screen />
    </Suspense>
  );
}
