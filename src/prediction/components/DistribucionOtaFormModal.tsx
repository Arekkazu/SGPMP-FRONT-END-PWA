// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-21 | Arekkazu     | PROTO-V2 RF-70: asistente en 3 pasos (versión, configuración, dispositivos) |
// | 2026-10-23 | destroyerban | FE-08 RF-70: la OTA lista versiones APROBADO          |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22: plurales y separador de miles en contadores |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-09: tipo de modelo vacío se lee "Sin tipo" |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-05 RF-70: buscador y filtro por categoría en el paso de dispositivos |
import React, { useMemo, useState } from 'react';
import { Send, ChevronLeft, ChevronRight, PackageX } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Stepper } from '../../shared/design-system/Stepper';
import { Buscador } from '../../shared/design-system/Buscador';
import { useBusqueda } from '../../shared/hooks/useBusqueda';
import type { ApiError } from '../../shared/api/errors';
import { ModalShell } from './ModalShell';
import { INPUT, LABEL } from './tableStyles';
import {
  FORM_DISTRIBUCION_INICIAL,
  aDTO,
  alternarDispositivo,
  validarDistribucion,
  type FormDistribucion,
} from '../lib/distribucionOta';
import {
  COMPONENTES,
  MODOS_DISTRIBUCION,
  PARADIGMA_POR_TIPO,
  type CrearDistribucionOtaDTO,
  type DispositivoObjetivoOta,
  type TipoModelo,
  type VersionModeloResponse,
  etiquetaTipoModelo,
} from '../types';

interface Props {
  versiones: VersionModeloResponse[];
  dispositivos: DispositivoObjetivoOta[];
  lanzando: boolean;
  lanzarError: ApiError | null;
  online: boolean;
  onLanzar: (dto: CrearDistribucionOtaDTO) => void;
  onClose: () => void;
}

type Paso = 'version' | 'config' | 'dispositivos';
const PASOS: Paso[] = ['version', 'config', 'dispositivos'];

/** Campos que valida cada paso antes de dejar avanzar. */
const CAMPOS_PASO: Record<Paso, (keyof FormDistribucion)[]> = {
  version: ['idVersion'],
  config: ['modo', 'ventanaInicio', 'ventanaFin', 'bateriaMinima', 'tamanoFragmento', 'reintentos', 'porcentajeParcial'],
  dispositivos: ['dispositivos'],
};

const CAMPO_BACKEND: Partial<Record<string, keyof FormDistribucion>> = {
  id_version_modelo: 'idVersion',
  lista_dispositivos_objetivo: 'dispositivos',
};

const ERROR: React.CSSProperties = { display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--sem-error)' };
const AYUDA: React.CSSProperties = { display: 'block', marginTop: 'var(--s1)', fontSize: '11px', color: 'var(--text-muted)' };

/**
 * RF-70 (FE-01b, D6): el Administrador lanza una distribución OTA. El orden en que
 * se marcan los dispositivos decide el rollout: el primero es el canary.
 */
export function DistribucionOtaFormModal({ versiones, dispositivos, lanzando, lanzarError, online, onLanzar, onClose }: Props) {
  const { t } = useT('prediction');
  const [form, setForm] = useState<FormDistribucion>(FORM_DISTRIBUCION_INICIAL);
  const [tocados, setTocados] = useState<Partial<Record<keyof FormDistribucion, boolean>>>({});
  const [paso, setPaso] = useState<Paso>('version');
  const [tipo, setTipo] = useState<TipoModelo | ''>('');
  const [componente, setComponente] = useState('');
  const errores = validarDistribucion(form);
  const iPaso = PASOS.indexOf(paso);

  const set = <K extends keyof FormDistribucion>(campo: K, valor: FormDistribucion[K]) => setForm((f) => ({ ...f, [campo]: valor }));
  const marcar = (campo: keyof FormDistribucion) => setTocados((x) => ({ ...x, [campo]: true }));
  const errorDe = (campo: keyof FormDistribucion): string | undefined => {
    if (tocados[campo] && errores[campo]) return t(`distribucionform.${errores[campo]}`);
    if (lanzarError?.field && CAMPO_BACKEND[lanzarError.field] === campo) return lanzarError.message;
    return undefined;
  };
  const errorGeneral = lanzarError && !(lanzarError.field && CAMPO_BACKEND[lanzarError.field]);

  const tipos = useMemo(() => [...new Set(versiones.map((v) => v.tipo_modelo))], [versiones]);
  const poblacional = tipo !== '' && PARADIGMA_POR_TIPO[tipo] === 'POBLACIONAL';
  const candidatas = versiones.filter((v) => (!tipo || v.tipo_modelo === tipo) && (!poblacional || !componente || v.componente === componente));
  const elegida = versiones.find((v) => String(v.id_version_modelo) === form.idVersion);
  // M4-05: eran 373 equipos de todas las fincas sin forma de encontrar uno. Buscador
  // y filtro por categoría; "Seleccionar todos" toma solo los que se están viendo.
  const [categoria, setCategoria] = useState('');
  const categorias = useMemo(() => [...new Set(dispositivos.map((d) => d.categoria).filter(Boolean))] as string[], [dispositivos]);
  const porCategoria = useMemo(() => (categoria ? dispositivos.filter((d) => d.categoria === categoria) : dispositivos), [dispositivos, categoria]);
  const { consulta, setConsulta, filtrados: visibles } = useBusqueda(porCategoria, (d) => `${d.serial} ${d.descripcion ?? ''}`);
  const habilitados = visibles.filter((d) => d.es_activo);

  /** Marca los campos del paso; si alguno tiene error no avanza. */
  const pasoValido = (p: Paso) => {
    setTocados((x) => ({ ...x, ...Object.fromEntries(CAMPOS_PASO[p].map((k) => [k, true])) }));
    return CAMPOS_PASO[p].every((k) => !errores[k]);
  };
  const siguiente = () => { if (pasoValido(paso)) setPaso(PASOS[iPaso + 1]); };
  const submit = () => {
    if (!PASOS.every((p) => pasoValido(p))) return;
    onLanzar(aDTO(form));
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={lanzando}>{t('distribucionform.cancelar')}</Button>
      {iPaso > 0 && (
        <Button variant="ghost" onClick={() => setPaso(PASOS[iPaso - 1])} disabled={lanzando}>
          <ChevronLeft size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('distribucionform.anterior')}
        </Button>
      )}
      {paso !== 'dispositivos' ? (
        <Button variant="primary" onClick={siguiente} disabled={versiones.length === 0}>
          {t('distribucionform.siguiente')}<ChevronRight size={16} aria-hidden style={{ marginLeft: 'var(--s1)' }} />
        </Button>
      ) : (
        <Button variant="primary" onClick={submit} loading={lanzando} disabled={!online}>
          <Send size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('distribucionform.lanzar')}
        </Button>
      )}
    </>
  );

  return (
    <ModalShell title={t('distribucionform.titulo')} onClose={onClose} maxWidth={640} footer={footer}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <Stepper
          pasos={PASOS.map((p) => ({ id: p, label: t(`distribucionform.paso_${p}`) }))}
          actual={paso}
          aria-label={t('distribucionform.pasos_aria')}
        />

        {!online && <Alert variant="warning" title={t('distribucionform.sin_conexion')} description={t('distribucionform.sin_conexion_desc')} />}
        {errorGeneral && <Alert variant="error" title={t('distribucionform.no_se_pudo_lanzar')} description={lanzarError.message} />}

        {paso === 'version' && (versiones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--s6) var(--s4)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)', color: 'var(--text-muted)' }}>
            <PackageX size={28} aria-hidden style={{ marginBottom: 'var(--s2)' }} />
            <p style={{ margin: '0 0 var(--s1)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('distribucionform.sin_versiones')}</p>
            <p style={{ margin: 0, fontSize: '13px' }}>{t('distribucionform.sin_versiones_ayuda')}</p>
          </div>
        ) : (
          <>
            <div className="ds-fg2" style={{ display: 'grid', gap: 'var(--s4)' }}>
              <div>
                <label style={LABEL} htmlFor="ota-form-tipo">{t('distribucionform.tipo_modelo')}</label>
                <select id="ota-form-tipo" style={INPUT} value={tipo} onChange={(e) => { setTipo(e.target.value as TipoModelo | ''); setComponente(''); set('idVersion', ''); }}>
                  <option value="">{t('distribucionform.todos_los_tipos')}</option>
                  {tipos.map((tm) => <option key={tm} value={tm}>{etiquetaTipoModelo(tm)}</option>)}
                </select>
              </div>
              {poblacional && (
                <div>
                  <label style={LABEL} htmlFor="ota-form-componente">{t('distribucionform.componente')}</label>
                  <select id="ota-form-componente" style={INPUT} value={componente} onChange={(e) => { setComponente(e.target.value); set('idVersion', ''); }}>
                    <option value="">{t('distribucionform.todos_los_componentes')}</option>
                    {COMPONENTES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span style={AYUDA}>{t('distribucionform.componente_ayuda')}</span>
                </div>
              )}
            </div>

            <div>
              <label style={LABEL} htmlFor="ota-form-version">{t('distribucionform.version')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></label>
              <select
                id="ota-form-version" style={INPUT} value={form.idVersion} aria-required="true"
                aria-invalid={!!errorDe('idVersion')}
                onChange={(e) => set('idVersion', e.target.value)} onBlur={() => marcar('idVersion')}
              >
                <option value="">{t('distribucionform.elige_version')}</option>
                {candidatas.map((v) => (
                  <option key={v.id_version_modelo} value={v.id_version_modelo}>
                    {`${v.nombre_version} · ${etiquetaTipoModelo(v.tipo_modelo)}${v.componente ? ` · ${v.componente}` : ''} · ${t(v.estado_version === 'APROBADO' ? 'distribucionform.estado_aprobado' : 'distribucionform.estado_activo')}`}
                  </option>
                ))}
              </select>
              {errorDe('idVersion') ? <span role="alert" style={ERROR}>{errorDe('idVersion')}</span> : <span style={AYUDA}>{t('distribucionform.estados_distribuibles')}</span>}
            </div>

            {elegida && (
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s3)', margin: 0, padding: 'var(--s4)', background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', fontSize: '12px' }}>
                {[
                  [t('distribucionform.info_tipo'), `${etiquetaTipoModelo(elegida.tipo_modelo)}${elegida.componente ? ` · ${elegida.componente}` : ''}`],
                  [t('distribucionform.info_estado'), elegida.estado_version],
                  [t('distribucionform.info_formato'), elegida.formato_artefacto ?? '—'],
                  [t('distribucionform.info_tamano'), elegida.tamanio_artefacto_bytes ? `${(elegida.tamanio_artefacto_bytes / 1_048_576).toFixed(1)} MB` : '—'],
                ].map(([k, v]) => (
                  <div key={k}><dt style={{ color: 'var(--text-muted)' }}>{k}</dt><dd style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>{v}</dd></div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt style={{ color: 'var(--text-muted)' }}>SHA-256</dt>
                  <dd style={{ margin: 0, fontFamily: 'var(--font-mono)', wordBreak: 'break-all', color: 'var(--text-primary)' }}>{elegida.hash_artefacto_sha256 ?? '—'}</dd>
                </div>
              </dl>
            )}
          </>
        ))}

        {paso === 'config' && (
          <div className="ds-fg2" style={{ display: 'grid', gap: 'var(--s4)' }}>
            <div>
              <label style={LABEL} htmlFor="ota-form-modo">{t('distribucionform.modo')}</label>
              <select id="ota-form-modo" style={INPUT} value={form.modo} onChange={(e) => set('modo', e.target.value as FormDistribucion['modo'])}>
                {MODOS_DISTRIBUCION.map((m) => <option key={m} value={m}>{t(`distribucionform.modo_${m.toLowerCase()}`)}</option>)}
              </select>
              <span style={AYUDA}>{t(`distribucionform.modo_${form.modo.toLowerCase()}_ayuda`)}</span>
            </div>
            <Input
              label={t('distribucionform.porcentaje_parcial')} type="number" min={20} max={30} value={form.porcentajeParcial}
              onChange={(e) => set('porcentajeParcial', e.target.value)} onBlur={() => marcar('porcentajeParcial')}
              error={errorDe('porcentajeParcial')} hint={t('distribucionform.porcentaje_parcial_hint')}
            />
            <Input
              label={t('distribucionform.ventana_inicio')} type="datetime-local" value={form.ventanaInicio}
              required={form.modo === 'PROGRAMADO'}
              onChange={(e) => set('ventanaInicio', e.target.value)} onBlur={() => marcar('ventanaInicio')}
              error={errorDe('ventanaInicio')}
            />
            <Input
              label={t('distribucionform.ventana_fin')} type="datetime-local" value={form.ventanaFin}
              required={form.modo === 'PROGRAMADO'}
              onChange={(e) => set('ventanaFin', e.target.value)} onBlur={() => marcar('ventanaFin')}
              error={errorDe('ventanaFin')}
            />
            <Input
              label={t('distribucionform.bateria_minima')} type="number" min={0} max={100} value={form.bateriaMinima}
              onChange={(e) => set('bateriaMinima', e.target.value)} onBlur={() => marcar('bateriaMinima')}
              error={errorDe('bateriaMinima')}
            />
            <Input
              label={t('distribucionform.tamano_fragmento')} type="number" min={1} value={form.tamanoFragmento} required
              onChange={(e) => set('tamanoFragmento', e.target.value)} onBlur={() => marcar('tamanoFragmento')}
              error={errorDe('tamanoFragmento')}
            />
            <Input
              label={t('distribucionform.reintentos')} type="number" min={0} max={20} value={form.reintentos} required
              onChange={(e) => set('reintentos', e.target.value)} onBlur={() => marcar('reintentos')}
              error={errorDe('reintentos')}
            />
          </div>
        )}

        {paso === 'dispositivos' && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={LABEL}>{t('distribucionform.dispositivos')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></legend>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s2)' }}>
              <span aria-live="polite" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('distribucionform.seleccionados', { count: form.dispositivos.length, n: form.dispositivos.length })}</span>
              <span style={{ display: 'flex', gap: 'var(--s2)' }}>
                <Button variant="ghost" size="sm" disabled={habilitados.length === 0} onClick={() => { set('dispositivos', habilitados.map((d) => d.id_dispositivo_iot)); marcar('dispositivos'); }}>{t('distribucionform.seleccionar_todos')}</Button>
                <Button variant="ghost" size="sm" disabled={form.dispositivos.length === 0} onClick={() => { set('dispositivos', []); marcar('dispositivos'); }}>{t('distribucionform.deseleccionar')}</Button>
              </span>
            </div>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--s2)' }}>{t('distribucionform.orden_rollout')}</span>
            <div style={{ display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Buscador id="ota-buscar" label={t('distribucionform.buscar_dispositivo')} value={consulta} onChange={setConsulta} resultados={visibles.length} />
              {categorias.length > 1 && (
                <div style={{ marginBottom: 'var(--s4)', minWidth: 160 }}>
                  <label style={LABEL} htmlFor="ota-categoria">{t('distribucionform.categoria')}</label>
                  <select id="ota-categoria" style={INPUT} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                    <option value="">{t('distribucionform.todas')}</option>
                    {categorias.map((c) => <option key={c} value={c}>{t(`distribucionform.categoria_${c}`, { defaultValue: c })}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)', maxHeight: 260, overflowY: 'auto', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s2)' }}>
              {visibles.length === 0 && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {dispositivos.length === 0 ? t('distribucionform.sin_dispositivos') : t('distribucionform.sin_coincidencias')}
                </span>
              )}
              {visibles.map((d) => {
                const orden = form.dispositivos.indexOf(d.id_dispositivo_iot);
                return (
                  <label key={d.id_dispositivo_iot} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', minHeight: 'var(--s9)', fontSize: '13px', color: d.es_activo ? 'var(--text-primary)' : 'var(--text-muted)', cursor: d.es_activo ? 'pointer' : 'not-allowed' }}>
                    <input
                      type="checkbox" checked={orden >= 0} disabled={!d.es_activo}
                      onChange={() => { set('dispositivos', alternarDispositivo(form.dispositivos, d.id_dispositivo_iot)); marcar('dispositivos'); }}
                    />
                    {/* Descripción primero; el serial (hasta 45 caracteres) se parte y no desborda el modal. */}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600 }}>{d.descripcion || d.serial}</span>
                      {d.descripcion && <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{d.serial}</span>}
                    </span>
                    {d.categoria && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t(`distribucionform.categoria_${d.categoria}`, { defaultValue: d.categoria })}</span>}
                    {!d.es_activo && <span style={{ fontSize: '11px' }}>{t('distribucionform.inactivo')}</span>}
                    {orden >= 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {orden === 0 ? t('distribucionform.canary') : `#${orden + 1}`}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            {errorDe('dispositivos') && <span role="alert" style={ERROR}>{errorDe('dispositivos')}</span>}
          </fieldset>
        )}
      </div>
    </ModalShell>
  );
}
