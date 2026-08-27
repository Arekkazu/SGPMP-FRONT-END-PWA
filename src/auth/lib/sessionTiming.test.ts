import { describe, expect, it } from 'vitest';
import {
  calculateSessionTiming,
  INACTIVITY_TIMEOUT_MS,
} from './sessionTiming';

describe('calculateSessionTiming', () => {
  it('usa 30 minutos desde la última actividad como límite de inactividad', () => {
    const now = 1_000_000;
    const timing = calculateSessionTiming(now, now, null);

    expect(timing.reason).toBe('inactivity');
    expect(timing.deadline).toBe(now + INACTIVITY_TIMEOUT_MS);
    expect(timing.remainingSeconds).toBe(30 * 60);
  });

  it('prioriza la expiración informada por la sesión cuando ocurre antes', () => {
    const now = 1_000_000;
    const expiresAt = now + 90_000;
    const timing = calculateSessionTiming(now, now, expiresAt);

    expect(timing.reason).toBe('expired');
    expect(timing.deadline).toBe(expiresAt);
    expect(timing.remainingSeconds).toBe(90);
  });

  it('devuelve cero cuando el plazo ya terminó', () => {
    const now = 1_000_000;
    const timing = calculateSessionTiming(now, now - INACTIVITY_TIMEOUT_MS - 1, null);

    expect(timing.reason).toBe('inactivity');
    expect(timing.remainingSeconds).toBe(0);
  });
});
