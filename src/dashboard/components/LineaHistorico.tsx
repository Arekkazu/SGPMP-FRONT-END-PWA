// | Fecha      | Nombre   | Que se hizo                                              |
// |------------|----------|----------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: histórico de una variable en el dashboard     |
// | 2026-11-22 | Arekkazu | A11Y2-M08 TC-DIS-279 RF-103: tabla alternativa del histórico |
import React, { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatearFechaHora, formatearHora, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';

interface Serie {
  sensor: string;
  variable: string;
  unidad: string | null;
  puntos: { t: string; v: number | null }[];
}

const COLORES = ['var(--brand-600)', 'var(--sem-warning)', 'var(--sem-info)', 'var(--sem-error)', 'var(--sem-success)'];

/** Se carga aparte (React.lazy): los gráficos no entran en la carga inicial del dashboard (RNF-01). */
export default function LineaHistorico({ datos }: { datos: Record<string, unknown> }) {
  const series = (Array.isArray(datos.series) ? datos.series : []) as Serie[];
  const filas = useMemo(() => {
    const porInstante = new Map<string, Record<string, number | string | null>>();
    series.forEach((s, i) => s.puntos.forEach((p) => {
      const fila = porInstante.get(p.t) ?? { t: p.t };
      fila[`s${i}`] = p.v;
      porInstante.set(p.t, fila);
    }));
    return [...porInstante.values()].sort((a, b) => String(a.t).localeCompare(String(b.t)));
  }, [series]);
  const unidad = series[0]?.unidad ?? '';
  const { t } = useT('dashboard');
  const valor = (v: unknown) => (typeof v === 'number' ? `${formatearNumero(v, { maximumFractionDigits: 1 })} ${unidad}`.trim() : t('historico.sin_lectura'));

  return (
    <div style={{ width: '100%', height: 180 }}>
      {/* 1.1.1 (TC-DIS-279): la gráfica tiene tabla alternativa con los mismos puntos. */}
      <table className="ds-sr-only">
        <caption>{t('historico.tabla')}</caption>
        <thead><tr><th scope="col">{t('historico.col_hora')}</th>{series.map((s) => <th key={`${s.sensor}-${s.variable}`} scope="col">{`${s.sensor} · ${s.variable}`}</th>)}</tr></thead>
        <tbody>{filas.slice(-24).map((f) => (
          <tr key={String(f.t)}><th scope="row">{formatearFechaHora(String(f.t))}</th>{series.map((s, i) => <td key={`${s.sensor}-${s.variable}`}>{valor(f[`s${i}`])}</td>)}</tr>
        ))}</tbody>
      </table>
      <ResponsiveContainer>
        <LineChart data={filas} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
          <XAxis dataKey="t" tickFormatter={(v) => formatearHora(v as string)} tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} unit={unidad ? ` ${unidad}` : undefined} width={56} />
          <Tooltip labelFormatter={(v) => formatearFechaHora(v as string)}
            formatter={(v, nombre) => [`${formatearNumero(v as number, { maximumFractionDigits: 1 })} ${unidad}`, nombre]} />
          {series.map((s, i) => (
            <Line key={`${s.sensor}-${s.variable}`} type="monotone" dataKey={`s${i}`} name={`${s.sensor} · ${s.variable}`}
              stroke={COLORES[i % COLORES.length]} dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
