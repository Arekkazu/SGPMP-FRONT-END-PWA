import { describe, expect, it } from 'vitest';
import { lineasEvento } from './FichaIntegralView';

const LINEA_EVENTO = lineasEvento();
import { FECHA_NUMERICA, formatearFecha } from '../../shared/i18n/formato';

const ISO = '2026-10-08T01:50:13.682786+00:00';
const DIA = formatearFecha(ISO, FECHA_NUMERICA);

describe('Ficha integral — líneas legibles (#298 §5.1)', () => {
  it('distingue vacunación de tratamiento y no muestra nombres internos', () => {
    expect(LINEA_EVENTO.sanitario({ tipo_evento: 'SANITARIO', tipo_sanitario: 'VACUNACION', medicamento: 'Aftosa', dosis: '2.0000', unidad_dosis: 'ml', fecha: ISO }))
      .toBe(`${DIA} · Vacunacion · Aftosa 2 ml`);
  });
  it('crecimiento con valor formateado', () => {
    expect(LINEA_EVENTO.crecimiento({ variable: 'PESO', valor: '0.50', unidad: 'kg', fecha: ISO })).toBe(`${DIA} · Peso · 0,5 kg`);
  });
});
