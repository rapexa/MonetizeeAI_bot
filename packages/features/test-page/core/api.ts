/**
 * test-page feature: API layer (core).
 * Shared between desktop and mobile.
 */

export async function fetchTestData(): Promise<{ ok: boolean }> {
  return Promise.resolve({ ok: true });
}
