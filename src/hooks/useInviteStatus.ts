'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InviteTarget {
  /** Person ID in the onboarding store */
  personId: string;
  /** Invite token issued when the invite was sent */
  token: string;
}

export type InviteStatus =
  | 'not_started'
  | 'invite_sent'
  | 'completed'
  | 'expired';

export interface InviteStatusResult {
  personId: string;
  status: InviteStatus;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 10_000;

/**
 * Polls the server for updated invite statuses for people who have been
 * sent UBO data-collection invite links.
 *
 * Polling starts automatically when `targets` is a non-empty array and stops
 * when all targets reach a terminal state (`completed` | `expired`) or when the
 * component un-mounts.
 */
export function useInviteStatus(targets: InviteTarget[]) {
  const [statuses, setStatuses] = useState<InviteStatusResult[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The polling callback is created once and then read from a timer, so it
  // reaches the latest targets through a ref. The ref is written in an effect,
  // not during render, so a re-render that React discards cannot corrupt it.
  const targetsRef = useRef(targets);
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  // ── Fetch the latest statuses ───────────────────────────────────────────

  /**
   * Declared ahead of both callbacks: `fetchStatuses` needs to stop the timer
   * when every invite reaches a terminal state, and reaching for `stopPolling`
   * from there would read it before it exists.
   */
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
    const current = targetsRef.current;
    if (current.length === 0) return;

    try {
      const res = await fetch('/api/invites/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: current.map((t) => ({ personId: t.personId, token: t.token })),
        }),
      });

      if (!res.ok) return;

      const data: { statuses: InviteStatusResult[] } = await res.json();
      setStatuses(data.statuses ?? []);

      // Stop polling once every target has reached a terminal state.
      const allTerminal = data.statuses.every(
        (s) => s.status === 'completed' || s.status === 'expired',
      );

      if (allTerminal) {
        clearTimer();
        setIsPolling(false);
      }
    } catch {
      // Silently swallow – we'll retry on the next interval.
    }
  }, [clearTimer]);

  // ── Polling lifecycle ───────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // already polling
    setIsPolling(true);
    // Fire immediately, then at intervals.
    fetchStatuses();
    intervalRef.current = setInterval(fetchStatuses, POLL_INTERVAL_MS);
  }, [fetchStatuses]);

  const stopPolling = useCallback(() => {
    clearTimer();
    setIsPolling(false);
  }, [clearTimer]);

  // Auto-start polling when we have active targets, auto-stop when we don't.
  // The interval is an external system and `isPolling` only mirrors whether it
  // is running, so setting it here is the effect doing its job rather than
  // state derived from props.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (targets.length > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [targets.length, startPolling, stopPolling]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    statuses,
    isPolling,
    startPolling,
    stopPolling,
  };
}
