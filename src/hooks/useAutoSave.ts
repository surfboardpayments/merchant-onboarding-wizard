'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounced auto-save hook.
 *
 * Watches arbitrary form data and calls the provided `onSave` callback after a
 * 1-second debounce. Exposes a saving indicator and the timestamp of the last
 * successful save so the UI can show "Saving..." / "Saved at ..." feedback.
 */
export function useAutoSave<T>(
  data: T,
  onSave: (data: T) => void | Promise<void>,
  debounceMs = 1000,
) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Keep a stable reference to the latest save function so we never have a
  // stale closure inside the timeout.
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Track whether this is the initial render – we don't want to trigger a
  // save the moment the component mounts.
  const isFirstRender = useRef(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Skip auto-save on the very first render.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    cancel();

    timerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await onSaveRef.current(data);
        setLastSaved(new Date());
      } catch {
        // Swallow – the consuming component can handle persistence errors
        // via the Zustand store's `errors` map if needed.
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);

    return cancel;
  }, [data, debounceMs, cancel]);

  // Clean up on unmount.
  useEffect(() => cancel, [cancel]);

  return { isSaving, lastSaved };
}
