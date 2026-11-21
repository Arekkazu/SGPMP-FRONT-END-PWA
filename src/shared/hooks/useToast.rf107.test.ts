// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107: un éxito a la vez, cola de errores, saturación y misma operación |
// | 2026-11-21 | Arekkazu | INC-M08-385-G026 RF-107: metadatos de la 8.5, modal crítico en el historial y cola descartada |
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { descartarCola, dismissToast, limpiarToasts, pushToast, registrarModalCritico, useToast } from './useToast';

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

  it('registra cuándo se hizo visible, cuánto se vio y si bloqueó la interfaz (8.5)', () => {
    vi.setSystemTime(new Date('2026-11-21T14:00:00Z'));
    const { result } = renderHook(() => useToast());
    act(() => { pushToast('success', 'Guardado'); ['A', 'B', 'C', 'D'].forEach((x) => pushToast('error', x)); });
    act(() => { vi.advanceTimersByTime(5000); });  // el éxito expira solo
    act(() => { vi.advanceTimersByTime(25_000); dismissToast(result.current.toasts[0].id); });  // A se cierra; D entra
    const [exito, a, , , d] = result.current.historial;
    expect(exito).toMatchObject({ estado: 'expirado', duracion_visible: 5000, bloquea_interfaz: false,
      tipo_retroalimentacion: 'CONFIRMACION_EXITOSA' });
    expect(a).toMatchObject({ estado: 'cerrado', duracion_visible: 30_000, tipo_retroalimentacion: 'ERROR_CON_ACCION' });
    // D llegó a las 14:00 y se vio a las 14:00:30: la hora del historial es la de aparición.
    expect(d.timestamp_mostrado! - d.creado).toBe(30_000);

    let cerrarModal = () => {};
    act(() => { cerrarModal = registrarModalCritico('¿Cerrar el período?'); });
    act(() => { vi.advanceTimersByTime(30_000); cerrarModal(); });
    expect(result.current.historial.at(-1)).toMatchObject({ title: '¿Cerrar el período?', bloquea_interfaz: true,
      tipo_retroalimentacion: 'CONFIRMACION_ACCION_CRITICA', estado: 'cerrado', duracion_visible: 30_000 });
  });

  it('al salir del módulo descarta la cola; los visibles se quedan (8.3)', () => {
    const { result } = renderHook(() => useToast());
    act(() => { ['A', 'B', 'C', 'D'].forEach((x) => pushToast('error', x)); });
    act(() => { descartarCola(); });
    expect(result.current.cola).toEqual([]);
    act(() => { dismissToast(result.current.toasts[0].id); });
    expect(result.current.toasts.map((t) => t.title)).toEqual(['B', 'C']);
    expect(result.current.historial.find((h) => h.title === 'D')?.estado).toBe('descartado');
  });
});
