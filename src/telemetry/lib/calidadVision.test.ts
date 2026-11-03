// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-03 | Arekkazu | RF-62: observaciones de visión evaluadas (antes datos de ejemplo) |
import { describe, expect, it } from 'vitest';
import { flagsActivos, valoresEvaluados } from './calidadVision';
import type { ObservacionVisionEvaluada } from '../types';

const OBS: ObservacionVisionEvaluada = {
  id_observacion_vision: 1, id_dispositivo_iot: 9, serial_camara: 'CAM-1', id_infraestructura: 4, nombre_area: 'Galpón A',
  fecha_inicio_ventana: null, fecha_observacion: '2026-11-03T12:00:00Z', n_individuos_observados: 37,
  cobertura_ventana: '0.71', fps_efectivo: '8.4', cantidad_tracks_perdidos: 6, estado_calibracion: 'CALIBRADO',
  indice_calidad_vision: '52.90', clasificacion_calidad: 'DEGRADADA', es_apto_para_ia: true, es_confianza_baja: true,
  apto_para_nic41: false, fecha_evaluacion_calidad: '2026-11-03T12:01:00Z',
  flags_detectados: {
    tracking_inestable: { activo: true, n_tracks_perdidos: 6, tracks_perdidos_tolerables: 5 },
    fps_insuficiente: { activo: true, fps_efectivo: '8.4', fps_configurado: '12' },
    cobertura_baja: { activo: false, cobertura_ventana: '0.71' },
    sin_linea_base: { activo: false },
  },
};

describe('calidad de visión', () => {
  it('los flags del backend son objetos: solo cuentan los activos', () => {
    // FlagChips toma cualquier objeto como activo; sin convertir, mostraría los cuatro.
    expect(flagsActivos(OBS.flags_detectados)).toEqual({
      tracking_inestable: true, fps_insuficiente: true, cobertura_baja: false, sin_linea_base: false,
    });
    expect(flagsActivos(null)).toEqual({});
  });

  it('el detalle usa los valores con que se evaluó, guardados en los flags', () => {
    expect(valoresEvaluados(OBS)).toEqual({
      cobertura: 0.71, fpsEfectivo: 8.4, fpsConfigurado: 12, tracksPerdidos: 6, tracksTolerables: 5,
    });
  });

  it('sin evaluar no inventa la configuración', () => {
    const v = valoresEvaluados({ ...OBS, flags_detectados: null });
    expect(v.fpsConfigurado).toBeNull();
    expect(v.tracksTolerables).toBeNull();
  });
});
