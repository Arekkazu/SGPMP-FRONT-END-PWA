// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-62: clases y aptitud del índice de calidad de visión |
import { describe, expect, it } from 'vitest';
import { OBSERVACIONES_VISION, evaluarVision } from './calidadVisionMock';

const [calibrada, enCalibracion, degradada, sinLineaBase] = OBSERVACIONES_VISION.map((o) => evaluarVision(o));

describe('evaluarVision', () => {
  it('calibrada con buena cobertura es ÓPTIMA y apta para IA', () => {
    expect(calibrada).toMatchObject({ indice: 87, clase: 'OPTIMA', aptoParaIa: true, confianzaBaja: false });
  });
  it('EN_CALIBRACION aplica el factor 0.70', () => {
    expect(enCalibracion.factor).toBe(0.7);
    expect(enCalibracion.clase).toBe('DEGRADADA');
    expect(enCalibracion.confianzaBaja).toBe(true);
  });
  it('tracking inestable y fps bajos bajan el índice y levantan flags', () => {
    expect(degradada.flags).toMatchObject({ tracking_inestable: true, fps_insuficiente: true, cobertura_baja: true });
  });
  it('SIN_LINEA_BASE anula el índice y no es apta para IA', () => {
    expect(sinLineaBase).toMatchObject({ indice: 0, clase: 'NO_APTA', aptoParaIa: false });
  });
});
