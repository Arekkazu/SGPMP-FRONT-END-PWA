// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-03 RF-72: inferencia por fecha, sin Ninguna al marcar Incorrecto, patologías en grupo con nombre |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-03/N-03 RF-72: diagnósticos de la especie del activo y activo con nombre |
// | 2026-10-29 | Arekkazu | TC-DIS-191/192 RF-72: radiogroup con nombre, diagnóstico anunciado, E4 asociado y observaciones 0/500 |
import React, { useState } from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
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
  /** Identificador del activo; sin él se muestra el número. */
  nombre_activo?: string | null;
  /** M4-03: se muestra "Inferencia del 27/07 08:15"; el UUID no le dice nada al veterinario. */
  fecha_inferencia?: string;
  resumen?: string;
}

/** "Ninguna (estado normal)" contradice un "Incorrecto": si la predicción falló, hubo patología. */
const esNinguna = (nombre: string) => /^ninguna\b/i.test(nombre.trim());

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

/** RF-72: observaciones clínicas de hasta 500 caracteres. */
const MAX_OBSERVACIONES = 500;

export function RetroalimentacionFormModal({ contexto, patologiasOpciones, saving, saveError, online, onSubmit, onClose }: Props) {
  const { t } = useT('prediction');
  const [estado, setEstado] = useState<EstadoRetro | ''>('');
  const [elegidos, setDiagnosticos] = useState<number[]>([]);
  const [fuente, setFuente] = useState<FuenteDiagnostico | ''>('');
  const [observaciones, setObservaciones] = useState('');
  const [touched, setTouched] = useState(false);

  const requiereDiagnostico = estado === 'PARCIAL' || estado === 'INCORRECTO';
  const opciones = patologiasOpciones.filter((p) => estado !== 'INCORRECTO' || !esNinguna(p.nombre));
  // Si se eligió "Ninguna" y luego se marca Incorrecto, deja de contar aunque ya no se vea.
  const diagnosticos = elegidos.filter((id) => opciones.some((p) => p.id === id));
  const errEstado = !estado ? 'Selecciona una calificación.' : undefined;
  // RF-72 E4: el texto es el del RF; el máximo de 3 lo impide la selección.
  const errDiagnosticos = requiereDiagnostico && diagnosticos.length < 1
    ? 'El diagnóstico clínico es obligatorio para este tipo de retroalimentación.'
    : requiereDiagnostico && diagnosticos.length > 3 ? 'Indica entre 1 y 3 diagnósticos reales.' : undefined;
  const diagConError = touched && !!errDiagnosticos;
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
          <div><strong>{t('retroalimentacionformmodal.activo_biologico')}</strong> {contexto.nombre_activo ?? `#${contexto.id_activo_biologico}`}</div>
          <div title={contexto.id_resultado_inferencia}>
            <strong>Inferencia:</strong>{' '}
            {contexto.fecha_inferencia ? `del ${formatearFechaHora(contexto.fecha_inferencia, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : contexto.id_resultado_inferencia}
          </div>
          {contexto.resumen && <div style={{ marginTop: 'var(--s1)' }}>{contexto.resumen}</div>}
        </div>

        {/* Calificación */}
        <div>
          <span id="retro-estado-rotulo" style={{ ...LABEL, display: 'block' }}>{t('retroalimentacionformmodal.como_califica_la_prediccion_del_sistema')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></span>
          <div role="radiogroup" aria-labelledby="retro-estado-rotulo" aria-required="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--s2)' }}>
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

        {/* Diagnósticos reales: la región viva ya existe, así se anuncia al aparecer (4.1.3). */}
        <div aria-live="polite">
        {requiereDiagnostico && (
          <div>
            <span id="retro-diag-rotulo" style={{ ...LABEL, display: 'block' }}>{t('retroalimentacionformmodal.patologia_del_diagnostico_real')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span> <span style={{ fontWeight: 400, textTransform: 'none' }}>(máx. 3)</span></span>
            <div
              id="retro-diag" role="group" aria-labelledby="retro-diag-rotulo"
              aria-describedby={diagConError ? 'retro-diag-error' : undefined}
              aria-errormessage={diagConError ? 'retro-diag-error' : undefined}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}
            >
              {patologiasOpciones.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('retroalimentacionformmodal.no_hay_patologias_disponibles')}</span>}
              {opciones.map((p) => {
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
            {diagConError && <span id="retro-diag-error" role="alert" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--sem-error)' }}>{errDiagnosticos}</span>}
          </div>
        )}
        </div>

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
            maxLength={MAX_OBSERVACIONES}
            aria-describedby="retro-obs-contador"
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder={t('retroalimentacionformmodal.notas_adicionales_sobre_el_caso')}
            style={{ ...INPUT, height: 90, paddingTop: 'var(--s2)', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <span id="retro-obs-contador" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
            {observaciones.length}/{MAX_OBSERVACIONES}
          </span>
        </div>
      </div>
    </ModalShell>
  );
}
