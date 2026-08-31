import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { INPUT, LABEL } from './tableStyles';
import type { SolicitarReevaluacionDTO, ReevaluacionResponseSchema } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';

interface Props {
  saving: boolean;
  saveError: ApiError | null;
  reevaluacion: ReevaluacionResponseSchema | null;
  onConfirm: (dto: SolicitarReevaluacionDTO) => void;
  onClose: () => void;
}

const TEXTAREA: React.CSSProperties = {
  width: '100%', padding: 'var(--s3)', borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)', background: 'var(--surface-card)',
  color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-sans)',
  minHeight: 90, resize: 'vertical', outline: 'none',
};

export function ReevaluarModal({ saving, saveError, reevaluacion, onConfirm, onClose }: Props) {
  const [idSensor, setIdSensor] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [causa, setCausa] = useState('');
  const [touched, setTouched] = useState(false);

  const faltaSensor = !idSensor.trim() || Number(idSensor) <= 0;
  // El rango se normaliza al día calendario local del usuario; una fecha que no
  // se pueda interpretar cuenta como faltante en vez de viajar corrupta.
  const rangoDesde = desde ? inicioDelDiaUtc(desde) : undefined;
  const rangoHasta = hasta ? finDelDiaUtc(hasta) : undefined;
  const faltaFechas = !rangoDesde || !rangoHasta;
  const causaInvalida = causa.trim().length < 10;

  const confirmar = () => {
    setTouched(true);
    if (faltaSensor || faltaFechas || causaInvalida) return;
    onConfirm({
      id_sensor: Number(idSensor),
      fecha_desde: rangoDesde,
      fecha_hasta: rangoHasta,
      causa_documentada: causa.trim(),
    });
  };

  const es500 = saveError?.status != null && saveError.status >= 500;

  return (
    <ModalShell
      title="Solicitar re-evaluación de calidad"
      onClose={onClose}
      maxWidth={480}
      footer={
        reevaluacion ? (
          <Button variant="primary" size="sm" onClick={onClose}>Cerrar</Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button variant="primary" size="sm" loading={saving} disabled={saving} onClick={confirmar}>Solicitar re-evaluación</Button>
          </>
        )
      }
    >
      {reevaluacion ? (
        <Alert
          variant="success"
          title="Re-evaluación completada"
          description={`Evaluaciones creadas: ${reevaluacion.evaluaciones_creadas} · superadas: ${reevaluacion.evaluaciones_superadas}.`}
        />
      ) : (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>
            Re-evalúa la calidad de las lecturas de un sensor en un rango de fechas.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL} htmlFor="re-sensor">ID sensor *</label>
              <input id="re-sensor" type="number" style={{ ...INPUT, borderColor: touched && faltaSensor ? 'var(--sem-error)' : 'var(--surface-border)' }} value={idSensor} onChange={(e) => setIdSensor(e.target.value)} aria-required aria-invalid={touched && faltaSensor} />
            </div>
            <div>
              <label style={LABEL} htmlFor="re-desde">Desde *</label>
              <input id="re-desde" type="date" style={{ ...INPUT, borderColor: touched && faltaFechas ? 'var(--sem-error)' : 'var(--surface-border)' }} value={desde} onChange={(e) => setDesde(e.target.value)} aria-required />
            </div>
            <div>
              <label style={LABEL} htmlFor="re-hasta">Hasta *</label>
              <input id="re-hasta" type="date" style={{ ...INPUT, borderColor: touched && faltaFechas ? 'var(--sem-error)' : 'var(--surface-border)' }} value={hasta} onChange={(e) => setHasta(e.target.value)} aria-required />
            </div>
          </div>

          <div>
            <label style={{ ...LABEL, textTransform: 'none' as const }} htmlFor="re-causa">Causa documentada * (10–1000 caracteres)</label>
            <textarea id="re-causa" style={{ ...TEXTAREA, borderColor: touched && causaInvalida ? 'var(--sem-error)' : 'var(--surface-border)' }} value={causa} maxLength={1000} onChange={(e) => setCausa(e.target.value)} aria-required aria-invalid={touched && causaInvalida} />
            {touched && causaInvalida && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>Mínimo 10 caracteres.</p>}
          </div>

          {saveError && (
            <Alert
              variant={saveError.status === 403 ? 'warning' : 'error'}
              title={saveError.status === 403 ? 'Sin permiso para re-evaluar' : 'No se pudo solicitar la re-evaluación'}
              description={es500 ? 'Ocurrió un error del servidor. Intenta de nuevo más tarde.' : saveError.message}
              style={{ marginTop: 'var(--s4)' }}
            />
          )}
        </>
      )}
    </ModalShell>
  );
}
