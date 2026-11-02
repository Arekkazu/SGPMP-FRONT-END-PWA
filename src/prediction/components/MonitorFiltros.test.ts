// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-10 RF-66: filtros del monitor → parámetros del backend |
import { describe, expect, it } from 'vitest';
import { aFiltrosApi, MONITOR_FILTROS_VACIO } from './MonitorFiltros';

const AHORA = new Date('2026-11-02T15:00:00Z');

describe('aFiltrosApi', () => {
  it('por defecto: últimas 24 h, con las de prueba', () => {
    expect(aFiltrosApi(MONITOR_FILTROS_VACIO, AHORA)).toEqual({ incluir_sombra: true, desde: '2026-11-01T15:00:00.000Z' });
  });
  it('animal, nivel 0 y solo con alerta viajan; las fechas a mano reemplazan el rango rápido', () => {
    const api = aFiltrosApi({ ...MONITOR_FILTROS_VACIO, id_activo_biologico: '4', nivel_riesgo: '0', solo_con_alerta: true, incluir_sombra: false, rango: '', fecha_desde: '2026-10-01' }, AHORA);
    expect(api).toMatchObject({ id_activo_biologico: 4, nivel_riesgo: 0, solo_con_alerta: true, incluir_sombra: false });
    expect(api.desde).toBeTruthy();
    expect(api.hasta).toBeUndefined();
  });
  it('7 días', () => {
    expect(aFiltrosApi({ ...MONITOR_FILTROS_VACIO, rango: '7d' }, AHORA).desde).toBe('2026-10-26T15:00:00.000Z');
  });
});
