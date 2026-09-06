import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Check } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from './ModalShell';
import { INPUT, LABEL } from './tableStyles';
import type { EstadoRetro, FuenteDiagnostico, RegistrarRetroalimentacionDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

export interface RetroContexto {
  id_resultado_inferencia: string;
  id_activo_biologico: number;
  resumen?: string;
}

interface PatologiaOpcion { id: number; nombre: string; }

interface Props {
  contexto: RetroContexto;
  patologiasOpciones: PatologiaOpcion[];
  saving: boolean;
  saveError: ApiError | null;
  online: boolean;
  onSubmit: (dto: RegistrarRetroalimentacionDTO) => void;
  onClose: () => void;
}

const ESTADOS: { valor: EstadoRetro; label: string; desc: string }[] = [
  { valor: 'CORRECTO', label: 'Correcto', desc: 'La predicción coincidió con el diagnóstico real' },
  { valor: 'PARCIAL', label: 'Parcial', desc: 'Coincidió parcialmente' },
  { valor: 'INCORRECTO', label: 'Incorrecto', desc: 'No coincidió' },
  { valor: 'SIN_EVENTO', label: 'Sin evento', desc: 'No hubo evento sanitario' },
];

const FUENTES: { valor: FuenteDiagnostico; label: string }[] = [
  { valor: 'OBSERVACION_DIRECTA', label: 'Observación directa' },
  { valor: 'LABORATORIO', label: 'Laboratorio' },
  { valor: 'HISTORIAL_CLINICO', label: 'Historial clínico' },
  { valor: 'OTRO', label: 'Otro' },
];

export function RetroalimentacionFormModal({ contexto, patologiasOpciones, saving, saveError, online, onSubmit, onClose }: Props) {
  const { t } = useT('prediction');
  const [estado, setEstado] = useState<EstadoRetro | ''>('');
  const [diagnosticos, setDiagnosticos] = useState<number[]>([]);
  const [fuente, setFuente] = useState<FuenteDiagnostico | ''>('');
  const [observaciones, setObservaciones] = useState('');
  const [touched, setTouched] = useState(false);

  const requiereDiagnostico = estado === 'PARCIAL' || estado === 'INCORRECTO';
  const errEstado = !estado ? 'Selecciona una calificación.' : undefined;
  const errDiagnosticos = requiereDiagnostico && (diagnosticos.length < 1 || diagnosticos.length > 3)
    ? 'Indica entre 1 y 3 diagnósticos reales.'
    : undefined;
  const hayError = !!(errEstado || errDiagnosticos);

  const toggleDiag = (id: number) => {
    setDiagnosticos((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : (prev.length < 3 ? [...prev, id] : prev));
  };

  const submit = () => {
    setTouched(true);
    if (hayError || !estado) return;
    onSubmit({
      id_resultado_inferencia: contexto.id_resultado_inferencia,
      id_activo_biologico: contexto.id_activo_biologico,
      estado_retroalimentacion: estado,
      diagnosticos_reales: requiereDiagnostico ? diagnosticos : null,
      observaciones_clinicas: observaciones.trim() || null,
      fuente_diagnostico: fuente || null,
    });
  };

  return (
    <ModalShell
      title={t('retroalimentacionformmodal.retroalimentacion_clinica')}
      onClose={onClose}
      maxWidth={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>{t('retroalimentacionformmodal.cancelar')}</Button>
          <Button variant="primary" onClick={submit} loading={saving} disabled={!online}>
            <Check size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('retroalimentacionformmodal.registrar_evaluacion')}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        {!online && <Alert variant="warning" title={t('retroalimentacionformmodal.sin_conexion')} description={t('retroalimentacionformmodal.no_se_puede_registrar_sin_conexion')} />}
        {saveError && <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={t('retroalimentacionformmodal.no_se_pudo_registrar')} description={saveError.message} />}

        {/* Contexto de la inferencia */}
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div><strong>{t('retroalimentacionformmodal.activo_biologico')}</strong> {contexto.id_activo_biologico}</div>
          <div style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}><strong style={{ fontFamily: 'var(--font-sans, inherit)' }}>Inferencia:</strong> {contexto.id_resultado_inferencia}</div>
          {contexto.resumen && <div style={{ marginTop: 'var(--s1)' }}>{contexto.resumen}</div>}
        </div>

        {/* Calificación */}
        <div>
          <label style={LABEL}>{t('retroalimentacionformmodal.como_califica_la_prediccion_del_sistema')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></label>
          <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--s2)' }}>
            {ESTADOS.map((op) => {
              const activo = estado === op.valor;
              return (
                <button
                  key={op.valor}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setEstado(op.valor)}
                  style={{
                    textAlign: 'left', padding: 'var(--s3)', borderRadius: 'var(--r-md)',
                    border: `1.5px solid ${activo ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                    background: activo ? 'var(--brand-50)' : 'var(--surface-card)', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: activo ? 'var(--brand-700)' : 'var(--text-primary)' }}>{op.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{op.desc}</div>
                </button>
              );
            })}
          </div>
          {touched && errEstado && <span role="alert" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--sem-error)' }}>{errEstado}</span>}
        </div>

        {/* Diagnósticos reales */}
        {requiereDiagnostico && (
          <div>
            <label style={LABEL}>{t('retroalimentacionformmodal.patologia_del_diagnostico_real')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span> <span style={{ fontWeight: 400, textTransform: 'none' }}>(máx. 3)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
              {patologiasOpciones.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('retroalimentacionformmodal.no_hay_patologias_disponibles')}</span>}
              {patologiasOpciones.map((p) => {
                const activo = diagnosticos.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => toggleDiag(p.id)}
                    style={{
                      padding: 'var(--s1) var(--s3)', borderRadius: 'var(--r-full)',
                      border: `1.5px solid ${activo ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                      background: activo ? 'var(--brand-50)' : 'var(--surface-card)',
                      color: activo ? 'var(--brand-700)' : 'var(--text-secondary)',
                      fontSize: '12px', fontWeight: activo ? 700 : 500, cursor: 'pointer',
                    }}
                  >
                    {p.nombre}
                  </button>
                );
              })}
            </div>
            {touched && errDiagnosticos && <span role="alert" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--sem-error)' }}>{errDiagnosticos}</span>}
          </div>
        )}

        {/* Fuente */}
        <div>
          <label style={LABEL} htmlFor="retro-fuente">{t('retroalimentacionformmodal.origen_del_diagnostico')}</label>
          <select id="retro-fuente" style={INPUT} value={fuente} onChange={(e) => setFuente(e.target.value as FuenteDiagnostico | '')}>
            <option value="">{t('retroalimentacionformmodal.sin_especificar')}</option>
            {FUENTES.map((f) => <option key={f.valor} value={f.valor}>{f.label}</option>)}
          </select>
        </div>

        {/* Observaciones */}
        <div>
          <label style={LABEL} htmlFor="retro-obs">{t('retroalimentacionformmodal.observaciones_clinicas')}</label>
          <textarea
            id="retro-obs"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder={t('retroalimentacionformmodal.notas_adicionales_sobre_el_caso')}
            style={{ ...INPUT, height: 90, paddingTop: 'var(--s2)', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>
      </div>
    </ModalShell>
  );
}
