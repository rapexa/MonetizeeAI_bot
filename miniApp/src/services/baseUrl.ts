/**
 * Phase 2: Single source of truth for API base URL.
 * - Accepts VITE_API_BASE_URL (with or without trailing slash).
 * - Result always has NO trailing slash (canonical /api/v1).
 * - Production build default: https://sianmarketing.com/api/v1
 * - Dev: set in env.example only (e.g. http://localhost:8080/api/v1), never hardcode in source.
 */

export function normalizeBaseURL(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

export function getConfiguredApiBaseURL(): string {
  const envBase = (import.meta.env?.VITE_API_BASE_URL ?? '').trim();
  const base = envBase || 'https://sianmarketing.com/api/v1';
  return normalizeBaseURL(base);
}

export function getOriginFromApiBaseURL(apiBase: string): string {
  try {
    const u = new URL(apiBase);
    return `${u.protocol}//${u.host}`;
  } catch {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return apiBase;
  }
}
