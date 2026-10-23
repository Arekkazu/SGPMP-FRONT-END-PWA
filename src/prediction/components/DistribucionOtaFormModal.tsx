// | Fecha      | Nombre       | Que se hizo                                           |
// |------------|--------------|-------------------------------------------------------|
// | 2026-10-23 | destroyerban | FE-08 RF-70: la OTA lista versiones APROBADO          |
import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
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
  MODOS_DISTRIBUCION,
  TIPO_MODELO_LABEL,
  type CrearDistribucionOtaDTO,
  type DispositivoObjetivoOta,
  type VersionModeloResponse,
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

const CAMPO_BACKEND: Partial<Record<string, keyof FormDistribucion>> = {
  id_version_modelo: 'idVersion',
  lista_dispositivos_objetivo: 'dispositivos',
};

/**
 * RF-70 (FE-01b, D6): el Administrador lanza una distribución OTA. El orden en que
 * se marcan los dispositivos decide el rollout: el primero es el canary.
 */
export function DistribucionOtaFormModal({ versiones, dispositivos, lanzando, lanzarError, online, onLanzar, onClose }: Props) {
  const { t } = useT('prediction');
  const [form, setForm] = useState<FormDistribucion>(FORM_DISTRIBUCION_INICIAL);
  const [tocados, setTocados] = useState<Partial<Record<keyof FormDistribucion, boolean>>>({});
  const errores = validarDistribucion(form);

  const set = <K extends keyof FormDistribucion>(campo: K, valor: FormDistribucion[K]) => setForm((f) => ({ ...f, [campo]: valor }));
  const marcar = (campo: keyof FormDistribucion) => setTocados((x) => ({ ...x, [campo]: true }));
  const errorDe = (campo: keyof FormDistribucion): string | undefined => {
    if (tocados[campo] && errores[campo]) return t(`distribucionform.${errores[campo]}`);
    if (lanzarError?.field && CAMPO_BACKEND[lanzarError.field] === campo) return lanzarError.message;
    return undefined;
  };
  const errorGeneral = lanzarError && !(lanzarError.field && CAMPO_BACKEND[lanzarError.field]);

  const submit = () => {
    setTocados(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    if (Object.keys(errores).length > 0) return;
    onLanzar(aDTO(form));
  };

  return (
    <ModalShell
      title={t('distribucionform.titulo')}
      onClose={onClose}
      maxWidth={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={lanzando}>{t('distribucionform.cancelar')}</Button>
          <Button variant="primary" onClick={submit} loading={lanzando} disabled={!online}>
            <Send size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('distribucionform.lanzar')}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        {!online && <Alert variant="warning" title={t('distribucionform.sin_conexion')} description={t('distribucionform.sin_conexion_desc')} />}
        {errorGeneral && <Alert variant="error" title={t('distribucionform.no_se_pudo_lanzar')} description={lanzarError.message} />}

        <div>
          <label style={LABEL} htmlFor="ota-form-version">{t('distribucionform.version')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></label>
          <select
            id="ota-form-version" style={INPUT} value={form.idVersion} aria-required="true"
            aria-invalid={!!errorDe('idVersion')}
            onChange={(e) => set('idVersion', e.target.value)} onBlur={() => marcar('idVersion')}
          >
            <option value="">{t('distribucionform.elige_version')}</option>
            {versiones.map((v) => (
              <option key={v.id_version_modelo} value={v.id_version_modelo}>
                {`${v.nombre_version} · ${TIPO_MODELO_LABEL[v.tipo_modelo] ?? v.tipo_modelo}${v.componente ? ` · ${v.componente}` : ''} · ${t(v.estado_version === 'APROBADO' ? 'distribucionform.estado_aprobado' : 'distribucionform.estado_activo')}`}
              </option>
            ))}
          </select>
          {errorDe('idVersion')
            ? <span role="alert" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--sem-error)' }}>{errorDe('idVersion')}</span>
            : <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('distribucionform.estados_distribuibles')}</span>}
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={LABEL}>{t('distribucionform.dispositivos')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></legend>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--s2)' }}>{t('distribucionform.orden_rollout')}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)', maxHeight: 200, overflowY: 'auto', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s2)' }}>
            {dispositivos.length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('distribucionform.sin_dispositivos')}</span>}
            {dispositivos.map((d) => {
              const orden = form.dispositivos.indexOf(d.id_dispositivo_iot);
              return (
                <label key={d.id_dispositivo_iot} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', minHeight: 'var(--s9)', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={orden >= 0}
                    onChange={() => { set('dispositivos', alternarDispositivo(form.dispositivos, d.id_dispositivo_iot)); marcar('dispositivos'); }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{d.serial}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{d.descripcion}</span>
                  {orden >= 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {orden === 0 ? t('distribucionform.canary') : `#${orden + 1}`}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          {errorDe('dispositivos') && <span role="alert" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--sem-error)' }}>{errorDe('dispositivos')}</span>}
        </fieldset>

        <div className="ds-fg2" style={{ display: 'grid', gap: 'var(--s4)' }}>
          <div>
            <label style={LABEL} htmlFor="ota-form-modo">{t('distribucionform.modo')}</label>
            <select id="ota-form-modo" style={INPUT} value={form.modo} onChange={(e) => set('modo', e.target.value as FormDistribucion['modo'])}>
              {MODOS_DISTRIBUCION.map((m) => <option key={m} value={m}>{t(`distribucionform.modo_${m.toLowerCase()}`)}</option>)}
            </select>
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
      </div>
    </ModalShell>
  );
}
