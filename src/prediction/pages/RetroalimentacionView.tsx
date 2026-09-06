import React, { useEffect, useMemo, useState } from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { MessageSquareText, ClipboardCheck, Clock, TimerOff } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { usePatologias } from '../hooks/usePatologias';
import { useRetroalimentacion } from '../hooks/useRetroalimentacion';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { RetroalimentacionFormModal } from '../components/RetroalimentacionFormModal';
import { Pill, type Tono } from '../components/Pill';
import { PermissionDenied } from '../components/PermissionDenied';
import { TH, TD, TABLE_WRAP, THEAD_ROW, INPUT, LABEL, FILTER_GRID } from '../components/tableStyles';
import { RECURSO_RETRO, ACCION_R, ACCION_C } from '../rbac';
import { RETRO_PENDIENTES_MOCK, type RetroPendienteMock, type EstadoEvaluacion } from '../mocks/retroMock';

const RIESGO_TONO: Record<string, Tono> = { ALTO: 'error', MEDIO: 'warning', BAJO: 'success' };
const ESTADO_EVAL: Record<EstadoEvaluacion, { tono: Tono; label: string }> = {
  PENDIENTE: { tono: 'info', label: 'Pendiente' },
  EVALUADO: { tono: 'success', label: 'Evaluado' },
  VENTANA_VENCIDA: { tono: 'neutral', label: 'Ventana vencida' },
};

function Kpi({ icon, valor, etiqueta, color }: { icon: React.ReactNode; valor: number; etiqueta: string; color: string }) {
  return (
    <div style={{ flex: '1 1 130px', minWidth: 130, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color }}>
        {icon}<span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{valor}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{etiqueta}</div>
    </div>
  );
}

function fmt(dt: string): string {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : formatearFecha(d);
}

export function RetroalimentacionView() {
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_RETRO, ACCION_R);
  const puedeRegistrar = usePermission(RECURSO_RETRO, ACCION_C);
  const online = useOnlineStatus();

  const patologiasHook = usePatologias();
  const retro = useRetroalimentacion();

  const [fEstado, setFEstado] = useState('');
  const [fRiesgo, setFRiesgo] = useState('');
  const [sel, setSel] = useState<RetroPendienteMock | null>(null);
  const [okFlash, setOkFlash] = useState(false);

  useEffect(() => { if (puedeVer) patologiasHook.cargar({ solo_activas: true }); }, [puedeVer]); // eslint-disable-line react-hooks/exhaustive-deps

  const patologiasOpciones = useMemo(
    () => patologiasHook.patologias.map((p) => ({ id: p.id_patologia, nombre: p.nombre_patologia })),
    [patologiasHook.patologias]
  );

  const visibles = useMemo(() => RETRO_PENDIENTES_MOCK.filter((r) =>
    (!fEstado || r.estado_evaluacion === fEstado) && (!fRiesgo || r.riesgo_inferido === fRiesgo)
  ), [fEstado, fRiesgo]);

  const kpis = useMemo(() => ({
    pendientes: RETRO_PENDIENTES_MOCK.filter((r) => r.estado_evaluacion === 'PENDIENTE').length,
    evaluadas: RETRO_PENDIENTES_MOCK.filter((r) => r.estado_evaluacion === 'EVALUADO').length,
    vencidas: RETRO_PENDIENTES_MOCK.filter((r) => r.estado_evaluacion === 'VENTANA_VENCIDA').length,
  }), []);

  const enviarRetro = async (dto: Parameters<typeof retro.registrar>[0]) => {
    const ok = await retro.registrar(dto);
    if (ok) { setSel(null); setOkFlash(true); setTimeout(() => setOkFlash(false), 4000); }
  };

  if (!puedeVer) return <PermissionDenied seccion="Retroalimentación clínica" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <MessageSquareText size={20} aria-hidden />{t('retroalimentacionview.retroalimentacion_clinica')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('retroalimentacionview.evaluacion_de_las_predicciones_del_motor')}</p>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <DatosSimuladosBanner detalle="La lista de inferencias pendientes es de ejemplo (el backend solo expone el registro, no la consulta). El envío de la evaluación sí usa el endpoint real" />

        {okFlash && <Alert variant="success" title={t('retroalimentacionview.evaluacion_registrada')} description={t('retroalimentacionview.la_retroalimentacion_clinica_quedo')} style={{ marginBottom: 'var(--s4)' }} />}
        {!online && <Alert variant="warning" title={t('retroalimentacionview.sin_conexion')} description={t('retroalimentacionview.el_registro_de_evaluaciones_esta')} style={{ marginBottom: 'var(--s4)' }} />}
        {!puedeRegistrar && <Alert variant="info" title={t('retroalimentacionview.solo_supervision')} description={t('retroalimentacionview.tu_rol_puede_consultar_las_evaluaciones')} style={{ marginBottom: 'var(--s4)' }} />}

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <Kpi icon={<Clock size={18} aria-hidden />} valor={kpis.pendientes} etiqueta="Pendientes" color="var(--sem-info)" />
          <Kpi icon={<ClipboardCheck size={18} aria-hidden />} valor={kpis.evaluadas} etiqueta="Evaluadas" color="var(--sem-success)" />
          <Kpi icon={<TimerOff size={18} aria-hidden />} valor={kpis.vencidas} etiqueta="Ventana vencida" color="var(--text-muted)" />
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
          <div style={FILTER_GRID}>
            <div>
              <label style={LABEL} htmlFor="retro-estado">{t('retroalimentacionview.estado_de_evaluacion')}</label>
              <select id="retro-estado" style={INPUT} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                <option value="">{t('retroalimentacionview.todos')}</option>
                <option value="PENDIENTE">{t('retroalimentacionview.pendiente')}</option>
                <option value="EVALUADO">{t('retroalimentacionview.evaluado')}</option>
                <option value="VENTANA_VENCIDA">{t('retroalimentacionview.ventana_vencida')}</option>
              </select>
            </div>
            <div>
              <label style={LABEL} htmlFor="retro-riesgo">{t('retroalimentacionview.riesgo_inferido')}</label>
              <select id="retro-riesgo" style={INPUT} value={fRiesgo} onChange={(e) => setFRiesgo(e.target.value)}>
                <option value="">{t('retroalimentacionview.todos')}</option>
                <option value="ALTO">{t('retroalimentacionview.alto')}</option>
                <option value="MEDIO">{t('retroalimentacionview.medio')}</option>
                <option value="BAJO">{t('retroalimentacionview.bajo')}</option>
              </select>
            </div>
          </div>
        </div>

        <div style={TABLE_WRAP}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={THEAD_ROW}>
                <th style={TH}>{t('retroalimentacionview.activo')}</th>
                <th style={TH}>{t('retroalimentacionview.especie_finca')}</th>
                <th style={TH}>{t('retroalimentacionview.riesgo')}</th>
                <th style={TH}>{t('retroalimentacionview.patologia_estimada')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('retroalimentacionview.prob')}</th>
                <th style={TH}>{t('retroalimentacionview.fecha')}</th>
                <th style={TH}>{t('retroalimentacionview.estado')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('retroalimentacionview.acciones')}</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r) => (
                <tr key={r.id_resultado_inferencia}>
                  <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>{r.identificador}</td>
                  <td style={TD}>{r.especie} · {r.finca}</td>
                  <td style={TD}><Pill tono={RIESGO_TONO[r.riesgo_inferido]}>{r.riesgo_inferido}</Pill></td>
                  <td style={TD}>{r.patologia_estimada}</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{(r.probabilidad * 100).toFixed(0)}%</td>
                  <td style={TD}>{fmt(r.fecha_inferencia)}</td>
                  <td style={TD}><Pill tono={ESTADO_EVAL[r.estado_evaluacion].tono}>{ESTADO_EVAL[r.estado_evaluacion].label}</Pill></td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <Button
                      variant="secondary" size="sm"
                      disabled={!puedeRegistrar || !online || r.estado_evaluacion !== 'PENDIENTE'}
                      onClick={() => { retro.limpiarSaveError(); setSel(r); }}
                    >{t('retroalimentacionview.evaluar')}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sel && (
        <RetroalimentacionFormModal
          contexto={{
            id_resultado_inferencia: sel.id_resultado_inferencia,
            id_activo_biologico: sel.id_activo_biologico,
            resumen: `${sel.identificador} · ${sel.patologia_estimada} (${(sel.probabilidad * 100).toFixed(0)}%)`,
          }}
          patologiasOpciones={patologiasOpciones}
          saving={retro.saving}
          saveError={retro.saveError}
          online={online}
          onSubmit={enviarRetro}
          onClose={() => setSel(null)}
        />
      )}
    </div>
  );
}
