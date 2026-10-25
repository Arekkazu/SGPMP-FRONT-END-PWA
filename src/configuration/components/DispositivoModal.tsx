import React, { useEffect, useState } from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { X, Cpu } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { TIPO_GATEWAY_EDGE } from '../types';
import type { DispositivoIotResponse, InfraestructuraResponse, RegistrarDispositivoIotDTO, TipoDispositivoIotResponse } from '../types';
import { tiposDispositivoApi } from '../api/iotApi';
import type { ApiError } from '../../shared/api/errors';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import { useErroresDeServidor } from '../../shared/hooks/useErroresDeServidor';
import { humanizar } from '../../shared/lib/etiquetas';

interface FormValues {
  serial: string;
  descripcion: string;
  id_tipo_dispositivo: string;
  id_dispositivo_gateway: string;
  // RF-21 v2.0 (RFC-011): solo cámaras.
  resolucion: string;
  fps: string;
  area_cobertura_m2: string;
}

const CAMPOS = [
  'serial', 'descripcion', 'id_tipo_dispositivo', 'id_dispositivo_gateway', 'resolucion', 'fps', 'area_cobertura_m2',
] as const;
const RESOLUCION_REGEX = /^[1-9][0-9]*x[1-9][0-9]*$/;

interface Props {
  area: InfraestructuraResponse;
  /** RF-21: Gateway Edge activos de la finca, para vincular el dispositivo nuevo. */
  edges: DispositivoIotResponse[];
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: RegistrarDispositivoIotDTO) => Promise<boolean>;
}

const SERIAL_REGEX = /^[A-Za-z0-9_\-]+$/;

export function DispositivoModal({ area, edges, saving, saveError, onClose, onRegistrar }: Props) {
  const dialogRef = useModalA11y(onClose);
  const { t } = useT('configuration');
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
    // M9-06: onTouched valida en el primer blur y luego en cada cambio; con onBlur el
    // error "obligatorio" seguía visible después de elegir un tipo.
  } = useForm<FormValues>({ mode: 'onTouched' });
  const alertaGeneral = useErroresDeServidor(saveError, setError, CAMPOS);

  // #179: el backend exige id_tipo_dispositivo desde RF-23 (rangos por tipo).
  const [tipos, setTipos] = useState<TipoDispositivoIotResponse[]>([]);
  useEffect(() => {
    reset({ serial: '', descripcion: '', id_tipo_dispositivo: '', id_dispositivo_gateway: '', resolucion: '', fps: '', area_cobertura_m2: '' });
    tiposDispositivoApi.listar().then(setTipos).catch(() => setTipos([]));
  }, [reset]);

  useEffect(() => {
    if (saveError?.status === 409) {
      setError('serial', { message: t('dispositivomodal.ya_existe_un_dispositivo_con_este_serial') });
    }
  }, [saveError, setError]);

  // Un Gateway Edge no depende de otro Edge: el selector solo aplica al resto.
  const tipoElegido = tipos.find((tipo) => String(tipo.id_tipo_dispositivo) === watch('id_tipo_dispositivo'));
  const esEdge = tipoElegido?.nombre === TIPO_GATEWAY_EDGE;
  const esCamara = tipoElegido?.categoria === 'CAMARA';

  const onSubmit = async (data: FormValues) => {
    const ok = await onRegistrar({
      serial: data.serial.trim().toUpperCase(),
      descripcion: data.descripcion.trim(),
      id_infraestructura: area.id_infraestructura,
      id_tipo_dispositivo: Number(data.id_tipo_dispositivo),
      id_dispositivo_gateway: !esEdge && data.id_dispositivo_gateway ? Number(data.id_dispositivo_gateway) : null,
      ...(esCamara && {
        resolucion: data.resolucion.trim(),
        fps: Number(data.fps),
        area_cobertura_m2: Number(data.area_cobertura_m2),
      }),
    });
    if (ok) onClose();
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="disp-modal-title"
      className="ds-modal"
      style={{ zIndex: 1010 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ds-modal__panel">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--s5) var(--s6)', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
            <Cpu size={18} color="var(--brand-500)" aria-hidden />
            <h2 id="disp-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('dispositivomodal.registrar_dispositivo_iot')}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('dispositivomodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        <div style={{ padding: 'var(--s6)' }}>
          {saveError && saveError.status !== 409 && alertaGeneral && (
            <Alert
              variant="error"
              title={t('dispositivomodal.error_al_registrar')}
              description={saveError.message}
              style={{ marginBottom: 'var(--s5)' }}
            />
          )}

          {/* Área readonly */}
          <div style={{
            padding: 'var(--s3) var(--s4)', background: 'var(--surface-hover)',
            borderRadius: 'var(--r-md)', marginBottom: 'var(--s5)',
            border: '1px solid var(--surface-border)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s1)' }}>{t('dispositivomodal.area_productiva_asignada')}</div>
            <div style={{ fontWeight: 700, fontSize: 'var(--fs-body-md)', color: 'var(--text-primary)' }}>
              {area.tipo_area} — {area.nombre_infraestructura}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              #{area.id_infraestructura} · {formatearNumero(area.superficie)} m²
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Serial */}
            <div style={{ marginBottom: 'var(--s4)' }}>
              <Input
                id="disp-serial"
                label={t('dispositivomodal.serial_fisico_del_dispositivo')}
                required
                placeholder={t('dispositivomodal.ej_sn_esp32_2024_001')}
                maxLength={50}
                hint={t('dispositivomodal.se_guardara_en_mayusculas_debe_ser_unico_en')}
                error={errors.serial?.message}
                {...register('serial', {
                  required: t('dispositivomodal.el_serial_del_dispositivo_es_obligatorio'),
                  minLength: { value: 3, message: t('dispositivomodal.minimo_3_caracteres') },
                  maxLength: { value: 50, message: t('dispositivomodal.maximo_50_caracteres') },
                  pattern: { value: SERIAL_REGEX, message: t('dispositivomodal.solo_letras_numeros_guiones_y_guiones_bajos') },
                })}
              />
            </div>

            {/* Tipo de dispositivo */}
            <div style={{ marginBottom: 'var(--s4)' }}>
              <Select
                id="disp-tipo"
                label={t('dispositivomodal.tipo_de_dispositivo')}
                required
                error={errors.id_tipo_dispositivo?.message}
                {...register('id_tipo_dispositivo', { required: t('dispositivomodal.el_tipo_de_dispositivo_es_obligatorio') })}
              >
                <option value="">{t('dispositivomodal.seleccione_un_tipo')}</option>
                {tipos.map((tipo) => (
                  <option key={tipo.id_tipo_dispositivo} value={tipo.id_tipo_dispositivo}>{humanizar(tipo.nombre)}</option>
                ))}
              </Select>
            </div>

            {/* Gateway Edge que lo atiende (RF-21) */}
            {tipoElegido && !esEdge && (
              <div style={{ marginBottom: 'var(--s4)' }}>
                <Select
                  id="disp-gateway"
                  label={t('dispositivomodal.gateway_edge_que_lo_atiende')}
                  hint={edges.length ? t('dispositivomodal.gateway_edge_ayuda') : t('dispositivomodal.no_hay_gateway_edge_en_la_finca')}
                  {...register('id_dispositivo_gateway')}
                >
                  <option value="">{t('dispositivomodal.sin_gateway_edge')}</option>
                  {edges.map((e) => (
                    <option key={e.id_dispositivo_iot} value={e.id_dispositivo_iot}>{e.serial} — {e.descripcion}</option>
                  ))}
                </Select>
              </div>
            )}
            {esEdge && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 0, marginBottom: 'var(--s4)' }}>{t('dispositivomodal.es_gateway_edge_ayuda')}</p>
            )}

            {/* Atributos de visión (RF-21 v2.0, RFC-011) */}
            {/* La región existe siempre: un live region que se monta junto con su texto no se anuncia (WCAG 4.1.3, TC-DIS-55). */}
            <p role="status" className="ds-sr-only">{esCamara ? t('dispositivomodal.campos_camara_anuncio') : ''}</p>
            {esCamara && (
              <div className="ds-fg2" style={{ gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
                <Input
                  label={t('dispositivomodal.resolucion')}
                  required
                  placeholder="1920x1080"
                  error={errors.resolucion?.message}
                  {...register('resolucion', {
                    required: t('dispositivomodal.campo_obligatorio_para_camara'),
                    pattern: { value: RESOLUCION_REGEX, message: t('dispositivomodal.formato_ancho_x_alto') },
                  })}
                />
                <Input
                  label="FPS"
                  type="number"
                  required
                  placeholder="25"
                  error={errors.fps?.message}
                  {...register('fps', {
                    required: t('dispositivomodal.campo_obligatorio_para_camara'),
                    validate: (v) => (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 60) || t('dispositivomodal.fps_entre_1_y_60'),
                  })}
                />
                <Input
                  label={t('dispositivomodal.area_de_cobertura_m2')}
                  type="number"
                  required
                  placeholder="80"
                  error={errors.area_cobertura_m2?.message}
                  {...register('area_cobertura_m2', {
                    required: t('dispositivomodal.campo_obligatorio_para_camara'),
                    validate: (v) => Number(v) > 0 || t('dispositivomodal.debe_ser_mayor_a_0'),
                  })}
                />
              </div>
            )}

            {/* Descripción */}
            <div style={{ marginBottom: 'var(--s5)' }}>
              <Input
                label={t('dispositivomodal.descripcion_tipo_modelo_o_referencia')}
                required
                aria-required="true"
                placeholder={t('dispositivomodal.ej_sensor_esp32_temperatura_humedad_modelo')}
                error={errors.descripcion?.message}
                {...register('descripcion', {
                  required: t('dispositivomodal.la_descripcion_es_obligatoria'),
                  minLength: { value: 5, message: t('dispositivomodal.minimo_5_caracteres') },
                  maxLength: { value: 100, message: t('dispositivomodal.maximo_100_caracteres') },
                })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
              <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('dispositivomodal.cancelar')}</Button>
              <Button type="submit" variant="primary" size="md" loading={saving}>{t('dispositivomodal.registrar_dispositivo')}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
