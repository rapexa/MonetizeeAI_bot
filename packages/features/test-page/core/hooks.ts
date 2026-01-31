/**
 * test-page feature: shared hooks (core).
 */

import { useState, useCallback, useEffect } from 'react';
import { fetchTestData } from './api';
import type { TestPageState } from './types';

export function useTestPage(): TestPageState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<TestPageState>({ loaded: false });

  const refresh = useCallback(async () => {
    const data = await fetchTestData();
    setState({ loaded: data.ok });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
