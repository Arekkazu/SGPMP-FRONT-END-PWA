// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 N-02: el historial del modelo solo con sus cambios de estado |
// | 2026-10-29 | Arekkazu | QA-M04-27-10 CU05 H-09/H-05 RF-69: guardar notas no es una transición "Aprobada" |
// | 2026-10-31 | Arekkazu | RFC-010 RF-69: estado SOMBRA, versión por animal y fuente de datos |
import type { EventoAuditoriaM04Response } from '../types';

/** Los eventos de la bitácora M04 que cambian el estado de una versión (RF-69). */
const CAMBIOS_DE_ESTADO = new Set([
  'VERSION_REGISTRADA', 'VERSION_APROBADA', 'VERSION_RECHAZADA', 'VERSION_EN_SOMBRA', 'VERSION_ACTIVADA', 'VERSION_DEPRECADA',
]);

/**
 * CU05 H-09 / H-05: hasta el backend #866 guardar notas se auditaba como VERSION_APROBADA
 * ("Aprobada · Veterinario", incluso sobre una RECHAZADO). La bitácora es inmutable: esos
 * eventos se reconocen por su payload. Ahora llegan como NOTAS_REGISTRADAS.
 */
function esNota(e: EventoAuditoriaM04Response): boolean {
  return e.payload_evento?.accion === 'NOTAS_REGISTRADAS';
}

/**
 * N-02: el historial mezclaba más de 10 HISTORIAL_CONSULTADO (cada vez que alguien
 * abría el detalle) con VERSION_APROBADA registrado dos veces. Quedan los cambios de
 * estado, sin repetir el mismo dos veces seguidas, del más antiguo al más reciente.
 */
export function transicionesDeEstado(eventos: EventoAuditoriaM04Response[]): EventoAuditoriaM04Response[] {
  const ordenados = eventos
    .filter((e) => e.entidad_referencia === 'version_modelo' && CAMBIOS_DE_ESTADO.has(e.tipo_evento) && !esNota(e))
    .sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento));
  return ordenados.filter((e, i) => i === 0 || e.tipo_evento !== ordenados[i - 1].tipo_evento);
}
