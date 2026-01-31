#!/usr/bin/env node
/**
 * Scaffolds a new feature under packages/features/<key> and registers it.
 * Usage: node scripts/scaffold-feature.js <feature-key> [--force]
 * Example: node scripts/scaffold-feature.js my-feature
 * Idempotent: skips creating files that already exist unless --force.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const featuresDir = path.join(repoRoot, 'packages', 'features');
const miniAppSrc = path.join(repoRoot, 'miniApp', 'src');

const args = process.argv.slice(2);
const force = args.includes('--force');
const featureKey = args.find((a) => !a.startsWith('--'));

if (!featureKey || !/^[a-z][a-z0-9-]*$/.test(featureKey)) {
  console.error('Usage: node scripts/scaffold-feature.js <feature-key> [--force]');
  console.error('  feature-key: e.g. my-feature (lowercase, hyphens only)');
  process.exit(1);
}

const keyPascal = featureKey
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');
const keyCamel = keyPascal.charAt(0).toLowerCase() + keyPascal.slice(1);

const featureDir = path.join(featuresDir, featureKey);

function writeIfMissing(filePath, content) {
  if (fs.existsSync(filePath) && !force) {
    console.log('  skip (exists):', path.relative(repoRoot, filePath));
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('  wrote:', path.relative(repoRoot, filePath));
}

// 1) Folder skeleton
const manifestContent = `import type { FeatureManifest } from '../types';

export const manifest: FeatureManifest = {
  key: '${featureKey}',
  title: '${keyPascal}',
  routes: { desktop: '/${featureKey}', mobile: '/${featureKey}' },
  nav: {
    desktop: { group: 'main', label: '${keyPascal}', icon: 'Circle', order: 50 },
    mobile: { tab: 'more', label: '${keyPascal}', icon: 'Circle', order: 50 },
  },
  screens: { desktop: 'Desktop', mobile: 'Mobile', shared: undefined },
  flags: { enabled: true },
};
`;

writeIfMissing(path.join(featureDir, 'manifest.ts'), manifestContent);

writeIfMissing(
  path.join(featureDir, 'core', 'types.ts'),
  `/**
 * ${featureKey} feature: shared types (core).
 */

export interface ${keyPascal}State {
  loaded: boolean;
}
`
);

writeIfMissing(
  path.join(featureDir, 'core', 'api.ts'),
  `/**
 * ${featureKey} feature: API layer (core).
 */

export async function fetch${keyPascal}Data(): Promise<{ ok: boolean }> {
  return Promise.resolve({ ok: true });
}
`
);

writeIfMissing(
  path.join(featureDir, 'core', 'hooks.ts'),
  `/**
 * ${featureKey} feature: shared hooks (core).
 */

import { useState, useCallback, useEffect } from 'react';
import { fetch${keyPascal}Data } from './api';
import type { ${keyPascal}State } from './types';

export function use${keyPascal}(): ${keyPascal}State & { refresh: () => Promise<void> } {
  const [state, setState] = useState<${keyPascal}State>({ loaded: false });

  const refresh = useCallback(async () => {
    const data = await fetch${keyPascal}Data();
    setState({ loaded: data.ok });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
`
);

writeIfMissing(
  path.join(featureDir, 'core', 'index.ts'),
  `export * from './types';
export * from './api';
export * from './hooks';
`
);

const desktopTsx = `import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { use${keyPascal} } from '../core/hooks';

const Desktop: React.FC = () => {
  const navigate = useNavigate();
  const { loaded, refresh } = use${keyPascal}();

  return (
    <div className="min-h-screen bg-[#0e0817] text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors"
          type="button"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">${keyPascal} (Desktop)</h1>
      </div>
      <div className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/60">
        <p className="text-gray-300">loaded: {String(loaded)}</p>
        <button onClick={() => refresh()} className="mt-4 px-4 py-2 bg-violet-600 rounded-lg text-sm" type="button">
          Refresh
        </button>
      </div>
    </div>
  );
};

export default Desktop;
`;

const mobileTsx = `import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { use${keyPascal} } from '../core/hooks';

const Mobile: React.FC = () => {
  const navigate = useNavigate();
  const { loaded, refresh } = use${keyPascal}();

  return (
    <div className="min-h-screen bg-[#0e0817] text-white p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="w-12 h-12 min-w-[48px] min-h-[48px] bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center touch-manipulation"
          type="button"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">${keyPascal} (Mobile)</h1>
      </div>
      <div className="bg-gray-800/80 rounded-2xl p-5 border border-gray-700/60">
        <p className="text-gray-300">loaded: {String(loaded)}</p>
        <button onClick={() => refresh()} className="mt-4 w-full py-3 px-4 bg-violet-600 rounded-xl text-sm font-medium touch-manipulation" type="button">
          Refresh
        </button>
      </div>
    </div>
  );
};

export default Mobile;
`;

writeIfMissing(path.join(featureDir, 'ui', 'Desktop.tsx'), desktopTsx);
writeIfMissing(path.join(featureDir, 'ui', 'Mobile.tsx'), mobileTsx);

writeIfMissing(
  path.join(featureDir, 'ui', 'index.ts'),
  `export { default as Desktop } from './Desktop';
export { default as Mobile } from './Mobile';
`
);

writeIfMissing(
  path.join(featureDir, 'index.ts'),
  `export { manifest } from './manifest';
export * from './core';
export * from './ui';
`
);

// 2) Register in packages/features/registry.ts
const registryPath = path.join(featuresDir, 'registry.ts');
let registryText = fs.readFileSync(registryPath, 'utf8');
const importName = featureKey.replace(/-/g, '') + 'Manifest';
if (!registryText.includes("from './" + featureKey + "/manifest'")) {
  registryText = registryText.replace(
    /from '\.\/test-page\/manifest';/,
    "from './test-page/manifest';\nimport { manifest as " + importName + " } from './" + featureKey + "/manifest';"
  );
  registryText = registryText.replace(
    /testPageManifest,\s*\n\];/,
    'testPageManifest,\n  ' + importName + ',\n];'
  );
  fs.writeFileSync(registryPath, registryText, 'utf8');
  console.log('  updated: packages/features/registry.ts');
}

// 3) Register in miniApp/src/featureScreens.tsx
const featureScreensPath = path.join(miniAppSrc, 'featureScreens.tsx');
let screensText = fs.readFileSync(featureScreensPath, 'utf8');
if (!screensText.includes("'" + featureKey + "'")) {
  screensText = screensText.replace(
    /\n\} as const;/,
    ",\n  '" + featureKey + "': {\n    desktop: lazy(() => import('@features/" + featureKey + "/ui/Desktop')),\n    mobile: lazy(() => import('@features/" + featureKey + "/ui/Mobile')),\n  },\n} as const;"
  );
  fs.writeFileSync(featureScreensPath, screensText, 'utf8');
  console.log('  updated: miniApp/src/featureScreens.tsx');
}

console.log('\nDone. Feature key:', featureKey);
console.log('  Route (from manifest): /' + featureKey);
console.log('  Add nav entry in BottomNav/Sidebar if needed (see docs/FEATURE_PORTABILITY.md).');
