/**
 * about feature: shared hooks (core).
 */

import { useState, useCallback, useEffect } from 'react';
import { fetchAboutData } from './api';
import type { AboutState } from './types';

export function useAbout(): AboutState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<AboutState>({ loaded: false });

  const refresh = useCallback(async () => {
    const data = await fetchAboutData();
    setState({ loaded: data.ok });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
