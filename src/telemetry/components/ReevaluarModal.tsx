// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | H-M3-14 CP107 RF-62: rango invertido no se envía y se avisa en el campo |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-18 RF-62: lectura y sensor por nombre; sensor elegido por nombre |
import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { CheckCircle2 } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { INPUT, LABEL } from './tableStyles';
import { SelectorSensor } from './SelectorSensor';
import type { SolicitarReevaluacionDTO, ReevaluacionResponseSchema, SensorCatalogo } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';

interface Props {
  sensores: SensorCatalogo[];
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

export function ReevaluarModal({ sensores, saving, saveError, reevaluacion, onConfirm, onClose }: Props) {
  const { t } = useT('telemetry');
  const [textoSensor, setTextoSensor] = useState('');
  const [idElegido, setIdElegido] = useState<number | null>(null);
  const idSensor = idElegido != null ? String(idElegido) : '';
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
  // H-M3-14: con «Hasta» antes de «Desde» decía "operación completada" sobre un rango vacío.
  const invertido = !faltaFechas && desde > hasta;
  const errorFechas = touched && (faltaFechas || invertido);
  const causaInvalida = causa.trim().length < 10;

  const confirmar = () => {
    setTouched(true);
    if (faltaSensor || faltaFechas || invertido || causaInvalida) return;
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
      title={t('reevaluarmodal.solicitar_re_evaluacion_de_calidad')}
      onClose={onClose}
      maxWidth={480}
      footer={
        reevaluacion ? (
          <Button variant="primary" size="sm" onClick={onClose}>{t('reevaluarmodal.cerrar')}</Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>{t('reevaluarmodal.cancelar')}</Button>
            <Button variant="primary" size="sm" loading={saving} disabled={saving} onClick={confirmar}>{t('reevaluarmodal.solicitar_re_evaluacion')}</Button>
          </>
        )
      }
    >
      {reevaluacion ? (
        <Alert
          variant="success"
          title={t('reevaluarmodal.re_evaluacion_completada')}
          description={`Evaluaciones creadas: ${reevaluacion.evaluaciones_creadas} · superadas: ${reevaluacion.evaluaciones_superadas}.`}
        />
      ) : (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>{t('reevaluarmodal.re_evalua_la_calidad_de_las_lecturas_de_un')}</p>

          <div className="ds-fg2" style={{ gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              {/* T-18: el sensor se busca por nombre; también acepta el ID escrito. */}
              <SelectorSensor
                id="re-sensor" sensores={sensores} value={textoSensor} required
                onChange={(texto, id) => { setTextoSensor(texto); setIdElegido(id); }}
                error={touched && faltaSensor ? t('reevaluarmodal.elige_un_sensor') : undefined}
              />
            </div>
            <div>
              <label style={LABEL} htmlFor="re-desde">{t('reevaluarmodal.desde')}</label>
              <input id="re-desde" type="date" style={{ ...INPUT, borderColor: errorFechas ? 'var(--sem-error)' : 'var(--surface-border)' }} value={desde} onChange={(e) => setDesde(e.target.value)} aria-required aria-invalid={errorFechas} aria-describedby={errorFechas ? 're-fechas-error' : undefined} />
            </div>
            <div>
              <label style={LABEL} htmlFor="re-hasta">{t('reevaluarmodal.hasta')}</label>
              <input id="re-hasta" type="date" style={{ ...INPUT, borderColor: errorFechas ? 'var(--sem-error)' : 'var(--surface-border)' }} value={hasta} onChange={(e) => setHasta(e.target.value)} aria-required aria-invalid={errorFechas} aria-describedby={errorFechas ? 're-fechas-error' : undefined} />
              {errorFechas && (
                <p id="re-fechas-error" role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
                  {invertido ? t('filtros.rango_invertido', { ns: 'common' }) : t('filtros.fechas_obligatorias', { ns: 'common' })}
                </p>
              )}
            </div>
          </div>

          <div>
            <label style={{ ...LABEL, textTransform: 'none' as const }} htmlFor="re-causa">Causa documentada * (10–1000 caracteres)</label>
            <textarea id="re-causa" style={{ ...TEXTAREA, borderColor: touched && causaInvalida ? 'var(--sem-error)' : 'var(--surface-border)' }} value={causa} maxLength={1000} onChange={(e) => setCausa(e.target.value)} aria-required aria-invalid={touched && causaInvalida} />
            {touched && causaInvalida && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>{t('reevaluarmodal.minimo_10_caracteres')}</p>}
          </div>

          {saveError && (
            <Alert
              variant={saveError.status === 403 ? 'warning' : 'error'}
              title={saveError.status === 403 ? t('reevaluarmodal.sin_permiso_para_re_evaluar') : t('reevaluarmodal.no_se_pudo_solicitar_la_re_evaluacion')}
              description={es500 ? t('reevaluarmodal.ocurrio_un_error_del_servidor_intenta_de') : saveError.message}
              style={{ marginTop: 'var(--s4)' }}
            />
          )}
        </>
      )}
    </ModalShell>
  );
}
