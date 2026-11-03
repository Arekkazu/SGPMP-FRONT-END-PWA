// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-23 | destroyerban | FE-11 RF-59: aviso de truncado y marca de intervalos vacíos |
// | 2026-10-26 | Arekkazu | INC-M03-193-G121 RF-59: la línea se corta en los vacíos temporales (CA-13) |
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo 13.6 RF-59: título y alto por gráfica, una por variable |
import React, { useMemo } from 'react';
import { useT } from '../../shared/i18n/useT';
import { LineChartTelemetria, type SerieChart } from './LineChartTelemetria';
import { horaCaptura } from '../lib/sensorEscala';
import { zonasDelGrafico } from '../lib/vaciosTemporales';
import type { LecturaHistoricaSchema, VacioTemporalSchema } from '../types';

/**
 * Pivotea las lecturas a una serie temporal: una línea por `tipo_variable`.
 * El eje X es el timestamp de captura (orden ascendente). FE-11: la clave es el timestamp
 * ISO (único) y se formatea como hora; así las zonas sin datos caen en su lugar aunque la
 * misma hora se repita en varios días.
 *
 * RF-59 CA-13 (INC-M03-193-G121): cada vacío temporal abre un tramo nuevo de su variable
 * (otra `dataKey`), así la línea se corta en el hueco en vez de unir los dos extremos con
 * valores interpolados. Los tramos comparten color y una sola entrada en la leyenda.
 */
export function buildChart(
  items: LecturaHistoricaSchema[],
  vacios: VacioTemporalSchema[] = [],
): { data: Array<Record<string, number | string | null>>; series: SerieChart[] } {
  if (items.length === 0) return { data: [], series: [] };

  const variables = Array.from(new Set(items.map((i) => i.tipo_variable)));
  const ordenados = [...items].sort((a, b) => a.timestamp_captura.localeCompare(b.timestamp_captura));
  const finDeVacio = new Set(vacios.map((v) => `${v.tipo_variable}|${new Date(v.hasta).getTime()}`));

  const tramo = new Map<string, number>(variables.map((v) => [v, 0]));
  const byTs = new Map<string, Record<string, number | string | null>>();
  for (const it of ordenados) {
    if (finDeVacio.has(`${it.tipo_variable}|${new Date(it.timestamp_captura).getTime()}`)) {
      tramo.set(it.tipo_variable, (tramo.get(it.tipo_variable) ?? 0) + 1);
    }
    const key = it.timestamp_captura;
    const row = byTs.get(key) ?? { x: key };
    if (it.valor != null) row[`${it.tipo_variable}#${tramo.get(it.tipo_variable)}`] = it.valor;
    byTs.set(key, row);
  }

  const series: SerieChart[] = variables.flatMap((v, indiceColor) =>
    Array.from({ length: (tramo.get(v) ?? 0) + 1 }, (_, n) => ({
      dataKey: `${v}#${n}`, name: v, indiceColor, ocultarEnLeyenda: n > 0,
    })),
  );
  return { data: Array.from(byTs.values()), series };
}

export function HistorialChart({ items, unidad, vacios = [], titulo, alto = 280 }: {
  items: LecturaHistoricaSchema[];
  unidad?: string;
  vacios?: VacioTemporalSchema[];
  titulo?: string;
  alto?: number;
}) {
  const { t } = useT('telemetry');
  const { data, series } = useMemo(() => buildChart(items, vacios), [items, vacios]);
  // RF-59 E7 / CA-17: los vacíos se sombrean con la etiqueta "Sin datos".
  const zonas = useMemo(() => zonasDelGrafico(vacios, data.map((d) => String(d.x))), [vacios, data]);
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)', marginBottom: 'var(--s6)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{titulo ?? t('historialchart.evolucion_de_lecturas')}</h3>
      <LineChartTelemetria
        data={data} xKey="x" series={series} unit={unidad} height={alto} formatX={horaCaptura}
        zonasSinDatos={zonas} etiquetaSinDatos={t('historialchart.sin_datos')}
      />
    </div>
  );
}
