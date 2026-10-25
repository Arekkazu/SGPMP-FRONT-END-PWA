// | Fecha      | Nombre       | Que se hizo |
// |------------|--------------|-------------|
// | 2026-10-21 | destroyerban | #66 RF-33: valida atributos dinámicos (tipo, rango) y su carga     |
// | 2026-10-21 | destroyerban | #69 RF-33: especie e infraestructura solo del catálogo activo      |
// | 2026-10-23 | destroyerban | FE-07 RF-33/48: multiespecie por grupo, fecha de nacimiento opcional y aviso de edad |
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Controller, useForm } from 'react-hook-form';
import { Boxes, User } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Combobox } from '../../shared/design-system/Combobox';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import type { ApiError } from '../../shared/api/errors';
import type { ParametroEspecie, RegistrarActivoDTO, TipoActivo, OrigenFinanciero } from '../types';
import { activosApi } from '../api/activosApi';
import { hoyLocal } from '../../shared/lib/fecha';
import { humanizar } from '../../shared/lib/etiquetas';
import { formatearNumero } from '../../shared/i18n/formato';
import { useCatalogoRegistro } from '../hooks/useCatalogoRegistro';
import { idDeCatalogo } from '../../shared/lib/catalogo';
import { usePermission } from '../../shared/rbac/usePermission';
import { Link } from 'react-router-dom';
import type { InfraestructuraResponse } from '../../configuration/types';

export { idDeCatalogo };

interface FormValues {
  tipo_activo: TipoActivo;
  id_especie: string;
  /** Solo para acotar las infraestructuras; no viaja al backend. */
  id_finca: string;
  fecha_inicio_ciclo: string;
  id_infraestructura: string;
  origen_financiero: OrigenFinanciero;
  costo_adquisicion: string;
  soporte_documental: string;
  detalles_procedencia: string;
  // individual
  identificador: string;
  raza: string;
  sexo: string;
  fecha_nacimiento: string;
  peso_inicial: string;
  // poblacional
  cantidad_inicial: string;
  peso_promedio_inicial: string;
  // atributos dinámicos de la especie, por posición en `parametros`
  atrib: (string | boolean)[];
}

interface Props {
  saving: boolean;
  saveError: ApiError | null;
  onSubmit: (dto: RegistrarActivoDTO) => Promise<boolean>;
  onCancel: () => void;
}

const SELECT: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  height: 44,
  cursor: 'pointer',
};

const TEXTAREA: React.CSSProperties = {
  width: '100%',
  minHeight: 68,
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  resize: 'vertical',
  outline: 'none',
};

const FIELD_LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--fs-label-md)',
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 'var(--s1)',
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 'var(--fs-body-md)',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  margin: '0 0 var(--s3)',
};

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 'var(--s4)',
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
      {msg}
    </p>
  );
}


function valorAtributo(p: ParametroEspecie, v: string | boolean | undefined): unknown {
  if (p.tipo_dato === 'BOOLEANO') return Boolean(v);
  if (v === undefined || v === '') return null;
  if (p.tipo_dato === 'NUMERICO' || p.tipo_dato === 'ENTERO') return Number(v);
  return String(v).trim();
}

/**
 * RF-33 (RFC-004): mismas reglas que el backend contra la configuración RF-16
 * (obligatoriedad, tipo de dato y rango inclusive), para avisar en el campo antes
 * del 422. Devuelve la clave i18n del error o null si el valor es válido.
 */
export function errorAtributo(
  p: ParametroEspecie,
  v: string | boolean | undefined,
): { clave: string; params?: Record<string, string> } | null {
  if (p.tipo_dato === 'BOOLEANO') return null;
  const texto = typeof v === 'string' ? v.trim() : '';
  if (texto === '') return p.es_obligatorio ? { clave: 'registraractivoform.este_atributo_es_obligatorio' } : null;
  if (p.tipo_dato !== 'NUMERICO' && p.tipo_dato !== 'ENTERO') return null;
  const numero = Number(texto);
  if (!Number.isFinite(numero)) return { clave: 'registraractivoform.atributo_debe_ser_numero' };
  if (p.tipo_dato === 'ENTERO' && !Number.isInteger(numero)) return { clave: 'registraractivoform.atributo_debe_ser_entero' };
  if (p.valor_min !== null && numero < Number(p.valor_min)) {
    return { clave: 'registraractivoform.atributo_minimo', params: { min: formatearNumero(p.valor_min) } };
  }
  if (p.valor_max !== null && numero > Number(p.valor_max)) {
    return { clave: 'registraractivoform.atributo_maximo', params: { max: formatearNumero(p.valor_max) } };
  }
  return null;
}

function etiquetaAtributo(p: ParametroEspecie): string {
  const nombre = humanizar(p.nombre);
  return p.unidad_medida && p.unidad_medida !== 'N/A' ? `${nombre} (${p.unidad_medida})` : nombre;
}

export function RegistrarActivoForm({ saving, saveError, onSubmit, onCancel }: Props) {
  const { t } = useT('biologicalAssets');
  const {
    register, control, handleSubmit, watch, setError, setValue, resetField, formState: { errors },
  } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: {
      tipo_activo: 'INDIVIDUAL',
      id_especie: '',
      id_infraestructura: '',
      origen_financiero: 'compra',
      sexo: '',
    },
  });

  const tipo = watch('tipo_activo');
  const origen = watch('origen_financiero');
  const esIndividual = tipo === 'INDIVIDUAL';
  const requiereSoporte = origen === 'compra' || origen === 'donacion';
  const esNacimiento = origen === 'nacimiento';

  const {
    especies, fincas, infraestructuras, cargando, cargandoInfra, cargarInfraestructuras,
    errorCatalogo, errorInfra, reintentarCatalogo,
  } = useCatalogoRegistro();
  const idFinca = Number(watch('id_finca')) || null;
  const opcEspecies = especies.map((e) => ({ id: e.id_especie, nombre: e.nombre }));
  useEffect(() => {
    resetField('id_infraestructura');
    cargarInfraestructuras(idFinca);
  }, [idFinca, cargarInfraestructuras, resetField]);

  // #194 (RF-33 FA-07): atributos dinámicos que la especie exige al registrar.
  // #69: solo cuenta una especie del catálogo activo; un ID escrito que no está en él no carga atributos.
  const idEscrito = idDeCatalogo(watch('id_especie'), opcEspecies);
  const especie = especies.find((e) => e.id_especie === idEscrito);
  const idEspecie = especie?.id_especie ?? 0;
  // RFC-012 (FE-07): un área aloja varias especies del mismo grupo de manejo; si la del
  // activo no está, el backend la asocia. Sin especie elegida aún no se filtra.
  const especiesDelArea = (i: InfraestructuraResponse) => i.especies ?? (i.especie_id != null ? [i.especie_id] : []);
  const grupoDe = (id: number) => especies.find((e) => e.id_especie === id)?.grupo_manejo ?? null;
  const esCompatible = (i: InfraestructuraResponse) => {
    const ids = especiesDelArea(i);
    if (!idEspecie || ids.length === 0 || ids.includes(idEspecie)) return true;
    const grupo = especie?.grupo_manejo;
    // Grupo desconocido (especie inactiva o sin cargar): decide el backend (422 si difiere).
    return !grupo || ids.every((id) => { const g = grupoDe(id); return g == null || g === grupo; });
  };
  const infraCompatibles = infraestructuras.filter(esCompatible);
  const opcInfra = infraCompatibles.map((i) => ({ id: i.id_infraestructura, nombre: i.nombre_infraestructura }));
  // La finca tiene áreas, pero de otro grupo: se dice cuáles en vez de "Sin coincidencias".
  const nombreGrupo = (i: InfraestructuraResponse) =>
    [...new Set(especiesDelArea(i).map((id) => grupoDe(id)).filter(Boolean))].map((g) => humanizar(String(g))).join(', ');
  const otrasEspecies = [...new Set(infraestructuras.map(nombreGrupo).filter(Boolean))].join(', ');
  // RF-20: solo el Administrador crea/edita áreas; el resto debe pedírselo.
  const puedeCrearAreas = usePermission(10, 1);
  const motivoSinInfra = idFinca && !cargandoInfra && !errorInfra && infraCompatibles.length === 0
    ? (infraestructuras.length > 0
      ? t('registraractivoform.areas_de_otra_especie', { especie: especie?.nombre ?? '', otras: otrasEspecies })
      : t('registraractivoform.sin_infraestructuras_compatibles'))
    : undefined;
  const sinInfraCompatibles = motivoSinInfra && !puedeCrearAreas
    ? `${motivoSinInfra} ${t('registraractivoform.contacta_administrador_area')}`
    : motivoSinInfra;
  // #298 1.1 / RFC-012 (FE-07): sin densidad máxima el backend rechaza el registro (422,
  // la capacidad del área se calcula con ella), también de un individual; se avisa antes.
  // `=== null` y no `== null`: una especie cacheada sin el campo no debe bloquear el registro.
  const densidadEspecie = especie
    ? (especie.densidad_poblacional_max !== undefined ? especie.densidad_poblacional_max : especie.densidad_maxima_por_especie)
    : undefined;
  const especieSinDensidad = !!especie && densidadEspecie === null;
  const [parametros, setParametros] = useState<ParametroEspecie[]>([]);
  // Sin la configuración de la especie el registro saldría sin sus atributos y el
  // backend lo rechazaría (422) sin un campo donde corregirlo: se espera o se reintenta.
  const [estadoParametros, setEstadoParametros] = useState<'listo' | 'cargando' | 'error'>('listo');
  const [intentoParametros, setIntentoParametros] = useState(0);
  useEffect(() => {
    if (!Number.isInteger(idEspecie) || idEspecie < 1) {
      setParametros([]);
      setEstadoParametros('listo');
      return;
    }
    let vigente = true;
    setEstadoParametros('cargando');
    const temporizador = setTimeout(() => {
      activosApi.parametrosEspecie(idEspecie, tipo)
        .then((lista) => {
          if (!vigente) return;
          setValue('atrib', []);
          setParametros(lista);
          setEstadoParametros('listo');
        })
        .catch(() => {
          if (!vigente) return;
          setParametros([]);
          setEstadoParametros('error');
        });
    }, 400);
    return () => { vigente = false; clearTimeout(temporizador); };
  }, [idEspecie, tipo, setValue, intentoParametros]);

  // El rango configurado se muestra de antemano, no solo cuando el valor ya es inválido.
  const rango = (p: ParametroEspecie): string | undefined => {
    if (p.tipo_dato !== 'NUMERICO' && p.tipo_dato !== 'ENTERO') return undefined;
    const min = p.valor_min !== null ? formatearNumero(p.valor_min) : null;
    const max = p.valor_max !== null ? formatearNumero(p.valor_max) : null;
    if (min && max) return t('registraractivoform.atributo_rango', { min, max });
    if (min) return t('registraractivoform.atributo_minimo', { min });
    if (max) return t('registraractivoform.atributo_maximo', { max });
    return undefined;
  };

  // RFC-012 (FE-07): los 422 de capacidad y de grupo de manejo señalan el área.
  useEffect(() => {
    if (saveError?.field === 'id_infraestructura') {
      setError('id_infraestructura', { message: saveError.message }, { shouldFocus: true });
    }
  }, [saveError, setError]);

  // El backend señala el atributo con field="atributos_dinamicos.<nombre>".
  useEffect(() => {
    const campo = saveError?.field;
    if (!campo?.startsWith('atributos_dinamicos.')) return;
    const nombre = campo.slice('atributos_dinamicos.'.length).toLowerCase();
    const i = parametros.findIndex((p) => p.nombre.toLowerCase() === nombre);
    if (i >= 0) setError(`atrib.${i}`, { message: saveError!.message }, { shouldFocus: true });
  }, [saveError, parametros, setError]);

  const submit = async (v: FormValues) => {
    const dto: RegistrarActivoDTO = {
      tipo_activo: v.tipo_activo,
      id_especie: idDeCatalogo(v.id_especie, opcEspecies)!,
      fecha_inicio_ciclo: v.fecha_inicio_ciclo,
      id_infraestructura: idDeCatalogo(v.id_infraestructura, opcInfra)!,
      origen_financiero: v.origen_financiero,
      detalles_procedencia: v.detalles_procedencia.trim() || null,
      costo_adquisicion: requiereSoporte && v.costo_adquisicion ? Number(v.costo_adquisicion) : null,
      soporte_documental: requiereSoporte ? (v.soporte_documental.trim() || null) : null,
    };

    if (parametros.length > 0) {
      const atributos: Record<string, unknown> = {};
      parametros.forEach((p, i) => {
        const valor = valorAtributo(p, v.atrib?.[i]);
        if (valor !== null) atributos[p.nombre] = valor;
      });
      dto.atributos_dinamicos = atributos;
    }

    if (esIndividual) {
      dto.identificador = v.identificador.trim();
      dto.raza = v.raza.trim();
      dto.sexo = v.sexo;
      dto.fecha_nacimiento = v.fecha_nacimiento || null;  // día calendario YYYY-MM-DD
      dto.peso_inicial = v.peso_inicial ? Number(v.peso_inicial) : null;
    } else {
      dto.cantidad_inicial = Number(v.cantidad_inicial);
      dto.peso_promedio_inicial = v.peso_promedio_inicial ? Number(v.peso_promedio_inicial) : null;
    }

    await onSubmit(dto);
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate style={{ maxWidth: 760 }}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('registraractivoform.no_se_pudo_registrar_el_activo')}
          description={saveError.message}
          style={{ marginBottom: 'var(--s5)' }}
        />
      )}

      {/* Tipo de activo */}
      <div style={{ marginBottom: 'var(--s6)' }}>
        <span style={SECTION_TITLE}>{t('registraractivoform.tipo_de_activo')}</span>
        <div style={{ display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap' }}>
          {(['INDIVIDUAL', 'POBLACIONAL'] as TipoActivo[]).map((opcion) => {
            // #290 1.2: la variable del map ocultaba `tipo` y las dos salían marcadas.
            const activo = opcion === tipo;
            return (
              <label
                key={opcion}
                style={{
                  flex: 1,
                  minWidth: 200,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--s3)',
                  padding: 'var(--s4)',
                  borderRadius: 'var(--r-lg)',
                  border: `${activo ? 2 : 1.5}px solid ${activo ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                  background: activo ? 'var(--brand-50)' : 'var(--surface-card)',
                  cursor: 'pointer',
                }}
              >
                <input type="radio" value={opcion} {...register('tipo_activo')} style={{ accentColor: 'var(--brand-500)' }} />
                {opcion === 'POBLACIONAL' ? <Boxes size={18} aria-hidden /> : <User size={18} aria-hidden />}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {opcion === 'POBLACIONAL' ? 'Poblacional (lote)' : 'Individual'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {opcion === 'POBLACIONAL' ? 'Grupo con cantidad' : 'Un ejemplar identificado'}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* #69: sin los catálogos no se puede validar especie ni infraestructura. */}
      {errorCatalogo && (
        <div style={{ marginBottom: 'var(--s6)' }}>
          <Alert
            variant="error"
            title={t('registraractivoform.catalogos_no_cargados_titulo')}
            description={t('registraractivoform.catalogos_no_cargados_detalle')}
            style={{ marginBottom: 'var(--s3)' }}
          />
          <Button type="button" variant="secondary" size="sm" onClick={reintentarCatalogo}>
            {t('registraractivoform.reintentar')}
          </Button>
        </div>
      )}

      {/* Datos generales */}
      <div style={{ marginBottom: 'var(--s6)' }}>
        <span style={SECTION_TITLE}>{t('registraractivoform.datos_generales')}</span>
        <div style={GRID}>
          <Controller
            name="id_especie"
            control={control}
            rules={{
              required: t('registraractivoform.la_especie_es_obligatoria'),
              // #69 (RF-33): la especie debe existir y estar activa en el catálogo de configuración (RF-15).
              validate: (v) => {
                const id = idDeCatalogo(v, opcEspecies);
                if (id === null) return t('registraractivoform.opcion_no_valida');
                return especies.some((e) => e.id_especie === id) || t('registraractivoform.especie_no_disponible');
              },
            }}
            render={({ field }) => (
              <Combobox
                id="registro-especie" label={t('registraractivoform.especie')} required
                name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref}
                opciones={especies.map((e) => ({ valor: `${e.nombre} (#${e.id_especie})` }))}
                placeholder={cargando ? t('registraractivoform.cargando') : undefined}
                hint={t('registraractivoform.especie_hint')}
                error={errors.id_especie?.message}
              />
            )}
          />
          <Select
            id="registro-finca"
            label={t('registraractivoform.finca')}
            disabled={cargando}
            hint={!cargando && fincas.length === 0 ? t('registraractivoform.sin_fincas') : t('registraractivoform.finca_hint')}
            {...register('id_finca')}
          >
            <option value="">{cargando ? t('registraractivoform.cargando') : t('registraractivoform.seleccionar')}</option>
            {fincas.map((f) => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
          </Select>
          <div>
            <Controller
              name="id_infraestructura"
              control={control}
              rules={{
                required: t('registraractivoform.la_infraestructura_es_obligatoria'),
                validate: (v) => {
                  const id = idDeCatalogo(v, opcInfra);
                  if (id === null) return t('registraractivoform.opcion_no_valida');
                  // #69 (RF-33): el área debe existir, estar activa y ser de la finca elegida (RF-20);
                  // sin finca no hay contra qué validarla.
                  if (!idFinca) return t('registraractivoform.elige_finca_primero');
                  const area = infraestructuras.find((i) => i.id_infraestructura === id);
                  if (!area) return t('registraractivoform.infraestructura_no_disponible');
                  // Regla C1: escribir el ID de un área de otro grupo de manejo no salta el filtro.
                  return esCompatible(area) || t('registraractivoform.area_de_otra_especie', {
                    area: area.nombre_infraestructura, especie: nombreGrupo(area),
                  });
                },
              }}
              render={({ field }) => (
                <Combobox
                  id="registro-infraestructura" label={t('registraractivoform.infraestructura')} required
                  name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref}
                  opciones={infraCompatibles.map((i) => ({
                    valor: `${i.nombre_infraestructura} (#${i.id_infraestructura})`,
                    detalle: `${i.tipo_area} · ${formatearNumero(i.superficie)} m²${i.capacidad_maxima != null
                      ? ` · ${t('registraractivoform.capacidad_area', { capacidad: formatearNumero(i.capacidad_maxima) })}`
                      : ''}`,
                  }))}
                  placeholder={cargandoInfra ? t('registraractivoform.cargando') : undefined}
                  hint={sinInfraCompatibles ?? t('registraractivoform.infraestructura_hint')}
                  vacio={sinInfraCompatibles}
                  error={errors.id_infraestructura?.message}
                />
              )}
            />
            {errorInfra && (
              <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap', marginTop: 'var(--s2)' }}>
                <span style={{ fontSize: '12px', color: 'var(--sem-error)' }}>{t('registraractivoform.infraestructuras_no_cargadas')}</span>
                <Button type="button" variant="secondary" size="sm" onClick={() => cargarInfraestructuras(idFinca)}>
                  {t('registraractivoform.reintentar')}
                </Button>
              </div>
            )}
            {sinInfraCompatibles && puedeCrearAreas && (
              <Link to="/configuracion" style={{ color: 'var(--brand-600)', fontWeight: 600, fontSize: 'var(--fs-label-md)' }}>
                {t('registraractivoform.ir_a_crear_area')}
              </Link>
            )}
          </div>
          <Input
            label={t('registraractivoform.fecha_de_inicio_de_ciclo')} required type="date" max={hoyLocal()}
            error={errors.fecha_inicio_ciclo?.message}
            {...register('fecha_inicio_ciclo', {
              required: t('registraractivoform.la_fecha_de_inicio_es_obligatoria'),
              validate: (val) => {
                if (val > hoyLocal()) return t('registraractivoform.no_puede_ser_una_fecha_futura');
                if (val < '1970-01-01') return t('registraractivoform.no_puede_ser_anterior_a_1970');
                return true;
              },
            })}
          />
        </div>
      </div>

      {especieSinDensidad && (
        <Alert
          variant="warning"
          title={t('registraractivoform.lote_sin_densidad_titulo')}
          description={t('registraractivoform.lote_sin_densidad_detalle', { especie: especie!.nombre })}
          style={{ marginBottom: 'var(--s6)' }}
        />
      )}

      {/* Origen financiero */}
      <div style={{ marginBottom: 'var(--s6)' }}>
        <span style={SECTION_TITLE}>{t('registraractivoform.origen_financiero')}</span>
        <div style={GRID}>
          <div>
            <label style={FIELD_LABEL} htmlFor="origen_financiero">{t('registraractivoform.origen')}<span aria-hidden="true">*</span></label>
            <select id="origen_financiero" style={SELECT} {...register('origen_financiero')}>
              <option value="compra">{t('registraractivoform.compra')}</option>
              <option value="nacimiento">{t('registraractivoform.nacimiento')}</option>
              <option value="donacion">{t('registraractivoform.donacion')}</option>
              <option value="transferencia_interna">{t('registraractivoform.transferencia_interna')}</option>
            </select>
          </div>

          {requiereSoporte && (
            <>
              <Input
                label={t('registraractivoform.costo_de_adquisicion')} required type="number" min={0} step="0.01"
                placeholder="Ej: 1500000"
                error={errors.costo_adquisicion?.message}
                {...register('costo_adquisicion', {
                  required: requiereSoporte ? t('registraractivoform.el_costo_es_obligatorio_para_compra_donacion') : false,
                  validate: (val) =>
                    !requiereSoporte || Number(val) > 0 || 'El costo debe ser mayor a 0.',
                })}
              />
              <Input
                label={t('registraractivoform.soporte_documental')} required
                placeholder={t('registraractivoform.ej_factura_n_o_00123')}
                error={errors.soporte_documental?.message}
                {...register('soporte_documental', {
                  required: requiereSoporte ? t('registraractivoform.el_soporte_documental_es_obligatorio') : false,
                })}
              />
            </>
          )}
        </div>
        {esNacimiento && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s2) 0 0' }}>{t('registraractivoform.en_nacimiento_no_se_registra_costo_ni')}</p>
        )}

        <div style={{ marginTop: 'var(--s4)' }}>
          <label style={FIELD_LABEL} htmlFor="detalles_procedencia">{t('registraractivoform.detalles_de_procedencia')}</label>
          <textarea
            id="detalles_procedencia" style={TEXTAREA}
            placeholder="Origen, proveedor, notas… (opcional)"
            {...register('detalles_procedencia')}
          />
        </div>
      </div>

      {/* Detalle según tipo */}
      {esIndividual ? (
        <div style={{ marginBottom: 'var(--s6)' }}>
          <span style={SECTION_TITLE}>{t('registraractivoform.detalle_individual')}</span>
          <div style={GRID}>
            <Input
              label={t('registraractivoform.identificador')} required
              placeholder={t('registraractivoform.ej_bov_2024_001')}
              error={errors.identificador?.message}
              {...register('identificador', { required: t('registraractivoform.el_identificador_es_obligatorio_para') })}
            />
            <Input
              label={t('registraractivoform.raza')} required
              placeholder={t('registraractivoform.ej_holstein')}
              error={errors.raza?.message}
              {...register('raza', { required: t('registraractivoform.la_raza_es_obligatoria') })}
            />
            <div>
              <label style={FIELD_LABEL} htmlFor="sexo">{t('registraractivoform.sexo')}<span aria-hidden="true">*</span></label>
              <select id="sexo" style={SELECT} {...register('sexo', { required: 'El sexo es obligatorio.' })}>
                <option value="">{t('registraractivoform.seleccionar')}</option>
                <option value="Macho">{t('registraractivoform.macho')}</option>
                <option value="Hembra">{t('registraractivoform.hembra')}</option>
              </select>
              <FieldError msg={errors.sexo?.message} />
            </div>
            {/* RFC-014 (FE-07): opcional; con fecha, el backend avisa si la edad alcanza la esperanza de vida. */}
            <Input
              label={t('registraractivoform.fecha_de_nacimiento')} type="date" max={hoyLocal()}
              hint={t('registraractivoform.fecha_nacimiento_hint')}
              error={errors.fecha_nacimiento?.message}
              {...register('fecha_nacimiento', {
                validate: (val) => !val || val <= hoyLocal() || 'No puede ser una fecha futura.',
              })}
            />
            <Input
              label="Peso inicial (kg)" type="number" min={0} step="0.01"
              placeholder={t('registraractivoform.opcional')}
              {...register('peso_inicial')}
            />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--s6)' }}>
          <span style={SECTION_TITLE}>{t('registraractivoform.detalle_poblacional')}</span>
          <div style={GRID}>
            <Input
              label={t('registraractivoform.cantidad_inicial')} required type="number" min={1}
              placeholder="Ej: 1800"
              error={errors.cantidad_inicial?.message}
              {...register('cantidad_inicial', {
                required: t('registraractivoform.la_cantidad_inicial_es_obligatoria_para'),
                min: { value: 1, message: t('registraractivoform.debe_ser_mayor_a_0') },
              })}
            />
            <Input
              label="Peso promedio inicial (kg)" type="number" min={0} step="0.001"
              placeholder={t('registraractivoform.opcional')}
              {...register('peso_promedio_inicial')}
            />
          </div>
        </div>
      )}

      {estadoParametros === 'cargando' && (
        <p role="status" style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 var(--s6)' }}>
          {t('registraractivoform.cargando_atributos')}
        </p>
      )}

      {estadoParametros === 'error' && (
        <div style={{ marginBottom: 'var(--s6)' }}>
          <Alert
            variant="error"
            title={t('registraractivoform.atributos_no_cargados_titulo')}
            description={t('registraractivoform.atributos_no_cargados_detalle')}
            style={{ marginBottom: 'var(--s3)' }}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => setIntentoParametros((n) => n + 1)}>
            {t('registraractivoform.reintentar')}
          </Button>
        </div>
      )}

      {parametros.length > 0 && (
        <div style={{ marginBottom: 'var(--s6)' }}>
          <span style={SECTION_TITLE}>{t('registraractivoform.atributos_de_la_especie')}</span>
          <div style={GRID}>
            {parametros.map((p, i) => {
              const msg = errors.atrib?.[i]?.message;
              if (p.tipo_dato === 'BOOLEANO') {
                return (
                  <div key={p.nombre}>
                    <label style={{ ...FIELD_LABEL, display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                      <input
                        type="checkbox"
                        aria-invalid={!!msg}
                        style={{ accentColor: 'var(--brand-500)' }}
                        {...register(`atrib.${i}`)}
                      />
                      {etiquetaAtributo(p)}
                    </label>
                    <FieldError msg={msg} />
                  </div>
                );
              }
              const numerico = p.tipo_dato === 'NUMERICO' || p.tipo_dato === 'ENTERO';
              return (
                <Input
                  key={p.nombre}
                  id={`atrib-${i}`}
                  label={etiquetaAtributo(p)}
                  required={p.es_obligatorio}
                  type={numerico ? 'number' : 'text'}
                  step={p.tipo_dato === 'ENTERO' ? 1 : 'any'}
                  min={p.valor_min ?? undefined}
                  max={p.valor_max ?? undefined}
                  placeholder={p.es_obligatorio ? undefined : t('registraractivoform.opcional')}
                  hint={rango(p)}
                  error={msg}
                  {...register(`atrib.${i}`, {
                    validate: (v) => {
                      const e = errorAtributo(p, v);
                      return e ? t(e.clave, e.params) : true;
                    },
                  })}
                />
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
        <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={saving}>{t('registraractivoform.cancelar')}</Button>
        <Button type="submit" variant="primary" size="md" loading={saving} disabled={especieSinDensidad || estadoParametros !== 'listo' || cargando || errorCatalogo}>{t('registraractivoform.registrar_activo')}</Button>
      </div>
    </form>
  );
}
