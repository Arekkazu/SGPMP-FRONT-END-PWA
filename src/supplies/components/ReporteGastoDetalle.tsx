// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-77: reporte de gastos con desglose por categoría, período y tendencia |
import React from 'react';
import { FileDown, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { useT } from '../../shared/i18n/useT';
import { formatoCantidad, formatoFecha, formatoMoneda } from '../lib/formato';
import type { ReporteGasto } from '../types';
import { PANEL, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from './estilos';

interface Props {
  reporte: ReporteGasto;
  puedeExportar: boolean;
  exportando: boolean;
  online: boolean;
  onExportar: (formato: 'PDF' | 'CSV') => void;
}

function Tendencia({ r }: { r: NonNullable<ReporteGasto['tendencia']> }) {
  const { t } = useT('supplies');
  const v = r.variacion_porcentual !== null ? Number(r.variacion_porcentual) : null;
  // Subir el gasto no es "bueno": se muestra con icono y signo, sin juzgar con color.
  const Icono = v === null || v === 0 ? Minus : v > 0 ? TrendingUp : TrendingDown;
  return (
    <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)' }}>
      <Icono size={18} aria-hidden />
      {v === null
        ? (r.nota ?? t(`gastos.tendencia_${r.estado}`, { defaultValue: r.estado }))
        : t('gastos.tendencia', { signo: v > 0 ? '+' : '', variacion: formatoCantidad(v, 1), anterior: formatoMoneda(r.gasto_periodo_anterior) })}
    </p>
  );
}

export function ReporteGastoDetalle({ reporte: r, puedeExportar, exportando, online, onExportar }: Props) {
  const { t } = useT('supplies');
  return (
    <section aria-labelledby="reporte-titulo" style={PANEL}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
        <div>
          <h2 id="reporte-titulo" style={{ margin: 0, fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>
            {t('gastos.total_periodo', { desde: formatoFecha(r.fecha_inicio), hasta: formatoFecha(r.fecha_fin) })}
          </h2>
          <p style={{ margin: 'var(--s1) 0 var(--s2)', fontSize: 'var(--fs-display-lg)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 'var(--ls-tight)', fontVariantNumeric: 'tabular-nums', lineHeight: 'var(--lh-tight)' }}>
            {formatoMoneda(r.gasto_total_acumulado)}
          </p>
          <p style={{ ...SECUNDARIO, margin: 0, fontSize: 'var(--fs-body-md)' }}>
            {r.gasto_promedio_individuo !== null
              ? t('gastos.promedio', { monto: formatoMoneda(r.gasto_promedio_individuo) })
              : (r.causa_no_calculable_promedio ?? t('gastos.sin_promedio'))}
          </p>
          {r.tendencia && <div style={{ marginTop: 'var(--s2)' }}><Tendencia r={r.tendencia} /></div>}
        </div>
        {puedeExportar && r.id_reporte_gasto_acumulado !== null && (
          <div style={{ display: 'flex', gap: 'var(--s2)' }}>
            <Button variant="secondary" size="sm" disabled={!online || exportando} onClick={() => onExportar('PDF')}><FileDown size={16} aria-hidden />PDF</Button>
            <Button variant="secondary" size="sm" disabled={!online || exportando} onClick={() => onExportar('CSV')}><FileDown size={16} aria-hidden />CSV</Button>
          </div>
        )}
      </div>

      {r.sin_datos && <Alert variant="info" title={r.mensaje ?? t('gastos.sin_datos')} style={{ marginBottom: 'var(--s4)' }} />}
      {r.advertencia && <Alert variant="warning" title={r.advertencia} style={{ marginBottom: 'var(--s4)' }} />}
      {r.nota_bajas && <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)', fontSize: 'var(--fs-body-md)' }}>{r.nota_bajas}</p>}

      {r.desglose_categorias.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', marginBottom: 'var(--s6)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--fs-body-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('gastos.por_categoria')}</h3>
          {r.desglose_categorias.map((c) => (
            <div key={c.categoria}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)', fontSize: 'var(--fs-body-md)', marginBottom: 'var(--s1)' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t(`categoria.${c.categoria}`, { defaultValue: c.categoria })}</span>
                <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatoMoneda(c.subtotal)} · {formatoCantidad(c.porcentaje, 1)} % · {t('comun.registros', { count: c.num_registros })}
                </span>
              </div>
              <div aria-hidden style={{ height: 8, borderRadius: 'var(--r-full)', background: 'var(--surface-hover)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Math.max(0, Number(c.porcentaje)))}%`, height: '100%', background: 'var(--brand-500)', borderRadius: 'var(--r-full)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {r.desglose_temporal.length > 1 && (
        <ScrollRegion label={t('gastos.por_periodo')}>
          <table style={TABLA}>
            <caption style={{ textAlign: 'left', fontWeight: 700, padding: '0 0 var(--s2)', color: 'var(--text-primary)' }}>{t('gastos.por_periodo')}</caption>
            <thead><tr><th style={TH}>{t('gastos.periodo')}</th><th style={TH_NUM}>{t('gastos.monto')}</th></tr></thead>
            <tbody>
              {r.desglose_temporal.map((p) => (
                <tr key={p.fecha_inicio}><td style={TD}>{p.etiqueta}<div style={SECUNDARIO}>{formatoFecha(p.fecha_inicio)} – {formatoFecha(p.fecha_fin)}</div></td><td style={TD_NUM}>{formatoMoneda(p.monto)}</td></tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}

      {r.registros_sin_costo.length > 0 && (
        <details style={{ marginTop: 'var(--s5)' }}>
          <summary style={{ cursor: 'pointer', fontSize: 'var(--fs-body-md)', fontWeight: 600, color: 'var(--sem-warning)', minHeight: 'var(--s9)', display: 'flex', alignItems: 'center' }}>
            {t('gastos.sin_costo', { count: r.registros_sin_costo.length })}
          </summary>
          <ul style={{ margin: 'var(--s2) 0 0', paddingLeft: 'var(--s5)', fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-relaxed)' }}>
            {r.registros_sin_costo.map((s) => (
              <li key={`${s.categoria}-${s.id_origen}`}>{formatoFecha(s.fecha)} · {t(`categoria.${s.categoria}`, { defaultValue: s.categoria })} · {s.descripcion}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
