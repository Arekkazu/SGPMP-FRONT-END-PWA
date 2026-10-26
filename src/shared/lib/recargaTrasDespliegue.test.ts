// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 N-01: la versión nueva se aplica sola tras un despliegue |
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarRecargaPorVersionNueva, instalarRecargaTrasDespliegue, recargarConVersionNueva } from './recargaTrasDespliegue';

const reload = vi.fn();
const locationOriginal = window.location;

function errorDeChunk(): Event {
  const evento = new Event('vite:preloadError', { cancelable: true });
  window.dispatchEvent(evento);
  return evento;
}

describe('recarga tras despliegue', () => {
  beforeEach(() => {
    reload.mockClear();
    sessionStorage.clear();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...locationOriginal, reload } });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: locationOriginal });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
  });

  it('recarga una sola vez ante un chunk que falta, sin bucle', async () => {
    instalarRecargaTrasDespliegue();

    expect(errorDeChunk().defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

    // Si tras recargar el chunk sigue faltando, el error llega a la página.
    expect(errorDeChunk().defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('espera a que el service worker nuevo tome el control antes de recargar', async () => {
    const sw = new EventTarget();
    const registro = { installing: {}, waiting: null, update: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: Object.assign(sw, { getRegistration: vi.fn().mockResolvedValue(registro) }),
    });

    const recarga = recargarConVersionNueva();
    await vi.waitFor(() => expect(registro.update).toHaveBeenCalled());
    expect(reload).not.toHaveBeenCalled();

    sw.dispatchEvent(new Event('controllerchange'));
    await recarga;
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('N-01: recarga una vez cuando el service worker nuevo toma el control', () => {
    const sw = Object.assign(new EventTarget(), { controller: {} });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });

    instalarRecargaPorVersionNueva();
    sw.dispatchEvent(new Event('controllerchange'));
    sw.dispatchEvent(new Event('controllerchange'));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('N-01: la primera instalación (sin controlador previo) no recarga', () => {
    const sw = Object.assign(new EventTarget(), { controller: null });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });

    instalarRecargaPorVersionNueva();
    sw.dispatchEvent(new Event('controllerchange'));

    expect(reload).not.toHaveBeenCalled();
  });
});
