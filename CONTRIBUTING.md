# Contributing to MonetizeeAI Bot

Thank you for your interest in contributing to MonetizeeAI Bot! This document outlines the branching strategy and contribution guidelines to ensure safe, collaborative development.

## Branch Strategy

### Main Branches

- **`main`** - Production/stable branch
  - Always deployable
  - Protected branch (no direct commits)
  - Only updated via pull requests from `develop`
  - Tagged releases come from this branch

- **`develop`** - Integration branch
  - Integration branch for all features
  - Should always be in a deployable state
  - All feature branches merge here first
  - Protected branch (no direct commits)

### Feature Branches

- **`feature/*`** - New features
  - Branch from: `develop`
  - Merge to: `develop`
  - Naming: `feature/description` (e.g., `feature/user-dashboard`, `feature/payment-integration`)

- **`fix/*`** - Bug fixes
  - Branch from: `develop` (or `main` for hotfixes)
  - Merge to: `develop` (or `main` for hotfixes)
  - Naming: `fix/issue-description` (e.g., `fix/login-error`, `fix/memory-leak`)

- **`hotfix/*`** - Critical production fixes
  - Branch from: `main`
  - Merge to: `main` AND `develop`
  - Naming: `hotfix/critical-issue` (e.g., `hotfix/security-patch`)

## Contribution Rules

### ⚠️ CRITICAL RULES

1. **NEVER commit directly to `main`**
   - All changes must go through pull requests
   - `main` is protected and requires review

2. **NEVER commit directly to `develop`**
   - Use feature/fix branches
   - Merge via pull requests

3. **Always verify before pushing**
   ```bash
   ./scripts/verify.sh
   ```
   - Must pass all checks
   - Fix any errors before creating PR

4. **Keep commits atomic**
   - One logical change per commit
   - Clear commit messages

5. **Update documentation**
   - If you change behavior, update relevant docs
   - Keep `README.md` and code comments in sync

## Pull Request Process

### Before Creating a PR

1. **Verify locally:**
   ```bash
   ./scripts/verify.sh
   ```

2. **Ensure your branch is up to date:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/your-feature
   git rebase develop  # or merge develop
   ```

3. **Test your changes:**
   - Frontend: `cd miniApp && npm run dev`
   - Backend: `go run .` (with proper .env)
   - Manual testing of affected features

### Creating a PR

1. Push your branch to origin
2. Create PR from your branch → `develop`
3. Fill out PR template (if available)
4. Wait for CI to pass
5. Request review from maintainers
6. Address review feedback
7. Once approved, maintainer will merge

### PR Requirements

- ✅ All CI checks must pass
- ✅ Code must be reviewed by at least one maintainer
- ✅ No merge conflicts
- ✅ Clear description of changes
- ✅ Related issues referenced (if applicable)

## Development Workflow

### Starting a New Feature

```bash
# 1. Ensure you're on develop and up to date
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes
# ... edit files ...

# 4. Verify changes
./scripts/verify.sh

# 5. Commit
git add .
git commit -m "feat: add your feature description"

# 6. Push and create PR
git push origin feature/your-feature-name
```

### Fixing a Bug

```bash
# 1. Create fix branch from develop
git checkout develop
git pull origin develop
git checkout -b fix/bug-description

# 2. Fix the bug
# ... edit files ...

# 3. Verify
./scripts/verify.sh

# 4. Commit and push
git add .
git commit -m "fix: description of bug fix"
git push origin fix/bug-description
```

### Hotfix (Critical Production Issue)

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue

# 2. Fix the issue
# ... edit files ...

# 3. Verify
./scripts/verify.sh

# 4. Commit
git add .
git commit -m "hotfix: critical issue description"

# 5. Push and create PR to main
git push origin hotfix/critical-issue

# 6. After merging to main, also merge to develop
```

## Code Style

### Frontend (React/TypeScript)

- Use TypeScript for all new code
- Follow existing component patterns
- Use functional components with hooks
- Run `npm run lint` before committing
- Run `npm run type-check` to verify types

### Backend (Go)

- Follow Go conventions (gofmt)
- Run `go fmt ./...` before committing
- Write tests for new functionality
- Document exported functions

## Testing

- Write tests for new features
- Ensure existing tests pass
- Test on both mobile and desktop (for frontend)
- Manual testing for critical paths

## Questions?

If you have questions about contributing:
- Check existing documentation
- Review similar PRs
- Ask in issues or discussions
- Contact maintainers

---

**Remember:** The goal is safe, collaborative development. When in doubt, ask!
