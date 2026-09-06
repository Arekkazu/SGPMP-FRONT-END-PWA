import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Save } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ThresholdStrip } from './ThresholdStrip';
import { INPUT, LABEL } from './tableStyles';
import type { ConfiguracionMotorIAResponse, ConfigurarMotorDTO, ModoEjecucion, TipoModelo, VersionModeloResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  tipoModelo: TipoModelo;
  config: ConfiguracionMotorIAResponse | null;
  versiones: VersionModeloResponse[];
  saving: boolean;
  saveError: ApiError | null;
  online: boolean;
  puedeEditar: boolean;
  onGuardar: (dto: ConfigurarMotorDTO) => void;
}

const MODOS: ModoEjecucion[] = ['SERVIDOR', 'EDGE', 'HIBRIDO'];

function RangoCampo({
  label, valor, min, max, step, unidad, disabled, onChange,
}: { label: string; valor: number; min: number; max: number; step: number; unidad?: string; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <div>
      <label style={LABEL}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
        <input
          type="range"
          min={min} max={max} step={step} value={valor}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--brand-500)' }}
          aria-label={label}
        />
        <input
          type="number"
          min={min} max={max} step={step} value={valor}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ...INPUT, width: 90, height: 34 }}
        />
        {unidad && <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: 28 }}>{unidad}</span>}
      </div>
    </div>
  );
}

export function MotorConfigForm({ tipoModelo, config, versiones, saving, saveError, online, puedeEditar, onGuardar }: Props) {
  const { t } = useT('prediction');
  const [riesgoAlto, setRiesgoAlto] = useState(0.7);
  const [alertaCritica, setAlertaCritica] = useState(0.85);
  const [ventana, setVentana] = useState(10);
  const [modo, setModo] = useState<ModoEjecucion>('SERVIDOR');
  const [version, setVersion] = useState<number | ''>('');
  const [wSan, setWSan] = useState(0.5);
  const [wAmb, setWAmb] = useState(0.3);
  const [wDen, setWDen] = useState(0.2);

  useEffect(() => {
    setRiesgoAlto(config?.umbral_riesgo_alto ?? 0.7);
    setAlertaCritica(config?.umbral_alerta_critica ?? 0.85);
    setVentana(config?.ventana_temporal_min ?? 10);
    setModo((config?.modo_ejecucion as ModoEjecucion) ?? 'SERVIDOR');
    setVersion(config?.id_version_modelo_activa ?? '');
    setWSan(config?.w_factor_sanitario ?? 0.5);
    setWAmb(config?.w_factor_ambiental ?? 0.3);
    setWDen(config?.w_factor_densidad ?? 0.2);
  }, [config, tipoModelo]);

  const sumaPesos = Number((wSan + wAmb + wDen).toFixed(3));
  const errUmbral = alertaCritica < riesgoAlto ? 'La alerta crítica debe ser mayor o igual al riesgo alto.' : undefined;
  const pesosOk = Math.abs(sumaPesos - 1) < 0.001;

  const guardar = () => {
    if (errUmbral) return;
    onGuardar({
      tipo_modelo: tipoModelo,
      umbral_riesgo_alto: riesgoAlto,
      umbral_alerta_critica: alertaCritica,
      ventana_temporal_min: ventana,
      modo_ejecucion: modo,
      w_factor_sanitario: wSan,
      w_factor_ambiental: wAmb,
      w_factor_densidad: wDen,
      id_version_modelo_activa: version === '' ? null : Number(version),
    });
  };

  const versionesTipo = versiones.filter((v) => v.tipo_modelo === tipoModelo);

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s6)' }}>
      {saveError && <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={t('motorconfigform.no_se_pudo_guardar')} description={saveError.message} style={{ marginBottom: 'var(--s5)' }} />}

      <section style={{ marginBottom: 'var(--s6)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{t('motorconfigform.umbrales_de_riesgo')}</h3>
        <div style={{ display: 'grid', gap: 'var(--s5)' }}>
          <RangoCampo label={t('motorconfigform.umbral_de_riesgo_alto')} valor={riesgoAlto} min={0.5} max={0.95} step={0.01} disabled={!puedeEditar} onChange={setRiesgoAlto} />
          <RangoCampo label={t('motorconfigform.umbral_de_alerta_critica')} valor={alertaCritica} min={0.5} max={0.99} step={0.01} disabled={!puedeEditar} onChange={setAlertaCritica} />
          <ThresholdStrip riesgoAlto={riesgoAlto} alertaCritica={alertaCritica} />
          {errUmbral && <span role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)' }}>{errUmbral}</span>}
          <RangoCampo label={t('motorconfigform.ventana_de_analisis')} valor={ventana} min={5} max={15} step={1} unidad="min" disabled={!puedeEditar} onChange={setVentana} />
        </div>
      </section>

      <section style={{ marginBottom: 'var(--s6)', borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s5)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{t('motorconfigform.ejecucion_y_version')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--s4)' }}>
          <div>
            <label style={LABEL} htmlFor="motor-modo">{t('motorconfigform.modo_de_ejecucion')}</label>
            <select id="motor-modo" style={INPUT} value={modo} disabled={!puedeEditar} onChange={(e) => setModo(e.target.value as ModoEjecucion)}>
              {MODOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="motor-version">{t('motorconfigform.version_del_modelo_activo')}</label>
            <select id="motor-version" style={INPUT} value={version} disabled={!puedeEditar} onChange={(e) => setVersion(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">{t('motorconfigform.sin_asignar')}</option>
              {versionesTipo.map((v) => (
                <option key={v.id_version_modelo} value={v.id_version_modelo}>
                  {v.nombre_version} · {v.estado_version}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--s6)', borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s5)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{t('motorconfigform.pesos_del_calculo_de_riesgo')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--s4)' }}>
          <RangoCampo label={t('motorconfigform.factor_sanitario')} valor={wSan} min={0} max={1} step={0.05} disabled={!puedeEditar} onChange={setWSan} />
          <RangoCampo label={t('motorconfigform.factor_ambiental')} valor={wAmb} min={0} max={1} step={0.05} disabled={!puedeEditar} onChange={setWAmb} />
          <RangoCampo label={t('motorconfigform.factor_densidad')} valor={wDen} min={0} max={1} step={0.05} disabled={!puedeEditar} onChange={setWDen} />
        </div>
        <p style={{ fontSize: '12px', color: pesosOk ? 'var(--text-muted)' : 'var(--sem-warning)', marginTop: 'var(--s3)' }}>{t('motorconfigform.suma_de_pesos')}<strong style={{ fontFamily: 'var(--font-mono)' }}>{sumaPesos.toFixed(2)}</strong>
          {!pesosOk && ' — se recomienda que sumen 1.00'}
        </p>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={guardar} loading={saving} disabled={!puedeEditar || !online || !!errUmbral}>
          <Save size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('motorconfigform.guardar_configuracion')}</Button>
      </div>
    </div>
  );
}
