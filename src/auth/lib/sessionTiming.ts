export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_WARNING_SECONDS = 5 * 60;

export type SessionTimeoutReason = 'inactivity' | 'expired';

export interface SessionTiming {
  deadline: number;
  reason: SessionTimeoutReason;
  remainingSeconds: number;
}

export function calculateSessionTiming(
  now: number,
  lastActivityAt: number,
  expiresAt: number | null
): SessionTiming {
  const inactivityDeadline = lastActivityAt + INACTIVITY_TIMEOUT_MS;
  const absoluteDeadline = expiresAt ?? Number.POSITIVE_INFINITY;
  const reason: SessionTimeoutReason = absoluteDeadline <= inactivityDeadline
    ? 'expired'
    : 'inactivity';
  const deadline = Math.min(inactivityDeadline, absoluteDeadline);

  return {
    deadline,
    reason,
    remainingSeconds: Math.max(0, Math.ceil((deadline - now) / 1000)),
  };
}
