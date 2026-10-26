// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-65: modo como tarjetas, pesos solo META, contrato del modelo y confirmaciones |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-04 RF-65: solo versiones APROBADO/ACTIVO; alerta crítica 0,50–0,95 con 0,70 por defecto |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-24: los campos numéricos con su etiqueta |
import React, { useEffect, useId, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { humanizar as etiquetaEstadoVersion } from '../../shared/lib/etiquetas';
import { Save, Server, Cpu, Shuffle, Info } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { ModalShell } from './ModalShell';
import { ThresholdStrip } from './ThresholdStrip';
import { ContratoModeloPanel } from './ContratoModeloPanel';
import { INPUT, LABEL } from './tableStyles';
import { COMPONENTES, PARADIGMA_POR_TIPO } from '../types';
import type { Componente, ConfiguracionMotorIAResponse, ConfigurarMotorDTO, ModoEjecucion, TipoModelo, VersionModeloResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  tipoModelo: TipoModelo;
  config: ConfiguracionMotorIAResponse | null;
  versiones: VersionModeloResponse[];
  saving: boolean;
  saveError: ApiError | null;
  online: boolean;
  puedeEditar: boolean;
  /** Seriales de nodos Edge que aún no confirman la configuración vigente. */
  nodosSinConfirmar: string[];
  onGuardar: (dto: ConfigurarMotorDTO) => void;
}

const MODOS: { id: ModoEjecucion; icon: React.ReactNode }[] = [
  { id: 'SERVIDOR', icon: <Server size={18} aria-hidden /> },
  { id: 'EDGE', icon: <Cpu size={18} aria-hidden /> },
  { id: 'HIBRIDO', icon: <Shuffle size={18} aria-hidden /> },
];

const H3: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' };
const SECCION: React.CSSProperties = { marginBottom: 'var(--s6)', borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s5)' };

function RangoCampo({
  label, valor, min, max, step, unidad, disabled, onChange,
}: { label: string; valor: number; min: number; max: number; step: number; unidad?: string; disabled?: boolean; onChange: (v: number) => void }) {
  // T-24: el número no tenía nombre accesible y el <label> no apuntaba a ningún campo.
  const id = useId();
  return (
    <div>
      <label style={LABEL} htmlFor={id}>{label}</label>
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
          id={id}
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

function NoAplica({ label }: { label: string }) {
  const { t } = useT('prediction');
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)', fontSize: '13px', color: 'var(--text-muted)' }}>
      <span>{label}</span><span>{t('motorconfigform.no_aplica')}</span>
    </div>
  );
}

interface CambioVersion { componente: Componente | null; valor: number }

export function MotorConfigForm({ tipoModelo, config, versiones, saving, saveError, online, puedeEditar, nodosSinConfirmar, onGuardar }: Props) {
  const { t } = useT('prediction');
  const [riesgoAlto, setRiesgoAlto] = useState(0.7);
  const [alertaCritica, setAlertaCritica] = useState(0.7);
  const [ventana, setVentana] = useState(10);
  const [modo, setModo] = useState<ModoEjecucion>('SERVIDOR');
  const [version, setVersion] = useState<number | ''>('');
  // RFC-009: POBLACIONAL usa un umbral de anomalía y una versión activa por componente.
  const [scoreAnomalia, setScoreAnomalia] = useState(0.7);
  const [versionesComp, setVersionesComp] = useState<Partial<Record<Componente, number>>>({});
  const paradigma = PARADIGMA_POR_TIPO[tipoModelo];
  const poblacional = paradigma === 'POBLACIONAL';
  const [wSan, setWSan] = useState(0.5);
  const [wAmb, setWAmb] = useState(0.3);
  const [wDen, setWDen] = useState(0.2);
  const [cambioVersion, setCambioVersion] = useState<CambioVersion | null>(null);
  const [confirmarPendientes, setConfirmarPendientes] = useState(false);

  useEffect(() => {
    setRiesgoAlto(config?.umbral_riesgo_alto ?? 0.7);
    setAlertaCritica(config?.umbral_alerta_critica ?? 0.7);
    setVentana(config?.ventana_temporal_min ?? 10);
    setModo((config?.modo_ejecucion as ModoEjecucion) ?? 'SERVIDOR');
    setVersion(config?.id_version_modelo_activa ?? '');
    setScoreAnomalia(config?.umbral_score_anomalia ?? 0.7);
    setVersionesComp(config?.versiones_activas_por_componente ?? {});
    setWSan(config?.w_factor_sanitario ?? 0.5);
    setWAmb(config?.w_factor_ambiental ?? 0.3);
    setWDen(config?.w_factor_densidad ?? 0.2);
  }, [config, tipoModelo]);

  const sumaPesos = Number((wSan + wAmb + wDen).toFixed(3));
  const errUmbral = !poblacional && alertaCritica < riesgoAlto ? t('motorconfigform.error_orden_umbrales') : undefined;
  // El backend rechaza (PESOS_CONTAGIO_INVALIDOS) cualquier suma distinta de 1 con tolerancia 0.001.
  const errPesos = Math.abs(sumaPesos - 1) >= 0.001 ? t('motorconfigform.error_suma_pesos') : undefined;
  const bloqueado = !!errUmbral || !!errPesos;

  const enviar = () => {
    setConfirmarPendientes(false);
    const comunes = {
      tipo_modelo: tipoModelo,
      ventana_temporal_min: ventana,
      modo_ejecucion: modo,
      w_factor_sanitario: wSan,
      w_factor_ambiental: wAmb,
      w_factor_densidad: wDen,
    };
    onGuardar(poblacional
      ? { ...comunes, umbral_score_anomalia: scoreAnomalia, versiones_activas_por_componente: versionesComp }
      : {
        ...comunes,
        umbral_riesgo_alto: riesgoAlto,
        umbral_alerta_critica: alertaCritica,
        id_version_modelo_activa: version === '' ? null : Number(version),
      });
  };

  const guardar = () => {
    if (bloqueado) return;
    if (modo !== 'SERVIDOR' && nodosSinConfirmar.length > 0) setConfirmarPendientes(true);
    else enviar();
  };

  // M4-04: solo se ofrecen versiones APROBADO o ACTIVO (E2 de RF-65); antes salía
  // una RECHAZADO. La que ya está asignada se conserva para que el select la muestre.
  const asignadas = new Set([version, ...Object.values(versionesComp)].filter(Boolean).map(String));
  const versionesTipo = versiones.filter((v) => v.tipo_modelo === tipoModelo
    && (['APROBADO', 'ACTIVO'].includes(v.estado_version) || asignadas.has(String(v.id_version_modelo))));
  const nombreVersion = (id: number | undefined | '') => versionesTipo.find((v) => v.id_version_modelo === id)?.nombre_version ?? (id ? `#${id}` : '');

  // Cambiar la versión activa pide confirmación: aplica a los ciclos nuevos, no a los que corren.
  const pedirCambioVersion = (componente: Componente | null, valor: string) => {
    if (valor !== '') { setCambioVersion({ componente, valor: Number(valor) }); return; }
    if (componente) setVersionesComp(({ [componente]: _quitado, ...resto }) => resto);
    else setVersion('');
  };
  const aplicarCambioVersion = () => {
    if (!cambioVersion) return;
    const { componente, valor } = cambioVersion;
    if (componente) setVersionesComp((prev) => ({ ...prev, [componente]: valor }));
    else setVersion(valor);
    setCambioVersion(null);
  };

  const versionVigente = poblacional
    ? COMPONENTES.filter((c) => versionesComp[c]).map((c) => `${c}: ${nombreVersion(versionesComp[c])}`).join(' · ')
    : nombreVersion(version);
  const variables = !poblacional ? versionesTipo.find((v) => v.id_version_modelo === version)?.compatibilidad_variables ?? null : null;
  const gestionadoPorAdmin = !puedeEditar && <p style={{ margin: 'var(--s1) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('motorconfigform.gestionado_admin')}</p>;

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--s3)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('motorconfigform.parametros_del_motor')}</h2>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{t('motorconfigform.config_version', { v: config?.config_version ?? '—' })}</span>
      </div>

      {saveError && saveError.code !== 'MODO_EDGE_SIN_NODOS' && (
        <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={t('motorconfigform.no_se_pudo_guardar')} description={saveError.message} style={{ marginBottom: 'var(--s5)' }} />
      )}

      <section style={{ marginBottom: 'var(--s6)' }}>
        <h3 style={H3}>{t('motorconfigform.umbrales_de_clasificacion')}</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 var(--s4)' }}>
          {t('motorconfigform.paradigma')} <strong>{t(`contrato.paradigma_${paradigma}`)}</strong>
        </p>
        <div style={{ display: 'grid', gap: 'var(--s5)' }}>
          {poblacional ? (
            <>
              <div role="note" style={{ display: 'flex', gap: 'var(--s2)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--sem-info-border)', background: 'var(--sem-info-bg)', color: 'var(--text-primary)', fontSize: '13px' }}>
                <Info size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0, marginTop: 1 }} />
                <span><strong>{t('motorconfigform.poblacional_titulo')}</strong> {t('motorconfigform.poblacional_texto')}</span>
              </div>
              <RangoCampo label={t('motorconfigform.umbral_de_score_de_anomalia')} valor={scoreAnomalia} min={0} max={1} step={0.01} disabled={!puedeEditar} onChange={setScoreAnomalia} />
              <div style={{ display: 'grid', gap: 'var(--s2)' }}>
                <NoAplica label={t('motorconfigform.umbral_de_riesgo_alto')} />
                <NoAplica label={t('motorconfigform.umbral_de_alerta_critica')} />
                <NoAplica label={t('motorconfigform.validacion_de_orden')} />
              </div>
            </>
          ) : (
            <>
              <RangoCampo label={t('motorconfigform.umbral_de_riesgo_alto')} valor={riesgoAlto} min={0.5} max={0.95} step={0.01} disabled={!puedeEditar} onChange={setRiesgoAlto} />
              <RangoCampo label={t('motorconfigform.umbral_de_alerta_critica')} valor={alertaCritica} min={0.5} max={0.95} step={0.01} disabled={!puedeEditar} onChange={setAlertaCritica} />
              <ThresholdStrip riesgoAlto={riesgoAlto} alertaCritica={alertaCritica} />
            </>
          )}
          {errUmbral && <span role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)' }}>{errUmbral}</span>}
        </div>
      </section>

      {paradigma === 'META' && (
        <section style={SECCION}>
          <h3 style={H3}>{t('motorconfigform.pesos_contagio')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--s4)' }}>
            <RangoCampo label={t('motorconfigform.factor_sanitario')} valor={wSan} min={0} max={1} step={0.05} disabled={!puedeEditar} onChange={setWSan} />
            <RangoCampo label={t('motorconfigform.factor_ambiental')} valor={wAmb} min={0} max={1} step={0.05} disabled={!puedeEditar} onChange={setWAmb} />
            <RangoCampo label={t('motorconfigform.factor_densidad')} valor={wDen} min={0} max={1} step={0.05} disabled={!puedeEditar} onChange={setWDen} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s3)', marginBottom: 0 }}>
            {t('motorconfigform.suma_de_pesos')}{' '}<strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{sumaPesos.toFixed(2)}</strong>
          </p>
          {errPesos && <span role="alert" style={{ display: 'block', fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)' }}>{errPesos}</span>}
        </section>
      )}

      <section style={SECCION}>
        <h3 style={H3}>{t('motorconfigform.ventana_titulo')}</h3>
        <RangoCampo label={t('motorconfigform.ventana_de_analisis')} valor={ventana} min={5} max={15} step={1} unidad="min" disabled={!puedeEditar} onChange={setVentana} />
        <p style={{ margin: 'var(--s2) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('motorconfigform.ventana_ayuda')}</p>
      </section>

      <section style={SECCION}>
        <h3 style={H3}>{t('motorconfigform.ejecucion_y_version')}</h3>

        <div style={{ marginBottom: 'var(--s5)' }}>
          <span id="motor-modo" style={LABEL}>{t('motorconfigform.modo_de_ejecucion')}</span>
          <div role="group" aria-labelledby="motor-modo" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s3)' }}>
            {MODOS.map((m) => (
              <OptionCard key={m.id} selected={modo === m.id} disabled={!puedeEditar} onClick={() => setModo(m.id)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontWeight: 700 }}>{m.icon}{t(`motorconfigform.modo_${m.id}`)}</span>
                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginTop: 'var(--s1)' }}>{t(`motorconfigform.modo_${m.id}_ayuda`)}</span>
              </OptionCard>
            ))}
          </div>
          {gestionadoPorAdmin}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--s4)' }}>
          {poblacional ? COMPONENTES.map((c) => (
            <div key={c}>
              <label style={LABEL} htmlFor={`motor-version-${c}`}>{t('motorconfigform.version_activa_de', { componente: c })}</label>
              <select id={`motor-version-${c}`} style={INPUT} value={versionesComp[c] ?? ''} disabled={!puedeEditar} onChange={(e) => pedirCambioVersion(c, e.target.value)}>
                <option value="">{t('motorconfigform.sin_asignar')}</option>
                {versionesTipo.filter((v) => v.componente === c).map((v) => (
                  <option key={v.id_version_modelo} value={v.id_version_modelo}>
                    {v.nombre_version} · {etiquetaEstadoVersion(v.estado_version)}
                  </option>
                ))}
              </select>
            </div>
          )) : (
            <div>
              <label style={LABEL} htmlFor="motor-version">{t('motorconfigform.version_del_modelo_activo')}</label>
              <select id="motor-version" style={INPUT} value={version} disabled={!puedeEditar} onChange={(e) => pedirCambioVersion(null, e.target.value)}>
                <option value="">{t('motorconfigform.sin_asignar')}</option>
                {versionesTipo.map((v) => (
                  <option key={v.id_version_modelo} value={v.id_version_modelo}>
                    {v.nombre_version} · {etiquetaEstadoVersion(v.estado_version)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {poblacional && <p style={{ margin: 'var(--s2) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('motorconfigform.ayuda_componentes')}</p>}
        {gestionadoPorAdmin}
      </section>

      <ContratoModeloPanel tipoModelo={tipoModelo} versionVigente={versionVigente} variables={variables} />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={guardar} loading={saving} disabled={!puedeEditar || !online || bloqueado}>
          <Save size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('motorconfigform.guardar_configuracion')}</Button>
      </div>

      {cambioVersion && (
        <ModalShell
          title={t('motorconfigform.confirmar_version_titulo')}
          onClose={() => setCambioVersion(null)}
          maxWidth={440}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setCambioVersion(null)}>{t('motorconfigform.cancelar')}</Button>
              <Button variant="primary" onClick={aplicarCambioVersion}>{t('motorconfigform.confirmar_cambio')}</Button>
            </>
          )}
        >
          <p style={{ margin: '0 0 var(--s3)', fontSize: '14px', color: 'var(--text-primary)' }}>
            {t('motorconfigform.confirmar_version_texto', { version: nombreVersion(cambioVersion.valor) })}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{t('motorconfigform.confirmar_version_nota')}</p>
        </ModalShell>
      )}

      {confirmarPendientes && (
        <ModalShell
          title={t('motorconfigform.pendientes_titulo')}
          onClose={() => setConfirmarPendientes(false)}
          maxWidth={440}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setConfirmarPendientes(false)}>{t('motorconfigform.cancelar')}</Button>
              <Button variant="primary" onClick={enviar}>{t('motorconfigform.guardar_igual')}</Button>
            </>
          )}
        >
          <p style={{ margin: '0 0 var(--s3)', fontSize: '14px', color: 'var(--text-primary)' }}>{t('motorconfigform.pendientes_texto', { count: nodosSinConfirmar.length, n: nodosSinConfirmar.length })}</p>
          <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{nodosSinConfirmar.join(' · ')}</p>
        </ModalShell>
      )}
    </div>
  );
}
