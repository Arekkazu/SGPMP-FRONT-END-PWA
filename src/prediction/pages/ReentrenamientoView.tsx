import React, { useState } from 'react';
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
  return isNaN(d.getTime()) ? dt : d.toLocaleString('es-CO');
}

function MonitorModal({ proceso, onClose }: { proceso: ProcesoReentrenamiento; onClose: () => void }) {
  return (
    <ModalShell title={`Reentrenamiento #${proceso.id}`} onClose={onClose} maxWidth={640} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Pill tono={ESTADO[proceso.estado].tono} icon={ESTADO[proceso.estado].icon}>{ESTADO[proceso.estado].label}</Pill>
          <Pill tono="neutral">{proceso.tipo_modelo}</Pill>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{proceso.activacion}</span>
        </div>

        <ProgressBar valor={proceso.progreso} label="Progreso general" height={10} color={proceso.estado === 'FALLIDO' ? 'var(--sem-error)' : 'var(--brand-500)'} />

        {/* Fases */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' }}>Fases del proceso</h3>
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
            <Cpu size={15} aria-hidden /> Uso de recursos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            <ProgressBar valor={RECURSOS_MOCK.cpu} label="CPU (máx. 70%)" color={RECURSOS_MOCK.cpu > 70 ? 'var(--sem-error)' : 'var(--sem-info)'} />
            <ProgressBar valor={RECURSOS_MOCK.ram} label="RAM (máx. 60%)" color={RECURSOS_MOCK.ram > 60 ? 'var(--sem-error)' : 'var(--sem-info)'} />
          </div>
        </div>

        {/* Log */}
        <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', fontWeight: 700, margin: '0 0 var(--s3)', color: 'var(--text-primary)' }}>
            <Terminal size={15} aria-hidden /> Log técnico
          </h3>
          <pre style={{ margin: 0, padding: 'var(--s3)', background: 'var(--neutral-900, #111)', color: 'var(--neutral-0, #eee)', borderRadius: 'var(--r-md)', fontFamily: 'var(--font-mono)', fontSize: '11px', overflowX: 'auto', maxHeight: 180 }}>
            {LOG_MOCK.join('\n')}
          </pre>
        </div>
      </div>
    </ModalShell>
  );
}

function ConfigModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell
      title="Nuevo reentrenamiento"
      onClose={onClose}
      maxWidth={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled title="El disparo de reentrenamiento es del equipo IoT/IA (RF-71)">Revisar y comenzar</Button>
        </>
      }
    >
      <Alert variant="info" title="Disparo no disponible" description="El reentrenamiento lo ejecuta el pipeline del equipo IoT/IA (RF-71). Este formulario es una vista de ejemplo." style={{ marginBottom: 'var(--s5)' }} />
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <div>
          <label style={LABEL} htmlFor="re-tipo">Tipo de modelo</label>
          <select id="re-tipo" style={INPUT} disabled defaultValue="ESPECIES_MEDIANAS">
            <option value="ESPECIES_MEDIANAS">Especies medianas</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
          <div><label style={LABEL} htmlFor="re-desde">Datos desde</label><input id="re-desde" type="date" style={INPUT} disabled /></div>
          <div><label style={LABEL} htmlFor="re-hasta">Datos hasta</label><input id="re-hasta" type="date" style={INPUT} disabled /></div>
        </div>
        <div>
          <label style={LABEL} htmlFor="re-algo">Algoritmo</label>
          <select id="re-algo" style={INPUT} disabled defaultValue="GB">
            <option value="RF">Random Forest</option>
            <option value="GB">Gradient Boosting</option>
            <option value="LSTM">LSTM</option>
            <option value="XGB">XGBoost</option>
          </select>
        </div>
      </div>
    </ModalShell>
  );
}

export function ReentrenamientoView() {
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
            <RefreshCw size={20} aria-hidden />
            Reentrenamiento de Modelos
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            Procesos de mejora de modelos en segundo plano
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setConfigOpen(true)}>
          <Play size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} /> Nuevo reentrenamiento
        </Button>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <DatosSimuladosBanner detalle="El reentrenamiento lo ejecuta el pipeline del equipo IoT/IA (RF-71); esta vista usa datos de ejemplo" />

        <Alert
          variant="warning"
          title="Degradación detectada"
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
                <th style={TH}>Fecha inicio</th>
                <th style={TH}>Tipo de modelo</th>
                <th style={TH}>Activación</th>
                <th style={TH}>Estado</th>
                <th style={{ ...TH, textAlign: 'right' }}>F1 global</th>
                <th style={{ ...TH, textAlign: 'right' }}>Recall riesgo</th>
                <th style={TH}>Duración</th>
                <th style={{ ...TH, textAlign: 'right' }}>Acciones</th>
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
                    <Button variant="ghost" size="sm" onClick={() => setMonitor(p)}>Ver</Button>
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
