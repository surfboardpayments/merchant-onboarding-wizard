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
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  // ── Fetch the latest statuses ───────────────────────────────────────────

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
        stopPolling();
      }
    } catch {
      // Silently swallow – we'll retry on the next interval.
    }
  }, []);

  // ── Polling lifecycle ───────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // already polling
    setIsPolling(true);
    // Fire immediately, then at intervals.
    fetchStatuses();
    intervalRef.current = setInterval(fetchStatuses, POLL_INTERVAL_MS);
  }, [fetchStatuses]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Auto-start polling when we have active targets, auto-stop when we don't.
  useEffect(() => {
    if (targets.length > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [targets.length, startPolling, stopPolling]);

  return {
    statuses,
    isPolling,
    startPolling,
    stopPolling,
  };
}
