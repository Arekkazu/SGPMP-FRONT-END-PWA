/**
 * Tras un despliegue, una pestaña abierta con el bundle anterior pide chunks
 * cuyos hashes ya no existen (404) y la página queda en "No se pudo mostrar
 * esta sección". Recargar no basta: el service worker viejo vuelve a servir su
 * index.html precacheado mientras el nuevo se instala. Hay que esperar a que el
 * nuevo tome el control y recargar entonces.
 */

const MARCA = 'sgpmp:recarga-por-chunk';
/** Si el chunk sigue faltando tras recargar, no se reintenta en bucle. */
const VENTANA_SIN_REINTENTO_MS = 30_000;
const ESPERA_SW_MS = 8_000;

export async function recargarConVersionNueva(): Promise<void> {
  const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined;
  const registro = await sw?.getRegistration().catch(() => undefined);
  if (sw && registro) {
    const tomaControl = new Promise<void>((listo) => sw.addEventListener('controllerchange', () => listo(), { once: true }));
    await registro.update().catch(() => undefined);
    if (registro.installing || registro.waiting) {
      await Promise.race([tomaControl, new Promise<void>((listo) => setTimeout(listo, ESPERA_SW_MS))]);
    }
  }
  window.location.reload();
}

/** Vite dispara `vite:preloadError` cuando falla un `import()` dinámico (React.lazy). */
export function instalarRecargaTrasDespliegue(): void {
  window.addEventListener('vite:preloadError', (event) => {
    try {
      if (Date.now() - Number(sessionStorage.getItem(MARCA) ?? 0) < VENTANA_SIN_REINTENTO_MS) return;
      sessionStorage.setItem(MARCA, String(Date.now()));
    } catch {
      return;
    }
    event.preventDefault();
    void recargarConVersionNueva();
  });
}
