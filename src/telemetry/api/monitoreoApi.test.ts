/**
 * #317 — el historial con lecturas tumbaba la vista: el backend envía los
 * Decimal como texto ("36.0000") y EstadisticasCards hacía toFixed sobre él.
 */
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../shared/api/http';
import { monitoreoApi } from './monitoreoApi';

vi.mock('../../shared/api/http', () => ({ http: { get: vi.fn() } }));

describe('monitoreoApi.historial', () => {
  it('convierte los Decimal en texto a number y conserva null', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        items: [{ id_telemetria: 60, valor: '36.0000', valor_ajustado: null, nivel_bateria_pct: '87.50', calidad_senal_rssi: null, calidad_senal_snr: '-7.25' }],
        estadisticas: [{ tipo_variable: 'TEMPERATURA', valor_minimo: '36.0000', valor_maximo: '40.0000', valor_promedio: '38.0000000000000000', total_lecturas: 3 }],
      },
    } as never);

    const r = await monitoreoApi.historial({ fecha_inicio: 'a', fecha_fin: 'b' } as never);

    expect(r.items[0]).toMatchObject({ valor: 36, valor_ajustado: null, nivel_bateria_pct: 87.5, calidad_senal_rssi: null, calidad_senal_snr: -7.25 });
    expect(r.estadisticas[0]).toMatchObject({ valor_minimo: 36, valor_maximo: 40, valor_promedio: 38 });
  });
});
