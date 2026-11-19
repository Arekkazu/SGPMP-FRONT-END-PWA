// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107: un éxito a la vez, cola de errores, saturación y misma operación |
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dismissToast, limpiarToasts, pushToast, useToast } from './useToast';

describe('Cola de avisos (RF-107 8.2 y 8.3)', () => {
  beforeEach(() => { vi.useFakeTimers(); limpiarToasts(); });
  afterEach(() => { vi.useRealTimers(); });

  it('el éxito nuevo reemplaza al anterior y desaparece a los 5 segundos', () => {
    const { result } = renderHook(() => useToast());
    act(() => { pushToast('success', 'Primero'); pushToast('success', 'Segundo'); });
    expect(result.current.toasts.map((t) => t.title)).toEqual(['Segundo']);
    act(() => { vi.advanceTimersByTime(4999); });
    expect(result.current.toasts).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('muestra hasta 3 errores, encola el resto y al cerrar uno entra el siguiente', () => {
    const { result } = renderHook(() => useToast());
    act(() => { ['A', 'B', 'C', 'D'].forEach((x) => pushToast('error', x)); });
    expect(result.current.toasts.map((t) => t.title)).toEqual(['A', 'B', 'C']);
    expect(result.current.cola.map((t) => t.title)).toEqual(['D']);
    act(() => { dismissToast(result.current.toasts[0].id); });
    expect(result.current.toasts.map((t) => t.title)).toEqual(['B', 'C', 'D']);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.toasts).toHaveLength(3);
  });

  it('con más de 5 errores pendientes avisa la saturación y guarda el historial de la sesión', () => {
    const { result } = renderHook(() => useToast());
    act(() => { ['A', 'B', 'C', 'D', 'E', 'F'].forEach((x) => pushToast('error', x)); });
    expect(result.current.saturado).toBe(true);
    expect(result.current.pendientes).toBe(6);
    expect(result.current.historial.map((h) => h.estado)).toEqual(['activo', 'activo', 'activo', 'en_cola', 'en_cola', 'en_cola']);
  });

  it('la misma operación actualiza el aviso visible en vez de apilar otro', () => {
    const { result } = renderHook(() => useToast());
    act(() => { pushToast('error', 'Falló', 'intento 1', { idOperacion: 'op-1' }); });
    act(() => { pushToast('error', 'Falló', 'intento 2', { idOperacion: 'op-1' }); });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].description).toBe('intento 2');
    act(() => { dismissToast(result.current.toasts[0].id); });
    act(() => { pushToast('error', 'Falló', 'intento 3', { idOperacion: 'op-1' }); });
    expect(result.current.toasts).toHaveLength(0);
  });
});
