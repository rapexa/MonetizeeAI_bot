# Architecture Audit: MonetizeeAI Bot Platform

**Document Version:** 1.0  
**Date:** January 27, 2026  
**Auditor:** Senior Software Architect  
**Purpose:** Safe mobile/desktop separation strategy and scaling preparation

---

## 1. Executive Summary

### What This Project Is

**MonetizeeAI Bot** is a Telegram Mini App platform that provides:
- **Educational content delivery** (video courses, learning stages)
- **AI-powered business coaching** (chatbot, strategy tools)
- **CRM and lead management** tools
- **Subscription-based monetization** (monthly, 6-month, lifetime plans)
- **Admin panel** for content and user management

**Core Modules:**
1. **Backend API** (Go/Gin) - REST API + WebSocket for real-time features
2. **Frontend Mini App** (React/TypeScript) - Single-page application
3. **Telegram Bot** (Go) - User authentication and navigation
4. **Database** (MySQL) - User data, sessions, payments, chat history

### Tech Stack

**Backend:**
- **Language:** Go 1.24.0
- **Framework:** Gin Gonic (HTTP router)
- **ORM:** GORM (MySQL driver)
- **AI Integration:** Groq API (via `groq_client.go`)
- **WebSocket:** Gorilla WebSocket
- **Logging:** Zap (structured logging)
- **Authentication:** Telegram WebApp initData validation

**Frontend:**
- **Framework:** React 18.3.1
- **Language:** TypeScript 5.5.3
- **Build Tool:** Vite 5.4.2
- **Routing:** React Router DOM 7.7.0
- **Styling:** Tailwind CSS 3.4.1 + PostCSS
- **Icons:** Lucide React
- **State Management:** React Context API (`AppContext.tsx`, `ThemeContext.tsx`)

**Database:**
- **Type:** MySQL (utf8mb4)
- **Connection Pool:** 25 idle, 150 max connections
- **Tables:** users, sessions, videos, exercises, user_sessions, admins, licenses, chat_messages, payment_transactions, tickets

**Deployment:**
- **Build Script:** `build.sh` (Go binary compilation)
- **Frontend Build:** `npm run build` (Vite production build)
- **Process Manager:** Supervisor (assumed, based on error logs)
- **Web Server:** Nginx (config files present)

### Highest-Risk Areas Identified

1. **🔴 CRITICAL: Mobile/Desktop Code Mixing**
   - Responsive breakpoints (`lg:`) scattered across 18+ files
   - Layout logic embedded in page components
   - Shared CSS classes causing collision risks
   - **Risk:** Desktop changes can break mobile without detection

2. **🟡 HIGH: State Management Fragility**
   - Single `AppContext` for all global state
   - No separation between mobile/desktop state needs
   - API caching logic mixed with UI state
   - **Risk:** State bugs affect both platforms simultaneously

3. **🟡 HIGH: API Layer Coupling**
   - Single `api.ts` service for all endpoints
   - No request/response type safety boundaries
   - Rate limiting logic in backend but no frontend retry strategy
   - **Risk:** API changes break both mobile and desktop

4. **🟠 MEDIUM: Build & Deployment Process**
   - Manual build steps (no CI/CD visible)
   - No automated testing
   - Frontend and backend built separately
   - **Risk:** Deployment inconsistencies, no rollback strategy

5. **🟠 MEDIUM: Database Schema Evolution**
   - GORM auto-migration in `main.go`
   - No migration versioning system
   - **Risk:** Schema changes can break production

---

## 2. Repository Map

```
MonetizeeAI_bot/
├── 📁 Backend (Go Application)
│   ├── main.go                    # Entry point, DB init, bot setup
│   ├── models.go                  # GORM models (User, Session, Video, etc.)
│   ├── handlers.go                # Telegram bot command handlers
│   ├── web_api.go                 # REST API endpoints (3,500+ lines)
│   ├── admin_api.go               # Admin panel API
│   ├── admin_handlers.go          # Admin command handlers
│   ├── payment_*.go               # Payment processing (Zarinpal integration)
│   ├── groq_client.go             # AI/LLM integration
│   ├── telegram_auth.go           # Telegram WebApp authentication
│   ├── cache.go                   # User cache implementation
│   ├── backup.go                  # Database backup utilities
│   ├── logger/                    # Structured logging (Zap)
│   │   └── logger.go
│   └── cmd/
│       └── generate-licenses/      # License generation tool
│
├── 📁 Frontend (React Mini App)
│   └── miniApp/
│       ├── src/
│       │   ├── App.tsx            # Root component, routing setup
│       │   ├── main.tsx           # React entry point
│       │   ├── index.css          # Global styles + Tailwind
│       │   │
│       │   ├── 📁 components/     # Reusable UI components
│       │   │   ├── Layout.tsx     # ⚠️ MIXED: Mobile/Desktop layout logic
│       │   │   ├── Sidebar.tsx    # ⚠️ DESKTOP ONLY (lg:flex)
│       │   │   ├── Header.tsx     # ⚠️ DESKTOP ONLY (lg:flex)
│       │   │   ├── BottomNav.tsx  # ⚠️ MOBILE ONLY (lg:hidden)
│       │   │   ├── AIMessage.tsx
│       │   │   ├── Card.tsx
│       │   │   └── ... (25 components)
│       │   │
│       │   ├── 📁 pages/          # Route-level page components
│       │   │   ├── Dashboard.tsx  # ⚠️ MIXED: 1,500+ lines, mobile/desktop logic
│       │   │   ├── Levels.tsx     # ⚠️ MIXED: Responsive breakpoints
│       │   │   ├── Profile.tsx   # ⚠️ MIXED: Responsive breakpoints
│       │   │   ├── AICoach.tsx   # ⚠️ MIXED: Responsive breakpoints
│       │   │   ├── Tools.tsx     # ⚠️ MIXED: Responsive breakpoints
│       │   │   └── ... (20+ pages)
│       │   │
│       │   ├── 📁 context/         # React Context (state management)
│       │   │   ├── AppContext.tsx # ⚠️ SHARED: Global state for both platforms
│       │   │   └── ThemeContext.tsx
│       │   │
│       │   ├── 📁 services/       # API integration layer
│       │   │   ├── api.ts         # ⚠️ SHARED: Single API service
│       │   │   └── adminApi.ts
│       │   │
│       │   ├── 📁 hooks/          # Custom React hooks
│       │   │   ├── useAutoScroll.ts
│       │   │   ├── useDebounce.ts
│       │   │   └── ...
│       │   │
│       │   └── 📁 utils/          # Utility functions
│       │       ├── logger.ts
│       │       └── platformDetection.ts
│       │
│       ├── package.json           # Frontend dependencies
│       ├── vite.config.ts         # Vite build configuration
│       ├── tailwind.config.js     # Tailwind CSS configuration
│       └── tsconfig.json          # TypeScript configuration
│
├── 📁 Configuration & Scripts
│   ├── build.sh                   # Go backend build script
│   ├── go.mod                     # Go dependencies
│   ├── .env.sample                # Environment variables template
│   ├── nginx_config_example.conf  # Nginx configuration
│   └── commands.sql               # Database schema (reference)
│
├── 📁 Documentation
│   ├── DEPLOYMENT.md
│   ├── ADMIN_PANEL_GUIDE.md
│   ├── LICENSE_MANAGEMENT.md
│   └── ... (20+ markdown files)
│
└── 📁 Database Migrations
    ├── migration.sql
    ├── admin_setup.sql
    └── ... (multiple SQL files)
```

### Key Folder Classifications

**Frontend:**
- `miniApp/src/` - All React application code
- `miniApp/public/` - Static assets (fonts, videos)

**Backend:**
- Root-level `.go` files - Core application logic
- `logger/` - Logging infrastructure
- `cmd/` - CLI tools

**Shared/Config:**
- Root-level config files (`.env`, `go.mod`, `package.json`)
- SQL migration files
- Build scripts

**⚠️ Problem Areas:**
- No clear separation between mobile/desktop code
- Shared components used by both platforms
- No `apps/` or `packages/` structure for separation

---

## 3. Runtime Architecture

### Request Flow Diagram

```
┌─────────────────┐
│  Telegram User  │
└────────┬────────┘
         │
         │ 1. Opens Mini App
         ▼
┌─────────────────────────────────────┐
│  Telegram WebApp (Browser Runtime)  │
│  - Injects Telegram.WebApp object  │
│  - Provides initData (auth token)  │
└────────┬────────────────────────────┘
         │
         │ 2. Loads React App
         ▼
┌─────────────────────────────────────┐
│  Frontend (React SPA)               │
│  ├── App.tsx (Router setup)         │
│  ├── Layout.tsx (Mobile/Desktop)     │
│  └── Pages (Dashboard, Levels, etc.)│
└────────┬────────────────────────────┘
         │
         │ 3. API Calls (REST)
         ▼
┌─────────────────────────────────────┐
│  Nginx (Reverse Proxy)              │
│  - Routes /api/* to Go backend      │
│  - Serves static frontend files     │
└────────┬────────────────────────────┘
         │
         │ 4. HTTP Request
         ▼
┌─────────────────────────────────────┐
│  Go Backend (Gin Server)            │
│  ├── web_api.go (REST endpoints)    │
│  ├── telegram_auth.go (Auth check)  │
│  ├── groq_client.go (AI calls)      │
│  └── models.go (DB access)          │
└────────┬────────────────────────────┘
         │
         │ 5. Database Query
         ▼
┌─────────────────────────────────────┐
│  MySQL Database                      │
│  - users, sessions, videos, etc.    │
└─────────────────────────────────────┘
```

### Main Services & Components

**Backend Services:**

1. **HTTP API Server** (`web_api.go`)
   - Base URL: `https://sianmarketing.com/api/api/v1`
   - Endpoints: `/user`, `/sessions`, `/chat`, `/payment`, etc.
   - Authentication: Telegram WebApp `initData` validation
   - Rate Limiting: 3 calls/minute per user (in-memory)

2. **Telegram Bot** (`handlers.go`)
   - Command handlers: `/start`, `/help`, etc.
   - Webhook-based message processing
   - User session management

3. **AI Service** (`groq_client.go`)
   - Groq API integration for chatbot responses
   - Chat history management
   - Message streaming support

4. **Payment Service** (`payment_*.go`)
   - Zarinpal payment gateway integration
   - Subscription management
   - License verification

5. **Admin Service** (`admin_api.go`, `admin_handlers.go`)
   - Admin authentication
   - User management
   - Content management (sessions, videos)
   - Ticket system

**Frontend Services:**

1. **API Service** (`services/api.ts`)
   - Centralized HTTP client
   - Request caching (5-minute TTL)
   - Error handling
   - Telegram ID extraction

2. **State Management** (`context/AppContext.tsx`)
   - Global user data
   - API connection status
   - Subscription state
   - Loading states

3. **Routing** (`App.tsx`)
   - React Router DOM
   - Lazy loading for non-critical pages
   - Telegram `start_param` navigation

### Background Jobs & Services

**Assumed Services (based on error logs):**
- **Supervisor** - Process manager for Go binary (`bot`)
- **Nginx** - Web server and reverse proxy
- **MySQL** - Database server

**Background Tasks:**
- User cache cleanup (in `cache.go`)
- Rate limit cleanup (in-memory maps)
- Payment checker (if implemented)

### WebSocket Usage

- **Location:** `admin_websocket.go`
- **Purpose:** Real-time admin panel updates
- **Not used in frontend Mini App** (REST API only)

---

## 4. Frontend Architecture Deep Dive

### Routing Strategy

**File:** `miniApp/src/App.tsx`

**Structure:**
- **Root Router:** BrowserRouter wrapping entire app
- **Nested Routes:** Layout component wraps most routes
- **Special Routes:** Admin, WebLogin, SubscriptionManagement (no Layout)

**Route Definitions:**
```typescript
// Eager loaded (critical path)
Dashboard

// Lazy loaded (code splitting)
Levels, Profile, Settings, Tools, AICoach, Chatbot, etc.
```

**Navigation Triggers:**
- User clicks (BottomNav, Sidebar, page links)
- Telegram `start_param` (deep linking)
- Programmatic navigation (`navigate()`)

**⚠️ Issue:** All routes share the same Layout component, which contains mobile/desktop logic.

### State Management

**Location:** `miniApp/src/context/AppContext.tsx`

**State Structure:**
```typescript
interface AppContextType {
  userData: UserData;              // User profile, income, progress
  setUserData: Dispatch<...>;      // State setter
  isOnline: boolean;               // Network status
  isAPIConnected: boolean;         // API health
  isInTelegram: boolean;           // Platform detection
  loadingUser: boolean;            // Loading state
  hasRealData: boolean;            // Data validity flag
  telegramIdError: string | null; // Error messages
  syncWithAPI: () => Promise<void>; // Data sync function
  refreshUserData: () => Promise<void>;
  isSubscriptionExpired: () => boolean;
  addPoints: (points: number) => void;
}
```

**State Flow:**
1. App mounts → `AppProvider` initializes
2. `syncWithAPI()` called → Fetches user data
3. State updated → Components re-render
4. User actions → State mutations → Re-render

**⚠️ Issues:**
- Single context for all global state (no separation)
- No state persistence strategy (except `localStorage` for points)
- Mobile/desktop share same state (could have different needs)

### API Layer

**File:** `miniApp/src/services/api.ts`

**Architecture:**
- **Class-based:** `APIService` singleton
- **Base URL:** Hardcoded `https://sianmarketing.com/api/api/v1`
- **Caching:** In-memory Map with 5-minute TTL
- **Error Handling:** Try-catch with error messages

**Key Methods:**
```typescript
getCurrentUser()           // User profile
getSessions()              // Learning sessions
getChatHistory()           // AI chat messages
sendChatMessage()          // AI chat
getPaymentLink()           // Subscription payment
```

**⚠️ Issues:**
- No request/response type safety (uses `any`)
- No retry logic for failed requests
- Cache invalidation not explicit
- No request cancellation (AbortController)

### Styling System

**Framework:** Tailwind CSS 3.4.1

**Configuration:** `miniApp/tailwind.config.js`
- Custom color palette (`monetize.*`)
- Custom fonts (IranSansX)
- Custom animations

**Global Styles:** `miniApp/src/index.css`
- Tailwind directives
- Custom CSS classes
- Scrollbar styling
- Dark mode support

**Responsive Breakpoints:**
- Default: Mobile-first (< 1024px)
- `lg:` prefix: Desktop (≥ 1024px)

**⚠️ Critical Issue:** Responsive classes scattered across components:
- `lg:hidden` - Hide on desktop
- `lg:flex` - Show on desktop
- `lg:grid-cols-*` - Desktop grid layouts
- `lg:max-w-*` - Desktop width constraints

### Responsive Handling Patterns

**Current Pattern (Problematic):**

1. **Conditional Rendering in Components:**
   ```tsx
   // Example from Layout.tsx
   <Sidebar />  // hidden lg:flex
   <Header />   // hidden lg:flex
   <BottomNav /> // lg:hidden
   ```

2. **Breakpoint Classes in JSX:**
   ```tsx
   // Example from Dashboard.tsx
   <div className="lg:grid lg:grid-cols-12 lg:gap-6">
     <div className="lg:col-span-8">...</div>
     <div className="lg:col-span-4 lg:block hidden">...</div>
   </div>
   ```

3. **Inline Style Overrides:**
   ```tsx
   style={{ backgroundColor: '#10091c' }}
   ```

**Files with Responsive Logic:**
- `components/Layout.tsx` - Main layout wrapper
- `components/Sidebar.tsx` - Desktop navigation
- `components/Header.tsx` - Desktop header
- `components/BottomNav.tsx` - Mobile navigation
- `pages/Dashboard.tsx` - 16 responsive breakpoints
- `pages/Levels.tsx` - 6 responsive breakpoints
- `pages/Profile.tsx` - 5 responsive breakpoints
- `pages/AICoach.tsx` - 4 responsive breakpoints
- `pages/Tools.tsx` - 4 responsive breakpoints
- ... (18 files total)

### Mobile vs Desktop Concerns Mixed Together

**Evidence of Mixing:**

1. **Layout Component** (`components/Layout.tsx:29`)
   ```tsx
   <div className="flex-1 flex flex-col lg:mr-[280px] lg:pt-16">
   ```
   - Desktop margin and padding mixed with mobile layout

2. **Dashboard Page** (`pages/Dashboard.tsx:742`)
   ```tsx
   <div className="lg:grid lg:grid-cols-12 lg:gap-6 space-y-6 lg:space-y-0">
     <div className="lg:col-span-8">...</div>
     <div className="lg:col-span-4 lg:block hidden">...</div>
   </div>
   ```
   - Grid layout for desktop, vertical stack for mobile in same component

3. **Profile Header** (`pages/Dashboard.tsx:747`)
   ```tsx
   <div className="lg:hidden flex items-center...">
   ```
   - Conditional visibility based on screen size

**Impact:**
- Changes to desktop layout can accidentally affect mobile
- CSS class collisions possible
- Hard to test mobile/desktop independently
- Code review requires checking both viewports

---

## 5. Mobile vs Desktop Problem Analysis

### Top 10 Ways Desktop Changes Could Break Mobile

#### 1. **CSS Class Name Collisions** 🔴 HIGH RISK
**Location:** `miniApp/src/index.css`, all component files  
**Problem:** Shared CSS classes used by both mobile and desktop  
**Example:**
```css
/* Global class used by both */
.card { ... }
```
**Risk:** Changing `.card` styles for desktop could break mobile cards  
**Files Affected:** All components using shared classes

#### 2. **Layout Component Margin/Padding Changes** 🔴 HIGH RISK
**Location:** `miniApp/src/components/Layout.tsx:29`  
**Problem:** `lg:mr-[280px]` affects desktop, but mobile uses same container  
**Risk:** Changing desktop margin could affect mobile spacing  
**Concrete Risk:** If someone removes `lg:` prefix, mobile gets 280px margin

#### 3. **Grid Layout Breakpoint Changes** 🔴 HIGH RISK
**Location:** `miniApp/src/pages/Dashboard.tsx:742`  
**Problem:** `lg:grid` switches to grid at 1024px, but mobile uses `space-y-6`  
**Risk:** Changing breakpoint from `lg:` to `md:` would break tablet/mobile  
**Concrete Risk:** Grid layout appearing on mobile screens

#### 4. **Conditional Rendering Logic Errors** 🟡 MEDIUM RISK
**Location:** `miniApp/src/components/Layout.tsx:22-26`  
**Problem:** `hidden lg:flex` pattern - if someone changes to `flex lg:hidden`, mobile breaks  
**Risk:** Inverted logic would show desktop components on mobile  
**Files Affected:** Sidebar.tsx, Header.tsx, BottomNav.tsx

#### 5. **State Management Side Effects** 🟡 MEDIUM RISK
**Location:** `miniApp/src/context/AppContext.tsx`  
**Problem:** Shared state between mobile/desktop - desktop state changes affect mobile  
**Risk:** Desktop-specific state updates could trigger mobile re-renders  
**Concrete Risk:** API calls from desktop affecting mobile performance

#### 6. **API Service Caching Conflicts** 🟡 MEDIUM RISK
**Location:** `miniApp/src/services/api.ts:57`  
**Problem:** Single cache instance shared by both platforms  
**Risk:** Desktop API calls could invalidate mobile cache or vice versa  
**Concrete Risk:** Stale data shown on one platform after other platform updates

#### 7. **Tailwind Config Changes** 🟡 MEDIUM RISK
**Location:** `miniApp/tailwind.config.js`  
**Problem:** Custom breakpoints, colors, spacing used by both platforms  
**Risk:** Changing `lg:` breakpoint value affects both mobile and desktop  
**Concrete Risk:** If `lg:` changed from 1024px to 768px, mobile layout breaks

#### 8. **Component Props Drift** 🟠 LOW-MEDIUM RISK
**Location:** All page components  
**Problem:** Components receive props that might be desktop-specific  
**Risk:** Adding desktop-only props could break mobile if not handled  
**Example:** `isDesktop?: boolean` prop added but mobile doesn't pass it

#### 9. **Route-Level Layout Changes** 🟠 LOW-MEDIUM RISK
**Location:** `miniApp/src/App.tsx:142`  
**Problem:** All routes use same Layout component  
**Risk:** Layout changes affect all routes (mobile and desktop)  
**Concrete Risk:** Changing Layout padding affects all pages

#### 10. **Build Configuration Changes** 🟠 LOW RISK
**Location:** `miniApp/vite.config.ts`, `miniApp/tailwind.config.js`  
**Problem:** Build config affects both mobile and desktop output  
**Risk:** CSS purging, minification changes could break styles  
**Concrete Risk:** Tailwind purge removing needed classes

### Current Anti-Patterns

#### Anti-Pattern 1: Scattered Conditional Rendering
**Location:** 18+ files with `lg:` breakpoints  
**Problem:** Responsive logic spread across components  
**Impact:** Hard to track all mobile/desktop differences  
**Risk Score:** 🔴 HIGH

#### Anti-Pattern 2: Layout Logic Inside Components
**Location:** `pages/Dashboard.tsx`, `pages/Levels.tsx`, etc.  
**Problem:** Page components contain layout logic (`lg:grid`, `lg:col-span-*`)  
**Impact:** Business logic mixed with presentation  
**Risk Score:** 🔴 HIGH

#### Anti-Pattern 3: Shared CSS Classes
**Location:** `miniApp/src/index.css`, component files  
**Problem:** Global CSS classes used by both platforms  
**Impact:** Style changes affect both platforms  
**Risk Score:** 🟡 MEDIUM

#### Anti-Pattern 4: Single State Context
**Location:** `miniApp/src/context/AppContext.tsx`  
**Problem:** One context for all global state  
**Impact:** State changes affect both platforms  
**Risk Score:** 🟡 MEDIUM

#### Anti-Pattern 5: No Platform Detection Abstraction
**Location:** Direct `lg:` usage, no utility functions  
**Problem:** Platform detection logic not centralized  
**Impact:** Inconsistent breakpoint usage  
**Risk Score:** 🟠 LOW-MEDIUM

---

## 6. Proposed Target Architecture

### Recommendation: **Option A - Single App with Separate Shells**

**Rationale:**
- Current codebase is already a single React app
- Minimal refactoring required
- Shared core can be extracted gradually
- Lower risk than monorepo migration

### Target Structure

```
miniApp/src/
├── 📁 core/                    # Shared business logic
│   ├── api/                    # API service (extracted from services/)
│   │   ├── client.ts          # HTTP client
│   │   ├── endpoints.ts       # API endpoint definitions
│   │   └── types.ts           # Request/Response types
│   ├── hooks/                 # Shared hooks (existing)
│   ├── utils/                 # Shared utilities (existing)
│   └── types/                 # Shared TypeScript types
│
├── 📁 ui/                      # Shared UI components
│   ├── Card.tsx               # Generic card component
│   ├── Button.tsx             # Generic button
│   └── ... (non-platform-specific)
│
├── 📁 apps/                    # Platform-specific shells
│   ├── mobile/
│   │   ├── Layout.tsx         # Mobile-only layout
│   │   ├── Navigation.tsx     # BottomNav wrapper
│   │   └── routes.tsx        # Mobile route config
│   │
│   └── desktop/
│       ├── Layout.tsx         # Desktop-only layout
│       ├── Navigation.tsx    # Sidebar + Header wrapper
│       └── routes.tsx        # Desktop route config
│
├── 📁 features/                # Feature modules (shared)
│   ├── dashboard/
│   │   ├── Dashboard.tsx     # Business logic
│   │   ├── DashboardMobile.tsx  # Mobile presentation
│   │   └── DashboardDesktop.tsx  # Desktop presentation
│   ├── profile/
│   ├── levels/
│   └── ...
│
└── 📁 App.tsx                  # Root - detects platform, loads shell
```

### Migration Strategy

**Phase 0: Safety Net** (Week 1)
- Create `develop` branch
- Set up CI checks (if not exists)
- Add viewport testing scripts
- Document current breakpoints

**Phase 1: Extract Core** (Week 2-3)
- Create `src/core/` directory
- Move `services/api.ts` → `core/api/client.ts`
- Extract types to `core/types/`
- Create shared hooks in `core/hooks/`
- **Risk:** Low (no UI changes)
- **Rollback:** Revert core extraction, restore original files

**Phase 2: Create Shell Boundaries** (Week 4-5)
- Create `src/apps/mobile/` and `src/apps/desktop/`
- Copy `Layout.tsx` → `apps/mobile/Layout.tsx` and `apps/desktop/Layout.tsx`
- Remove responsive classes, make platform-specific
- Update `App.tsx` to detect platform and load shell
- **Risk:** Medium (layout changes)
- **Rollback:** Restore original Layout.tsx, revert App.tsx

**Phase 3: Move Features Gradually** (Week 6-10)
- Start with one page (e.g., `Dashboard`)
- Create `features/dashboard/Dashboard.tsx` (business logic)
- Create `DashboardMobile.tsx` and `DashboardDesktop.tsx` (presentation)
- Update routes to use new components
- **Risk:** Medium (one page at a time)
- **Rollback:** Revert specific page, keep others unchanged

---

## 7. Migration Plan (No-Break, Step-by-Step)

### Phase 0: Safety Net (Week 1)

**Tasks:**
1. **Branching Strategy**
   - Create `develop` branch from `main`
   - All changes in `develop` first
   - Merge to `main` only after testing

2. **CI Checks** (if CI exists, enhance; if not, create basic)
   ```yaml
   # .github/workflows/ci.yml (example)
   - Build frontend (npm run build)
   - Build backend (go build)
   - Lint check (npm run lint)
   - Type check (tsc --noEmit)
   ```

3. **Smoke Tests**
   - Create `tests/smoke/` directory
   - Add viewport tests (mobile 375px, desktop 1920px)
   - Test critical routes: `/`, `/levels`, `/profile`

4. **Documentation**
   - Document all `lg:` breakpoints in use
   - Create breakpoint reference guide

**Estimated Risk:** 🟢 LOW  
**Rollback Strategy:** Revert branch, no production impact

### Phase 1: Create Shared Core Boundaries (Week 2-3)

**Tasks:**

1. **Create Core Directory Structure**
   ```bash
   mkdir -p src/core/{api,hooks,utils,types}
   ```

2. **Extract API Service**
   - Copy `services/api.ts` → `core/api/client.ts`
   - Create `core/api/endpoints.ts` (endpoint constants)
   - Create `core/api/types.ts` (Request/Response types)
   - Update imports in components (gradual)

3. **Extract Types**
   - Create `core/types/user.ts` (UserData interface)
   - Create `core/types/api.ts` (APIResponse interface)
   - Update imports

4. **Extract Shared Hooks**
   - Move `hooks/useDebounce.ts` → `core/hooks/useDebounce.ts`
   - Move `hooks/useAutoScroll.ts` → `core/hooks/useAutoScroll.ts`
   - Keep platform-specific hooks separate

**Estimated Risk:** 🟢 LOW  
**Rollback Strategy:** Revert core directory, restore original imports

**Verification:**
- Build succeeds
- No runtime errors
- All pages load correctly

### Phase 2: Split Shells (Week 4-5)

**Tasks:**

1. **Create Platform Detection Utility**
   ```typescript
   // core/utils/platform.ts
   export const isDesktop = () => window.innerWidth >= 1024;
   export const usePlatform = () => {
     const [platform, setPlatform] = useState<'mobile' | 'desktop'>(
       isDesktop() ? 'desktop' : 'mobile'
     );
     // ... resize listener
     return platform;
   };
   ```

2. **Create Mobile Shell**
   ```typescript
   // apps/mobile/Layout.tsx
   export const MobileLayout = ({ children }) => (
     <div className="min-h-screen">
       <BottomNav />
       <main className="pb-20">{children}</main>
     </div>
   );
   ```

3. **Create Desktop Shell**
   ```typescript
   // apps/desktop/Layout.tsx
   export const DesktopLayout = ({ children }) => (
     <div className="min-h-screen flex">
       <Sidebar />
       <Header />
       <main className="flex-1 ml-[280px] pt-16">{children}</main>
     </div>
   );
   ```

4. **Update App.tsx**
   ```typescript
   // App.tsx
   const platform = usePlatform();
   const Layout = platform === 'desktop' ? DesktopLayout : MobileLayout;
   ```

**Estimated Risk:** 🟡 MEDIUM  
**Rollback Strategy:** Revert App.tsx, restore original Layout.tsx

**Verification:**
- Mobile layout unchanged
- Desktop layout unchanged
- Navigation works on both

### Phase 3: Move Feature Screens Gradually (Week 6-10)

**Priority Order:**
1. Dashboard (most complex, highest risk)
2. Profile (medium complexity)
3. Levels (medium complexity)
4. Tools (low complexity)
5. AICoach (low complexity)
6. Remaining pages

**Per-Page Process:**

1. **Extract Business Logic**
   ```typescript
   // features/dashboard/Dashboard.tsx
   export const useDashboard = () => {
     const { userData } = useApp();
     // ... all business logic
     return { income, progress, ... };
   };
   ```

2. **Create Mobile Presentation**
   ```typescript
   // features/dashboard/DashboardMobile.tsx
   export const DashboardMobile = () => {
     const dashboard = useDashboard();
     return (
       <div className="max-w-md mx-auto">
         {/* Mobile-specific UI */}
       </div>
     );
   };
   ```

3. **Create Desktop Presentation**
   ```typescript
   // features/dashboard/DashboardDesktop.tsx
   export const DashboardDesktop = () => {
     const dashboard = useDashboard();
     return (
       <div className="max-w-4xl mx-auto">
         {/* Desktop-specific UI */}
       </div>
     );
   };
   ```

4. **Update Route**
   ```typescript
   // App.tsx or routes file
   const Dashboard = platform === 'desktop' 
     ? DashboardDesktop 
     : DashboardMobile;
   ```

**Estimated Risk:** 🟡 MEDIUM (per page)  
**Rollback Strategy:** Revert specific page files, restore original

**Verification (per page):**
- Mobile view matches original
- Desktop view matches original
- All interactions work
- No console errors

---

## 8. Testing & Quality Gates

### Minimum Test Plan

#### 1. Route-Level Smoke Tests

**Tool:** Playwright or Cypress (recommended: Playwright for viewport testing)

**Test Cases:**
```typescript
// tests/smoke/routes.spec.ts
describe('Route Smoke Tests', () => {
  ['/', '/levels', '/profile', '/tools', '/ai-coach'].forEach(route => {
    it(`should load ${route} on mobile`, async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(route);
      await expect(page).toHaveTitle(/MonetizeAI/);
    });
    
    it(`should load ${route} on desktop`, async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(route);
      await expect(page).toHaveTitle(/MonetizeAI/);
    });
  });
});
```

#### 2. Viewport Checks

**Critical Viewports:**
- Mobile: 375px × 667px (iPhone SE)
- Mobile: 390px × 844px (iPhone 12)
- Tablet: 768px × 1024px (iPad)
- Desktop: 1024px × 768px (minimum desktop)
- Desktop: 1920px × 1080px (standard desktop)

**Test Script:**
```bash
# tests/viewport-check.sh
for viewport in "375,667" "390,844" "768,1024" "1024,768" "1920,1080"; do
  IFS=',' read -r width height <<< "$viewport"
  echo "Testing ${width}x${height}"
  # Run Playwright with viewport
done
```

#### 3. Build Verification Steps

**Frontend Build:**
```bash
cd miniApp
npm run build
# Check for:
# - No TypeScript errors
# - No build warnings
# - Output size reasonable (< 5MB)
```

**Backend Build:**
```bash
go build -o bot .
# Check for:
# - No compilation errors
# - Binary created successfully
```

### Suggested CI Pipeline

**File:** `.github/workflows/ci.yml` (if using GitHub) or equivalent

```yaml
name: CI

on: [push, pull_request]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd miniApp && npm ci
      - run: cd miniApp && npm run build
      - run: cd miniApp && npm run lint
  
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.24'
      - run: go build -o bot .
  
  smoke-tests:
    runs-on: ubuntu-latest
    needs: [frontend, backend]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:smoke
```

**Alternative:** Simple bash script if no CI
```bash
# scripts/ci-check.sh
#!/bin/bash
set -e
echo "Building frontend..."
cd miniApp && npm run build
echo "Building backend..."
cd .. && go build -o bot .
echo "✅ All builds successful"
```

---

## 9. Deployment Notes

### Current Deploy Steps (Assumed)

**Based on file structure and error logs:**

1. **Backend:**
   ```bash
   cd /path/to/MonetizeeAI_bot
   go build -o bot .
   supervisorctl restart bot
   ```

2. **Frontend:**
   ```bash
   cd miniApp
   npm run build
   # Output: dist/ directory
   # Copy to web server (nginx serves static files)
   ```

3. **Database:**
   - GORM auto-migration runs on startup
   - Manual SQL migrations if needed

### Deployment Risks

1. **🟡 No Version Control in Builds**
   - Build artifacts not versioned
   - **Risk:** Can't rollback to previous build easily
   - **Fix:** Tag builds with version, keep artifacts

2. **🟡 Manual Deployment Process**
   - No automated deployment
   - **Risk:** Human error, inconsistent deploys
   - **Fix:** Create deployment script

3. **🟡 Database Migration on Startup**
   - Auto-migration in `main.go:54`
   - **Risk:** Schema changes applied immediately
   - **Fix:** Use migration tool (golang-migrate)

4. **🟠 Environment Variables**
   - `.env` file required
   - **Risk:** Missing env vars cause runtime errors
   - **Fix:** Validate env vars on startup

### Suggestions to Standardize Deploy

**1. Create Deployment Script**
```bash
# scripts/deploy.sh
#!/bin/bash
set -e

VERSION=$(git describe --tags --always)
echo "Deploying version: $VERSION"

# Build backend
go build -o bot-${VERSION} .
ln -sf bot-${VERSION} bot

# Build frontend
cd miniApp
npm run build
cd ..

# Backup current deployment
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)

# Deploy (copy files, restart services)
# ... deployment steps

echo "✅ Deployment complete: $VERSION"
```

**2. Environment Variable Validation**
```go
// Add to main.go init()
func validateEnv() {
    required := []string{"MYSQL_DSN", "TELEGRAM_BOT_TOKEN", "GROQ_API_KEY"}
    for _, key := range required {
        if os.Getenv(key) == "" {
            log.Fatalf("Missing required environment variable: %s", key)
        }
    }
}
```

**3. Database Migration Strategy**
- Use `golang-migrate` instead of GORM auto-migration
- Version migrations: `migrations/000001_create_users.up.sql`
- Run migrations separately from app startup

**4. Secrets Management**
- Use environment variables (not committed)
- Consider secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Document required secrets in `.env.sample`

---

## 10. Action Items (Top 20)

### Priority 1: Critical (Do First)

1. **🔴 Create `develop` branch and branching strategy**
   - **File:** Git workflow
   - **Risk if skipped:** Breaking production
   - **Effort:** 1 hour

2. **🔴 Document all `lg:` breakpoint usage**
   - **Files:** All 18 files with responsive classes
   - **Risk if skipped:** Unknown breakpoints break mobile
   - **Effort:** 4 hours
   - **Output:** `docs/BREAKPOINTS_REFERENCE.md`

3. **🔴 Set up basic CI checks (build + lint)**
   - **Files:** `.github/workflows/ci.yml` or equivalent
   - **Risk if skipped:** Broken builds reach production
   - **Effort:** 2 hours

4. **🔴 Create viewport testing script**
   - **Files:** `tests/viewport-check.sh`
   - **Risk if skipped:** Mobile/desktop regressions undetected
   - **Effort:** 3 hours

5. **🔴 Extract API service to `core/api/`**
   - **Files:** `services/api.ts` → `core/api/client.ts`
   - **Risk if skipped:** API changes affect both platforms
   - **Effort:** 4 hours

### Priority 2: High Impact (Do Next)

6. **🟡 Create platform detection utility**
   - **File:** `core/utils/platform.ts`
   - **Risk if skipped:** Inconsistent platform detection
   - **Effort:** 2 hours

7. **🟡 Create mobile/desktop shell directories**
   - **Files:** `apps/mobile/`, `apps/desktop/`
   - **Risk if skipped:** Can't separate layouts
   - **Effort:** 3 hours

8. **🟡 Split Layout component (mobile vs desktop)**
   - **Files:** `components/Layout.tsx` → `apps/*/Layout.tsx`
   - **Risk if skipped:** Layout changes affect both platforms
   - **Effort:** 6 hours

9. **🟡 Extract shared types to `core/types/`**
   - **Files:** Create `core/types/user.ts`, `core/types/api.ts`
   - **Risk if skipped:** Type inconsistencies
   - **Effort:** 3 hours

10. **🟡 Create deployment script**
    - **File:** `scripts/deploy.sh`
    - **Risk if skipped:** Manual deployment errors
    - **Effort:** 4 hours

### Priority 3: Medium Impact (Do When Possible)

11. **🟠 Migrate Dashboard page (first feature)**
    - **Files:** `pages/Dashboard.tsx` → `features/dashboard/`
    - **Risk if skipped:** Most complex page stays mixed
    - **Effort:** 8 hours

12. **🟠 Add environment variable validation**
    - **File:** `main.go` (add validation function)
    - **Risk if skipped:** Runtime errors from missing env vars
    - **Effort:** 2 hours

13. **🟠 Create shared UI component library**
    - **Files:** `ui/Button.tsx`, `ui/Card.tsx`, etc.
    - **Risk if skipped:** Component duplication
    - **Effort:** 6 hours

14. **🟠 Add request/response type safety to API**
    - **File:** `core/api/types.ts`
    - **Risk if skipped:** Runtime type errors
    - **Effort:** 4 hours

15. **🟠 Migrate Profile page**
    - **Files:** `pages/Profile.tsx` → `features/profile/`
    - **Risk if skipped:** Profile changes affect both platforms
    - **Effort:** 6 hours

### Priority 4: Low Impact (Nice to Have)

16. **🟢 Add database migration tooling**
    - **Files:** Use `golang-migrate`
    - **Risk if skipped:** Schema changes risky
    - **Effort:** 4 hours

17. **🟢 Create component documentation**
    - **Files:** `docs/COMPONENTS.md`
    - **Risk if skipped:** Hard to understand components
    - **Effort:** 4 hours

18. **🟢 Add error boundary to feature modules**
    - **Files:** Wrap features in ErrorBoundary
    - **Risk if skipped:** One feature crash affects whole app
    - **Effort:** 2 hours

19. **🟢 Optimize bundle size analysis**
    - **Files:** Add `vite-bundle-analyzer`
    - **Risk if skipped:** Large bundle size
    - **Effort:** 2 hours

20. **🟢 Create API documentation**
    - **Files:** `docs/API.md`
    - **Risk if skipped:** API usage unclear
    - **Effort:** 6 hours

---

## Appendix A: File Reference Map

### Critical Files for Mobile/Desktop Separation

**Layout & Navigation:**
- `miniApp/src/components/Layout.tsx` - Main layout wrapper (MIXED)
- `miniApp/src/components/Sidebar.tsx` - Desktop navigation (DESKTOP ONLY)
- `miniApp/src/components/Header.tsx` - Desktop header (DESKTOP ONLY)
- `miniApp/src/components/BottomNav.tsx` - Mobile navigation (MOBILE ONLY)

**Pages with Responsive Logic:**
- `miniApp/src/pages/Dashboard.tsx` - 16 `lg:` breakpoints
- `miniApp/src/pages/Levels.tsx` - 6 `lg:` breakpoints
- `miniApp/src/pages/Profile.tsx` - 5 `lg:` breakpoints
- `miniApp/src/pages/AICoach.tsx` - 4 `lg:` breakpoints
- `miniApp/src/pages/Tools.tsx` - 4 `lg:` breakpoints

**State & API:**
- `miniApp/src/context/AppContext.tsx` - Global state (SHARED)
- `miniApp/src/services/api.ts` - API service (SHARED)

**Configuration:**
- `miniApp/tailwind.config.js` - Breakpoint definitions
- `miniApp/src/index.css` - Global styles (SHARED)

---

## Appendix B: Assumptions Made

1. **Deployment:** Assumed Supervisor for process management (based on error logs mentioning `supervisorctl`)
2. **Nginx:** Assumed Nginx as web server (config files present)
3. **CI/CD:** No CI/CD visible, assumed manual deployment
4. **Testing:** No test files found, assumed no automated tests
5. **Database:** MySQL confirmed from `go.mod` and SQL files
6. **Breakpoint:** `lg:` = 1024px (Tailwind default, not explicitly set in config)

---

**Document End**
