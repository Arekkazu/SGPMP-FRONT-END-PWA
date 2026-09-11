import React, { useState } from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { RefreshCw, Play, TrendingDown, CheckCircle2, XCircle, Loader2, Cpu, Terminal } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { ModalShell } from '../components/ModalShell';
import { ProgressBar } from '../components/ProgressBar';
import { Pill, type Tono } from '../components/Pill';
import { INPUT, LABEL, TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import {
  PROCESOS_REENTRENAMIENTO, FASES_MOCK, RECURSOS_MOCK, LOG_MOCK, DEGRADACION_MOCK,
  type ProcesoReentrenamiento, type EstadoProceso,
} from '../mocks/reentrenamientoMock';

const ESTADO: Record<EstadoProceso, { tono: Tono; label: string; icon: React.ReactNode }> = {
  EN_PROCESO: { tono: 'warning', label: 'En proceso', icon: <Loader2 size={12} aria-hidden /> },
  COMPLETADO: { tono: 'success', label: 'Completado', icon: <CheckCircle2 size={12} aria-hidden /> },
  FALLIDO: { tono: 'error', label: 'Fallido', icon: <XCircle size={12} aria-hidden /> },
  CANCELADO: { tono: 'neutral', label: 'Cancelado', icon: <XCircle size={12} aria-hidden /> },
};

function fmt(dt: string): string {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : formatearFechaHora(d);
}

function MonitorModal({ proceso, onClose }: { proceso: ProcesoReentrenamiento; onClose: () => void }) {
  const { t } = useT('prediction');
  return (
    <ModalShell title={`Reentrenamiento #${proceso.id}`} onClose={onClose} maxWidth={640} footer={<Button variant="secondary" onClick={onClose}>{t('reentrenamientoview.cerrar')}</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Pill tono={ESTADO[proceso.estado].tono} icon={ESTADO[proceso.estado].icon}>{ESTADO[proceso.estado].label}</Pill>
          <Pill tono="neutral">{proceso.tipo_modelo}</Pill>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{proceso.activacion}</span>
        </div>

        <ProgressBar valor={proceso.progreso} label={t('reentrenamientoview.progreso_general')} height={10} color={proceso.estado === 'FALLIDO' ? 'var(--sem-error)' : 'var(--brand-500)'} />

        {/* Fases */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' }}>{t('reentrenamientoview.fases_del_proceso')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            {FASES_MOCK.map((f) => (
              <div key={f.nombre} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', fontSize: '13px' }}>
                {f.estado === 'completada' ? <CheckCircle2 size={16} aria-hidden style={{ color: 'var(--sem-success)' }} />
                  : f.estado === 'en_curso' ? <Loader2 size={16} aria-hidden style={{ color: 'var(--sem-warning)' }} />
                  : <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--surface-border)' }} aria-hidden />}
                <span style={{ color: f.estado === 'pendiente' ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: f.estado === 'en_curso' ? 700 : 400 }}>{f.nombre}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recursos (admin) */}
        <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' }}>
            <Cpu size={15} aria-hidden />{t('reentrenamientoview.uso_de_recursos')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            <ProgressBar valor={RECURSOS_MOCK.cpu} label="CPU (máx. 70%)" color={RECURSOS_MOCK.cpu > 70 ? 'var(--sem-error)' : 'var(--sem-info)'} />
            <ProgressBar valor={RECURSOS_MOCK.ram} label="RAM (máx. 60%)" color={RECURSOS_MOCK.ram > 60 ? 'var(--sem-error)' : 'var(--sem-info)'} />
          </div>
        </div>

        {/* Log */}
        <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' }}>
            <Terminal size={15} aria-hidden />{t('reentrenamientoview.log_tecnico')}</h3>
          <pre style={{ margin: 0, padding: 'var(--s3)', background: 'var(--neutral-900, #111)', color: 'var(--neutral-0, #eee)', borderRadius: 'var(--r-md)', fontFamily: 'var(--font-mono)', fontSize: '11px', overflowX: 'auto', maxHeight: 180 }}>
            {LOG_MOCK.join('\n')}
          </pre>
        </div>
      </div>
    </ModalShell>
  );
}

function ConfigModal({ onClose }: { onClose: () => void }) {
  const { t } = useT('prediction');
  return (
    <ModalShell
      title={t('reentrenamientoview.nuevo_reentrenamiento')}
      onClose={onClose}
      maxWidth={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('reentrenamientoview.cancelar')}</Button>
          <Button variant="primary" disabled title="El disparo de reentrenamiento es del equipo IoT/IA (RF-71)">{t('reentrenamientoview.revisar_y_comenzar')}</Button>
        </>
      }
    >
      <Alert variant="info" title={t('reentrenamientoview.disparo_no_disponible')} description="El reentrenamiento lo ejecuta el pipeline del equipo IoT/IA (RF-71). Este formulario es una vista de ejemplo." style={{ marginBottom: 'var(--s5)' }} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <div>
          <label style={LABEL} htmlFor="re-tipo">{t('reentrenamientoview.tipo_de_modelo')}</label>
          <select id="re-tipo" style={INPUT} disabled defaultValue="ESPECIES_MEDIANAS">
            <option value="ESPECIES_MEDIANAS">{t('reentrenamientoview.especies_medianas')}</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
          <div><label style={LABEL} htmlFor="re-desde">{t('reentrenamientoview.datos_desde')}</label><input id="re-desde" type="date" style={INPUT} disabled /></div>
          <div><label style={LABEL} htmlFor="re-hasta">{t('reentrenamientoview.datos_hasta')}</label><input id="re-hasta" type="date" style={INPUT} disabled /></div>
        </div>
        <div>
          <label style={LABEL} htmlFor="re-algo">{t('reentrenamientoview.algoritmo')}</label>
          <select id="re-algo" style={INPUT} disabled defaultValue="GB">
            <option value="RF">{t('reentrenamientoview.random_forest')}</option>
            <option value="GB">{t('reentrenamientoview.gradient_boosting')}</option>
            <option value="LSTM">{t('reentrenamientoview.lstm')}</option>
            <option value="XGB">{t('reentrenamientoview.xgboost')}</option>
          </select>
        </div>
      </div>
    </ModalShell>
  );
}

export function ReentrenamientoView() {
  const { t } = useT('prediction');
  const [monitor, setMonitor] = useState<ProcesoReentrenamiento | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const stats = {
    activos: PROCESOS_REENTRENAMIENTO.filter((p) => p.estado === 'EN_PROCESO').length,
    completados: PROCESOS_REENTRENAMIENTO.filter((p) => p.estado === 'COMPLETADO').length,
    fallidos: PROCESOS_REENTRENAMIENTO.filter((p) => p.estado === 'FALLIDO').length,
  };

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <RefreshCw size={20} aria-hidden />{t('reentrenamientoview.reentrenamiento_de_modelos')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('reentrenamientoview.procesos_de_mejora_de_modelos_en_segundo')}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setConfigOpen(true)}>
          <Play size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('reentrenamientoview.nuevo_reentrenamiento')}</Button>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <DatosSimuladosBanner detalle="El reentrenamiento lo ejecuta el pipeline del equipo IoT/IA (RF-71); esta vista usa datos de ejemplo" />

        <Alert
          variant="warning"
          title={t('reentrenamientoview.degradacion_detectada')}
          description={`El modelo "${DEGRADACION_MOCK.tipo_modelo}" cayó a F1 ${DEGRADACION_MOCK.f1_actual} (umbral ${DEGRADACION_MOCK.umbral}). Se recomienda reentrenar.`}
          style={{ marginBottom: 'var(--s5)' }}
        />

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          {[
            { etiqueta: 'En proceso', valor: stats.activos, color: 'var(--sem-warning)', icon: <Loader2 size={18} aria-hidden /> },
            { etiqueta: 'Completados', valor: stats.completados, color: 'var(--sem-success)', icon: <CheckCircle2 size={18} aria-hidden /> },
            { etiqueta: 'Fallidos', valor: stats.fallidos, color: 'var(--sem-error)', icon: <XCircle size={18} aria-hidden /> },
            { etiqueta: 'Umbral F1', valor: DEGRADACION_MOCK.umbral, color: 'var(--text-muted)', icon: <TrendingDown size={18} aria-hidden /> },
          ].map((k) => (
            <div key={k.etiqueta} style={{ flex: '1 1 130px', minWidth: 130, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color: k.color }}>{k.icon}<span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{k.valor}</span></div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{k.etiqueta}</div>
            </div>
          ))}
        </div>

        <div style={TABLE_WRAP}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={THEAD_ROW}>
                <th style={TH}>{t('reentrenamientoview.fecha_inicio')}</th>
                <th style={TH}>{t('reentrenamientoview.tipo_de_modelo')}</th>
                <th style={TH}>{t('reentrenamientoview.activacion')}</th>
                <th style={TH}>{t('reentrenamientoview.estado')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('reentrenamientoview.f1_global')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('reentrenamientoview.recall_riesgo')}</th>
                <th style={TH}>{t('reentrenamientoview.duracion')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('reentrenamientoview.acciones')}</th>
              </tr>
            </thead>
            <tbody>
              {PROCESOS_REENTRENAMIENTO.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>{fmt(p.fecha_inicio)}</td>
                  <td style={TD}>{p.tipo_modelo}</td>
                  <td style={TD}>{p.activacion}</td>
                  <td style={TD}><Pill tono={ESTADO[p.estado].tono} icon={ESTADO[p.estado].icon}>{ESTADO[p.estado].label}</Pill></td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{p.f1_global != null ? `${(p.f1_global * 100).toFixed(1)}%` : '—'}</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{p.recall_riesgo != null ? `${(p.recall_riesgo * 100).toFixed(1)}%` : '—'}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{p.duracion}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" onClick={() => setMonitor(p)}>{t('reentrenamientoview.ver')}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {monitor && <MonitorModal proceso={monitor} onClose={() => setMonitor(null)} />}
      {configOpen && <ConfigModal onClose={() => setConfigOpen(false)} />}
    </div>
  );
}
