# Branching Strategy Guide

This document provides a visual and detailed explanation of the branching strategy used in MonetizeeAI Bot.

## Branch Flow Diagram

```
main (production)
  ↑
  │ (release)
  │
develop (integration)
  ↑
  │ (merge)
  │
feature/* ──┐
fix/* ──────┤
hotfix/* ───┘ (from main, then merge to develop)
```

## Branch Types Explained

### 1. `main` Branch

**Purpose:** Production-ready code

**Characteristics:**
- Always stable and deployable
- Protected branch (no direct commits)
- Only updated via pull requests from `develop`
- Tagged releases come from this branch
- Should never be broken

**When to use:**
- Creating hotfix branches (for critical production issues)
- Tagging releases
- Viewing production code

**Workflow:**
```
develop → PR → main (after review and approval)
```

### 2. `develop` Branch

**Purpose:** Integration branch for all features

**Characteristics:**
- Should always be in a deployable state
- All feature branches merge here first
- Protected branch (no direct commits)
- Used for staging/testing before production

**When to use:**
- Starting new feature branches
- Starting bug fix branches
- Integration testing

**Workflow:**
```
feature/* → PR → develop
fix/* → PR → develop
```

### 3. `feature/*` Branches

**Purpose:** Development of new features

**Characteristics:**
- Branch from: `develop`
- Merge to: `develop`
- Temporary branches (deleted after merge)
- Named descriptively: `feature/description`

**Examples:**
- `feature/user-dashboard`
- `feature/payment-integration`
- `feature/ai-coach-enhancement`

**Workflow:**
```bash
# Create
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# Develop
# ... make changes ...

# Merge back
git checkout develop
git merge feature/new-feature
# or via PR
```

### 4. `fix/*` Branches

**Purpose:** Bug fixes

**Characteristics:**
- Branch from: `develop` (or `main` for critical fixes)
- Merge to: `develop` (or `main` for critical fixes)
- Temporary branches (deleted after merge)
- Named descriptively: `fix/issue-description`

**Examples:**
- `fix/login-error`
- `fix/memory-leak`
- `fix/mobile-layout-issue`

**Workflow:**
```bash
# Create
git checkout develop
git pull origin develop
git checkout -b fix/bug-description

# Fix
# ... fix the bug ...

# Merge back
git checkout develop
git merge fix/bug-description
# or via PR
```

### 5. `hotfix/*` Branches

**Purpose:** Critical production fixes that can't wait for normal release cycle

**Characteristics:**
- Branch from: `main`
- Merge to: `main` AND `develop`
- Temporary branches (deleted after merge)
- Named descriptively: `hotfix/critical-issue`

**Examples:**
- `hotfix/security-patch`
- `hotfix/critical-bug`
- `hotfix/data-loss-fix`

**Workflow:**
```bash
# Create from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue

# Fix
# ... fix the critical issue ...

# Merge to main (via PR)
git push origin hotfix/critical-issue
# Create PR: hotfix/critical-issue → main

# After merging to main, also merge to develop
git checkout develop
git pull origin develop
git merge main  # or cherry-pick the fix
```

## Release Process

### Standard Release (from develop)

1. **Prepare release:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/v1.2.0
   ```

2. **Final testing and fixes:**
   - Fix any last-minute bugs
   - Update version numbers
   - Update changelog

3. **Merge to main:**
   ```bash
   git checkout main
   git merge release/v1.2.0
   git tag -a v1.2.0 -m "Release version 1.2.0"
   git push origin main --tags
   ```

4. **Merge back to develop:**
   ```bash
   git checkout develop
   git merge main
   git push origin develop
   ```

### Hotfix Release (from main)

1. **Create hotfix branch:**
   ```bash
   git checkout main
   git checkout -b hotfix/critical-issue
   ```

2. **Fix the issue:**
   - Make necessary changes
   - Test thoroughly
   - Verify with `./scripts/verify.sh`

3. **Merge to main:**
   ```bash
   git checkout main
   git merge hotfix/critical-issue
   git tag -a v1.2.1 -m "Hotfix: critical issue"
   git push origin main --tags
   ```

4. **Merge to develop:**
   ```bash
   git checkout develop
   git merge main
   git push origin develop
   ```

## Branch Naming Conventions

### Format
```
<type>/<description>
```

### Types
- `feature/` - New features
- `fix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `release/` - Release preparation

### Description Rules
- Use kebab-case (lowercase with hyphens)
- Be descriptive but concise
- Examples:
  - ✅ `feature/user-dashboard`
  - ✅ `fix/login-authentication-error`
  - ✅ `hotfix/security-patch`
  - ❌ `feature/new`
  - ❌ `fix/bug`
  - ❌ `FEATURE/DASHBOARD`

## Best Practices

### 1. Keep Branches Short-Lived
- Merge and delete branches promptly
- Don't let branches diverge too far from base

### 2. Regular Sync with Base
- Regularly pull and rebase/merge from base branch
- Avoid large merge conflicts

### 3. Clear Commit Messages
- Use conventional commit format when possible
- Be descriptive: "fix: resolve login timeout issue" not "fix bug"

### 4. Verify Before Merge
- Always run `./scripts/verify.sh` before creating PR
- Ensure CI passes before requesting review

### 5. One Feature Per Branch
- Don't mix multiple features in one branch
- Keep branches focused

## Common Scenarios

### Scenario 1: Starting a New Feature

```bash
# 1. Update local develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/user-profile-page

# 3. Develop feature
# ... make changes ...

# 4. Verify
./scripts/verify.sh

# 5. Commit and push
git add .
git commit -m "feat: add user profile page"
git push origin feature/user-profile-page

# 6. Create PR: feature/user-profile-page → develop
```

### Scenario 2: Fixing a Bug Found in develop

```bash
# 1. Update local develop
git checkout develop
git pull origin develop

# 2. Create fix branch
git checkout -b fix/mobile-layout-overflow

# 3. Fix the bug
# ... make changes ...

# 4. Verify
./scripts/verify.sh

# 5. Commit and push
git add .
git commit -m "fix: resolve mobile layout overflow issue"
git push origin fix/mobile-layout-overflow

# 6. Create PR: fix/mobile-layout-overflow → develop
```

### Scenario 3: Critical Production Bug

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/security-vulnerability

# 2. Fix the issue
# ... make changes ...

# 3. Verify
./scripts/verify.sh

# 4. Commit and push
git add .
git commit -m "hotfix: patch security vulnerability in auth"
git push origin hotfix/security-vulnerability

# 5. Create PR: hotfix/security-vulnerability → main
# 6. After merge, also merge to develop
```

## Visual Workflow Summary

```
┌─────────┐
│  main   │ ← Production (protected)
└────┬────┘
     │
     │ (release)
     │
┌────▼────┐
│ develop │ ← Integration (protected)
└────┬────┘
     │
     ├─── feature/user-dashboard ──┐
     ├─── feature/payment ──────────┤
     ├─── fix/login-error ──────────┤
     └─── fix/mobile-layout ─────────┘
          │
          │ (merge via PR)
          │
          ▼
     ┌─────────┐
     │ develop │
     └─────────┘
```

---

**Remember:** The goal is to maintain a clean, predictable workflow that prevents production issues and enables safe collaboration.
