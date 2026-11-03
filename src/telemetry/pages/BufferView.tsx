// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-29 | Arekkazu | TC-DIS-148 RF-54: datos reales de GET /iot/buffer e indicadores etiquetados |
// | 2026-10-29 | Arekkazu | TC-DIS-148 RF-54: la lista de indicadores usa .ds-kv (regla de rejillas responsive) |
import React from 'react';
import { AlertTriangle, CheckCircle2, Cpu, Database, Layers, OctagonAlert } from 'lucide-react';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { KpiCard } from '../components/KpiCard';
import { Pill, type Tono } from '../components/Pill';
import { useBuffer } from '../hooks/useBuffer';
import type { EstadoBufferSchema, EstadoOcupacionBuffer } from '../types';

const TONO_ESTADO: Record<EstadoOcupacionBuffer, Tono> = { NORMAL: 'success', WARNING: 'warning', CRITICO: 'error' };
const ICONO_ESTADO: Record<EstadoOcupacionBuffer, React.ReactNode> = {
  NORMAL: <CheckCircle2 size={11} aria-hidden />,
  WARNING: <AlertTriangle size={11} aria-hidden />,
  CRITICO: <OctagonAlert size={11} aria-hidden />,
};
const DT: React.CSSProperties = { fontSize: '12px', color: 'var(--text-muted)' };
const DD: React.CSSProperties = { margin: 0, fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' };

function TarjetaBuffer({ d }: { d: EstadoBufferSchema }) {
  const { t } = useT('telemetry');
  const porcentaje = d.porcentaje_ocupacion;
  const idTitulo = `buffer-${d.id_dispositivo_iot}`;
  return (
    <section aria-labelledby={idTitulo} style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s1)' }}>
        <h2 id={idTitulo} style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {d.serial ?? `#${d.id_dispositivo_iot}`}
        </h2>
        {/* 1.4.1: el estado va en texto e icono, no solo en el color de la pastilla. */}
        {d.estado_buffer && (
          <Pill tono={TONO_ESTADO[d.estado_buffer]} icon={ICONO_ESTADO[d.estado_buffer]}>{t(`bufferview.estado_${d.estado_buffer}`)}</Pill>
        )}
      </div>
      <p style={{ margin: '0 0 var(--s3)', fontSize: '12px', color: 'var(--text-muted)' }}>
        {[d.nombre_finca, d.nombre_infraestructura].filter(Boolean).join(' · ')}
      </p>

      {d.metricas_disponibles && porcentaje != null && (
        <meter
          aria-label={t('bufferview.ocupacion')}
          min={0} max={100} low={80} high={95} optimum={0} value={porcentaje}
          style={{ width: '100%', marginBottom: 'var(--s3)' }}
        />
      )}

      {/* 1.3.1: cada indicador con su rótulo (dt) y su valor (dd). */}
      <dl className="ds-kv">
        <dt style={DT}>{t('bufferview.conexion')}</dt>
        <dd style={DD}>{t(`bufferview.conexion_${d.estado_local_buffer ?? 'sin_reporte'}`)}</dd>
        <dt style={DT}>{t('bufferview.datos_pendientes')}</dt>
        <dd style={DD}>{d.datos_pendientes != null ? formatearNumero(d.datos_pendientes) : '—'}</dd>
        {d.metricas_disponibles && (
          <>
            <dt style={DT}>{t('bufferview.ocupacion')}</dt>
            <dd style={DD}>{porcentaje != null ? `${formatearNumero(porcentaje, { maximumFractionDigits: 1 })} %` : '—'}</dd>
            <dt style={DT}>{t('bufferview.capacidad_utilizada')}</dt>
            <dd style={DD}>{formatearNumero(d.capacidad_utilizada)}</dd>
            <dt style={DT}>{t('bufferview.capacidad_total')}</dt>
            <dd style={DD}>{formatearNumero(d.capacidad_total)}</dd>
            <dt style={DT}>{t('bufferview.politica_activa')}</dt>
            <dd style={DD}>{d.politica_buffer_activa ? t(`bufferview.politica_${d.politica_buffer_activa}`) : '—'}</dd>
            <dt style={DT}>{t('bufferview.ultimo_pendiente')}</dt>
            <dd style={DD}>{d.ultimo_timestamp_pendiente ? formatearFechaHora(d.ultimo_timestamp_pendiente) : '—'}</dd>
          </>
        )}
        <dt style={DT}>{t('bufferview.ultimo_reporte')}</dt>
        <dd style={DD}>{d.fecha_recepcion ? formatearFechaHora(d.fecha_recepcion) : '—'}</dd>
      </dl>
      {!d.metricas_disponibles && (
        <p style={{ margin: 'var(--s3) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('bufferview.sin_metricas')}</p>
      )}
    </section>
  );
}

export function BufferView() {
  const { t } = useT('telemetry');
  const { dispositivos, loading, error, cargar } = useBuffer();
  const enBuffer = dispositivos.filter((d) => d.estado_local_buffer === 'A' || d.estado_local_buffer === 'L').length;
  const pendientes = dispositivos.reduce((s, d) => s + (d.datos_pendientes ?? 0), 0);
  const criticos = dispositivos.filter((d) => d.estado_buffer === 'CRITICO').length;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Layers size={20} aria-hidden />{t('bufferview.buffer_y_sincronizacion')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('bufferview.descripcion')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {error && (
          <div style={{ marginBottom: 'var(--s4)' }}>
            <Alert variant={error.status === 403 ? 'warning' : 'error'} title={t('bufferview.error_titulo')} description={error.message} />
            <Button variant="secondary" size="sm" onClick={cargar} style={{ marginTop: 'var(--s2)' }}>{t('bufferview.reintentar')}</Button>
          </div>
        )}

        <div aria-live="polite" style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <KpiCard icon={<Cpu size={18} aria-hidden />} valor={dispositivos.length} etiqueta={t('bufferview.kpi_dispositivos')} />
          <KpiCard icon={<Database size={18} aria-hidden />} valor={enBuffer} etiqueta={t('bufferview.kpi_en_buffer')} color="var(--sem-info)" />
          <KpiCard icon={<Layers size={18} aria-hidden />} valor={formatearNumero(pendientes)} etiqueta={t('bufferview.datos_pendientes')} color="var(--sem-warning)" />
          <KpiCard icon={<OctagonAlert size={18} aria-hidden />} valor={criticos} etiqueta={t('bufferview.kpi_criticos')} color="var(--sem-error)" />
        </div>

        {loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('bufferview.cargando')}</p>}
        {!loading && !error && dispositivos.length === 0 && (
          <p role="status" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('bufferview.vacio')}</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
          {dispositivos.map((d) => <TarjetaBuffer key={d.id_dispositivo_iot} d={d} />)}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{t('bufferview.cola_en_edge')}</p>
      </div>
    </div>
  );
}
