'use client';

import { useState, useEffect } from 'react';

/**
 * Subscribe to a CSS media query and return whether it currently matches.
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // SSR guard – matchMedia is only available in the browser.
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(query);

    // Sync initial value.
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
