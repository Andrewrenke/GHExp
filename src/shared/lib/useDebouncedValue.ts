import {useEffect, useState} from 'react';

// Small, dependency-free debounce. Pulling in lodash for a single
// hook would ship ~70KB of parseable JS for no reason.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
