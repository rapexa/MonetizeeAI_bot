# Feature Portability

This document describes the **feature contract + registry** system so that any feature can be implemented once (core logic) and exposed on web-desktop and web-mobile with minimal duplication.

## Goals

- **Core shared**: API, types, and hooks live in one place per feature.
- **UI per platform**: Desktop and Mobile (and optional Shared) components use the same core.
- **Registry-driven routing**: Routes and optional nav entries come from feature manifests.
- **Incremental adoption**: Existing pages/routes keep working; new features use this structure.

## Folder Structure

```
packages/features/
├── types.ts              # FeatureManifest, Platform (shared contract)
├── registry.ts           # allManifests, getEnabledFeatures, getFeatureByKey
├── index.ts
└── <featureKey>/         # e.g. test-page, my-feature
    ├── manifest.ts       # Feature manifest (key, routes, nav, screens, flags)
    ├── index.ts
    ├── core/
    │   ├── types.ts     # Feature-specific types
    │   ├── api.ts       # API calls (shared)
    │   ├── hooks.ts     # Shared hooks (shared)
    │   └── index.ts
    └── ui/
        ├── Desktop.tsx  # Desktop layout/screen
        ├── Mobile.tsx   # Mobile/touch-friendly layout
        ├── Shared.tsx   # (optional) shared UI bits
        └── index.ts
```

## Feature Manifest

Each feature has a `manifest.ts` that defines:

```ts
export type FeatureManifest = {
  key: string;                    // unique, e.g. 'test-page'
  title: string;
  routes: { desktop?: string; mobile?: string };  // e.g. { desktop: '/test', mobile: '/test' }
  nav?: {
    desktop?: { group?: string; label?: string; icon?: string; order?: number };
    mobile?:  { tab?: string; label?: string; icon?: string; order?: number };
  };
  screens: { desktop?: string; mobile?: string; shared?: string };  // component names
  flags?: { enabled?: boolean; roles?: string[] };
};
```

- **routes**: Paths for desktop and mobile. Same path can be used for both.
- **nav**: Optional nav entry for sidebar (desktop) or bottom tabs (mobile). Icon is a string (e.g. Lucide name) for mapping in the app.
- **screens**: Which UI component to load (Desktop, Mobile, Shared).
- **flags**: `enabled: false` hides the feature from routing/nav.

## Rules

1. **No duplicated core logic**: All API calls, types, and shared hooks live under `core/`. UI components under `ui/` must not reimplement API or business logic.
2. **One feature key per feature**: Use kebab-case (e.g. `my-feature`). Key is used in registry and in `featureScreens` in the app.
3. **Lazy loading**: The app loads feature screens via `React.lazy()`. Each feature’s Desktop/Mobile are registered in `miniApp/src/featureScreens.tsx`.

## How to Add a New Feature

1. **Scaffold** (recommended):
   ```bash
   node scripts/scaffold-feature.js my-feature
   ```
   This creates the folder skeleton, manifest, core placeholders, ui/Desktop and ui/Mobile, and registers the feature in `packages/features/registry.ts` and `miniApp/src/featureScreens.tsx`. Idempotent; use `--force` to overwrite existing files.

2. **Manual**:
   - Create `packages/features/<featureKey>/` with manifest, core (types, api, hooks), and ui (Desktop.tsx, Mobile.tsx).
   - Add manifest import and entry to `packages/features/registry.ts`.
   - Add lazy screen entry to `miniApp/src/featureScreens.tsx` (see test-page).

3. **Route**: Routes are driven by the registry. `RegistryRoutes` in the app renders a `<Route path={...} element={<FeaturePageRenderer featureKey="..." />} />` for each enabled feature’s path. No need to add a route in `App.tsx` for new features; ensure the feature is in the registry and in `featureScreens`.

## How to Port an Existing Feature to Mobile

1. Move or copy the feature into `packages/features/<featureKey>/`:
   - Put shared logic in `core/` (types, api, hooks).
   - Put current page UI in `ui/Desktop.tsx` (or keep as desktop default).
2. Add `ui/Mobile.tsx` with a touch-friendly layout:
   - Larger tap targets (min 44px), spacing, bottom safe area.
   - Reuse the same hooks from `core/hooks.ts`.
3. Add manifest with `routes: { desktop: '/path', mobile: '/path' }` (or different paths if needed).
4. Register in `registry.ts` and `featureScreens.tsx` (or run scaffold then replace generated files).
5. Old route keeps working: point it to `FeaturePageRenderer` with the same path, or rely on `RegistryRoutes` if the path is in the manifest.

## How to Add Nav / Routing Using Manifest

- **Routing**: Paths come from `manifest.routes.desktop` and `manifest.routes.mobile`. `RegistryRoutes` uses `getEnabledFeatures({ platform: 'desktop' | 'mobile' })` and renders a route per path. Route path is taken from the manifest; no extra config in `App.tsx` for registry-driven features.
- **Nav (optional)**: To drive BottomNav or Sidebar from the registry:
  - Use `getEnabledFeatures({ platform: 'mobile' })` or `...desktop` and map `manifest.nav.mobile` / `manifest.nav.desktop` to tab or sidebar items.
  - Map `nav.icon` (string) to an icon component (e.g. Lucide: `TestTube` → `<TestTube />`). You can keep a small map in the nav component or a shared icon map.

## Desktop vs Mobile UI Guidelines

- **Desktop**: More density, sidebar context, hover states, optional multi-column.
- **Mobile**: Touch-friendly (min 44px targets), single column, bottom safe area (`env(safe-area-inset-bottom)`), `touch-manipulation` on buttons. Reuse the same core hooks and API.

## App Wiring (miniApp)

- **Alias**: Vite and tsconfig use `@features` → `packages/features`. Imports: `import { getFeatureByKey } from '@features/registry'` and `import('@features/test-page/ui/Desktop')`.
- **FeaturePageRenderer**: Receives `featureKey`, resolves manifest and platform (desktop vs mobile via `getPlatformInfo().isMobile`), and renders the lazy-loaded Desktop or Mobile screen.
- **RegistryRoutes**: Renders one `<Route path={...} element={<FeaturePageRenderer featureKey={...} />} />` for each enabled feature path. Included inside the main `<Routes>` in `App.tsx`.

## Checklist Before Merging

- [ ] Feature has a manifest with `key`, `routes`, and `screens`.
- [ ] Core logic (api, types, hooks) is only in `core/`; no duplication in UI.
- [ ] Feature is registered in `packages/features/registry.ts` and in `miniApp/src/featureScreens.tsx`.
- [ ] Mobile UI uses touch-friendly layout and safe areas where needed.
- [ ] Existing routes still work; `/test` continues to work via FeaturePageRenderer for `test-page`.
- [ ] `npm run type-check` and `npm run build` pass in miniApp.

## Example: test-page

The **test-page** feature demonstrates the full flow:

- **Manifest**: `packages/features/test-page/manifest.ts` — key `test-page`, routes `/test` for desktop and mobile.
- **Core**: `useTestPage` hook and `fetchTestData` in core; used by both Desktop and Mobile.
- **UI**: `Desktop.tsx` and `Mobile.tsx` both use `useTestPage()`; Desktop uses a max-width layout, Mobile uses full-width and touch-friendly buttons.
- **Route**: `/test` is rendered by `RegistryRoutes` → `FeaturePageRenderer featureKey="test-page"` → lazy Desktop or Mobile based on platform.

The previous standalone `TestPage.tsx` page has been replaced by this feature; the route `/test` is unchanged.
