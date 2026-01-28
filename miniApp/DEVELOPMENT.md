# Frontend Development Guide

This document describes the development workflow for the MonetizeeAI Bot frontend (miniApp).

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm (comes with Node.js)

## Initial Setup

### 1. Install Dependencies

```bash
cd miniApp
npm install
```

This will:
- Install all npm dependencies
- Install Git hooks via Husky (via `prepare` script)
- Set up lint-staged for pre-commit checks

### 2. Verify Installation

After installation, verify that hooks are set up:

```bash
ls -la .husky/
```

You should see:
- `pre-commit` - Runs lint-staged on staged files
- `pre-push` - Runs full verification before push

## Development Workflow

### Local Development

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Make changes:**
   - Edit TypeScript/React files
   - Git hooks will automatically run on commit/push

### Git Hooks

#### Pre-Commit Hook

Runs automatically when you `git commit`:

- **What it does:**
  - Runs `eslint --fix` on staged `.ts` and `.tsx` files
  - Auto-fixes linting issues when possible
  - Only checks files you're committing (not entire project)

- **If it fails:**
  - Fix the linting errors shown
  - Stage the fixed files: `git add <files>`
  - Commit again

#### Pre-Push Hook

Runs automatically when you `git push`:

- **What it does:**
  - Runs `npm run verify` which includes:
    1. TypeScript type check (`tsc --noEmit`)
    2. ESLint (`npm run lint`)
    3. Build (`npm run build`)

- **If it fails:**
  - Fix the errors shown
  - Type errors: Fix TypeScript issues
  - Lint errors: Fix ESLint issues (or run `npm run lint` to see all)
  - Build errors: Fix build issues
  - Push again

### Manual Verification

You can run verification manually at any time:

```bash
npm run verify
```

This runs:
1. `type-check` - TypeScript type checking (hard gate)
2. `lint` - ESLint (warnings allowed, but errors fail)
3. `build` - Production build (hard gate)

**Expected behavior:**
- ✅ Exit code 0 = All checks passed
- ❌ Exit code 1 = One or more checks failed

### Individual Commands

```bash
# Type check only
npm run type-check

# Lint only
npm run lint

# Build only
npm run build
```

## Expected Failure Cases

### 1. TypeScript Type Errors

**Symptom:**
```
error TS2304: Cannot find name 'SomeType'.
```

**Solution:**
- Fix the TypeScript error
- Ensure types are imported correctly
- Check `tsconfig.json` if path issues

### 2. ESLint Errors

**Symptom:**
```
✖ 1 problem (1 error, 0 warnings)
```

**Solution:**
- Fix the ESLint error
- Or run `npm run lint` to see all errors
- Pre-commit hook will auto-fix some issues

**Note:** ESLint warnings are allowed, but errors will fail verification.

### 3. Build Failures

**Symptom:**
```
✖ Build failed
```

**Solution:**
- Check build output for specific errors
- Common issues:
  - Import errors
  - Type errors (should be caught by type-check)
  - Missing dependencies

### 4. Hook Not Running

**Symptom:**
- Git hooks don't execute on commit/push

**Solution:**
```bash
# Reinstall hooks
npm install

# Or manually run prepare script
npm run prepare
```

### 5. Permission Denied

**Symptom:**
```
Permission denied: .husky/pre-commit
```

**Solution:**
```bash
chmod +x .husky/pre-commit .husky/pre-push
```

## Bypassing Hooks (Not Recommended)

If you absolutely need to bypass hooks (e.g., emergency hotfix):

```bash
# Skip pre-commit hook
git commit --no-verify -m "message"

# Skip pre-push hook
git push --no-verify
```

**⚠️ Warning:** Only use this in emergencies. Hooks exist to prevent broken code from entering the repository.

## Troubleshooting

### Hooks Not Working on macOS/Linux

1. Ensure hooks are executable:
   ```bash
   chmod +x .husky/pre-commit .husky/pre-push
   ```

2. Check Git version (Husky requires Git 2.9+):
   ```bash
   git --version
   ```

3. Reinstall hooks:
   ```bash
   npm install
   ```

### Lint-Staged Not Running

1. Check `package.json` has `lint-staged` config:
   ```json
   "lint-staged": {
     "*.{ts,tsx}": ["eslint --fix"]
   }
   ```

2. Verify lint-staged is installed:
   ```bash
   npm list lint-staged
   ```

### Type Check Fails But Code Works

TypeScript is strict. If type check fails:
- Fix the type errors (recommended)
- Or use type assertions carefully: `as Type`
- Check `tsconfig.json` settings

## CI/CD Integration

The `verify` command is designed to match CI checks:
- Same checks run in CI
- If `verify` passes locally, CI should pass
- If `verify` fails locally, CI will fail

## Best Practices

1. **Run verify before pushing:**
   ```bash
   npm run verify
   ```

2. **Fix linting issues early:**
   - Pre-commit hook will auto-fix many issues
   - Review auto-fixes before committing

3. **Keep dependencies updated:**
   ```bash
   npm outdated
   npm update
   ```

4. **Don't skip hooks unless absolutely necessary**

---

**For backend development, see:** `../DEPLOY.md`
