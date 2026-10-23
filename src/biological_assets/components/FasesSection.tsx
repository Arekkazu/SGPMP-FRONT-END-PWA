// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #73 RF-37: fase destino del ciclo, distinta a la actual            |
import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { FECHA_NUMERICA, formatearFecha } from '../../shared/i18n/formato';
import { useForm } from 'react-hook-form';
import { GitBranch, CheckCircle2, CircleDot } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useFases } from '../hooks/useFases';
import { hoyLocal, instanteParaEvento } from '../../shared/lib/fecha';
import { ModalShell } from './ModalShell';
import { RECURSO_ACTIVOS, ACCION_E } from '../rbac';
import { ESTADOS_TERMINALES } from '../types';
import type { CambiarFaseDTO, CicloProductivoAsignable, EstadoActivoNombre, GestionFaseResponse } from '../types';

interface Props {
  idActivo: number;
  estadoActual: string | null;
  onChanged: () => void;
}

function estadoEsTerminal(estado: string | null): boolean {
  const up = (estado ?? '').toUpperCase().replace(/\s+/g, '_');
  return ESTADOS_TERMINALES.includes(up as EstadoActivoNombre);
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

const TEXTAREA: React.CSSProperties = {
  width: '100%',
  minHeight: 64,
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  resize: 'vertical',
  outline: 'none',
};

function FaseItem({ fase, ultimo }: { fase: GestionFaseResponse; ultimo: boolean }) {
  const { t } = useT('biologicalAssets');
  const activa = fase.es_activa;
  return (
    <li style={{ display: 'flex', gap: 'var(--s3)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ color: activa ? 'var(--brand-500)' : 'var(--sem-success)', marginTop: 2 }}>
          {activa ? <CircleDot size={18} aria-hidden /> : <CheckCircle2 size={18} aria-hidden />}
        </span>
        {!ultimo && <span style={{ flex: 1, width: 2, background: 'var(--surface-border)', marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: 'var(--s5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
            {fase.nombre_ciclo}
          </span>
          {activa && (
            <span style={{ fontSize: 'var(--fs-label-sm)', fontWeight: 700, color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)' }}>{t('fasessection.activa')}</span>
          )}
        </div>
        {fase.nombre_fase_actual && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>
            Fase: {fase.nombre_fase_actual}
            {fase.paso_actual != null && fase.total_pasos != null && ` (${fase.paso_actual}/${fase.total_pasos})`}
          </div>
        )}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {formatearFecha(fase.fecha_inicio, FECHA_NUMERICA)}
          {fase.fecha_finalizacion ? ` → ${formatearFecha(fase.fecha_finalizacion, FECHA_NUMERICA)}` : ' → en curso'}
        </div>
        {fase.motivo_cambio && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 'var(--s1)' }}>
            {fase.motivo_cambio}
          </div>
        )}
      </div>
    </li>
  );
}

interface FormValues {
  id_ciclo_productiva: string;
  fase_destino: string;
  confirmar_no_estandar: boolean;
  motivo_cambio: string;
  fecha_inicio: string;
}

/**
 * #73 (RF-37): la fase "estándar" a la que se pasa, con la misma regla de
 * `cambiar_fase_use_case`: la siguiente a la última fase registrada del ciclo,
 * o la primera si el activo nunca estuvo en él. null si el ciclo ya se completó
 * (o la última fase no se reconoce): entonces cualquier destino es no estándar.
 */
export function faseEstandar(ciclo: CicloProductivoAsignable, historial: GestionFaseResponse[]): number | null {
  const enCiclo = historial
    .filter((g) => g.id_ciclo_productiva === ciclo.id_ciclo_productivo)
    .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime());
  if (enCiclo.length === 0) return ciclo.fases[0]?.id_ciclos_productivo_biologico ?? null;
  const ultima = enCiclo[enCiclo.length - 1];
  const idx = ciclo.fases.findIndex((f) => f.id_ciclos_productivo_biologico === ultima.id_ciclos_productivo_biologico);
  if (idx < 0) return null;
  return ciclo.fases[idx + 1]?.id_ciclos_productivo_biologico ?? null;
}

function CambiarFaseModal({
  ciclos,
  ciclosLoading,
  historial,
  saving, saveError, onClose, onConfirmar,
}: {
  ciclos: CicloProductivoAsignable[];
  ciclosLoading: boolean;
  historial: GestionFaseResponse[];
  saving: boolean;
  saveError: ReturnType<typeof useFases>['saveError'];
  onClose: () => void;
  onConfirmar: (dto: CambiarFaseDTO) => Promise<boolean>;
}) {
  const { t } = useT('biologicalAssets');
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { id_ciclo_productiva: '', fase_destino: '', confirmar_no_estandar: false, motivo_cambio: '', fecha_inicio: '' },
  });

  // #73 (RF-37): las fases destino salen del ciclo elegido, que ya viene filtrado
  // por la especie del activo (`GET /{id}/ciclos-productivos`).
  const idCiclo = Number(watch('id_ciclo_productiva')) || null;
  const ciclo = ciclos.find((c) => c.id_ciclo_productivo === idCiclo) ?? null;
  const activa = historial.find((g) => g.es_activa) ?? null;
  const idFaseActual = ciclo && activa?.id_ciclo_productiva === ciclo.id_ciclo_productivo
    ? activa.id_ciclos_productivo_biologico ?? null
    : null;
  const idEstandar = ciclo ? faseEstandar(ciclo, historial) : null;
  const idDestino = Number(watch('fase_destino')) || null;
  const esNoEstandar = idDestino !== null && idDestino !== idEstandar;
  // RF-37: un salto o un retroceso exige confirmación explícita (si es la actual, ya avisa ese error).
  const pideConfirmacion = esNoEstandar && idDestino !== idFaseActual;

  // Al elegir el ciclo se propone la siguiente fase de la secuencia (la transición estándar).
  useEffect(() => {
    setValue('fase_destino', idEstandar !== null ? String(idEstandar) : '');
    setValue('confirmar_no_estandar', false);
  }, [idCiclo, idEstandar, setValue]);

  const etiquetaFase = (f: CicloProductivoAsignable['fases'][number], i: number) => {
    const sufijo = f.id_ciclos_productivo_biologico === idFaseActual
      ? ` (${t('fasessection.sufijo_actual')})`
      : f.id_ciclos_productivo_biologico === idEstandar ? ` (${t('fasessection.sufijo_siguiente')})` : '';
    return `${i + 1}. ${f.nombre_fase}${sufijo}`;
  };

  const submit = async (v: FormValues) => {
    const ok = await onConfirmar({
      id_ciclo_productiva: Number(v.id_ciclo_productiva),
      fase_destino_id: Number(v.fase_destino),
      confirmacion_no_estandar: esNoEstandar,
      motivo_cambio: v.motivo_cambio.trim() || null,
      fecha_inicio: v.fecha_inicio ? instanteParaEvento(v.fecha_inicio) : null,
    });
    if (ok) onClose();
  };

  return (
    <ModalShell title={t('fasessection.cambiar_avanzar_fase')} onClose={onClose}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('fasessection.no_se_pudo_cambiar_la_fase')}
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          <Select
            id="ciclo-productivo"
            label={t('fasessection.ciclo_productivo')}
            required
            disabled={ciclosLoading || ciclos.length === 0}
            error={errors.id_ciclo_productiva?.message}
            hint={!ciclosLoading && ciclos.length === 0 ? t('fasessection.sin_ciclos') : t('fasessection.ayuda_ciclo')}
            {...register('id_ciclo_productiva', {
              required: t('fasessection.el_ciclo_productivo_es_obligatorio'),
            })}
          >
            <option value="">
              {ciclosLoading ? t('fasessection.cargando_ciclos') : t('fasessection.seleccionar_ciclo')}
            </option>
            {ciclos.map((ciclo) => (
              <option key={ciclo.id_ciclo_productivo} value={ciclo.id_ciclo_productivo}>
                {ciclo.nombre} · {ciclo.fases.map((f) => f.nombre_fase).join(' → ')}
              </option>
            ))}
          </Select>
          <Select
            id="fase-destino"
            label={t('fasessection.fase_destino')}
            required
            disabled={!ciclo}
            error={errors.fase_destino?.message}
            hint={!ciclo
              ? t('fasessection.elige_ciclo_primero')
              : idEstandar === null ? t('fasessection.ciclo_completado') : undefined}
            {...register('fase_destino', {
              required: t('fasessection.fase_destino_obligatoria'),
              // RF-37: "La fase destino debe ser distinta a la actual" (backend: FASE_DESTINO_IGUAL_ACTUAL).
              validate: (v) => idFaseActual === null || Number(v) !== idFaseActual || t('fasessection.fase_destino_igual_actual'),
            })}
          >
            <option value="">{t('fasessection.seleccionar_fase')}</option>
            {ciclo?.fases.map((f, i) => (
              <option key={f.id_ciclos_productivo_biologico} value={f.id_ciclos_productivo_biologico}>
                {etiquetaFase(f, i)}
              </option>
            ))}
          </Select>
          {pideConfirmacion && (
            <div>
              <Alert
                variant="warning"
                title={t('fasessection.transicion_no_estandar_titulo')}
                description={t('fasessection.transicion_no_estandar_detalle')}
                style={{ marginBottom: 'var(--s2)' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: 'var(--fs-label-md)', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  aria-invalid={!!errors.confirmar_no_estandar}
                  style={{ accentColor: 'var(--brand-500)' }}
                  {...register('confirmar_no_estandar', {
                    validate: (v) => !pideConfirmacion || v || t('fasessection.confirmacion_obligatoria'),
                  })}
                />
                {t('fasessection.confirmar_no_estandar')}
              </label>
              {errors.confirmar_no_estandar?.message && (
                <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
                  {errors.confirmar_no_estandar.message}
                </p>
              )}
            </div>
          )}
          <Input label={t('fasessection.fecha_de_inicio')} type="date" max={hoyLocal()} {...register('fecha_inicio')} />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }} htmlFor="motivo-fase">{t('fasessection.motivo_del_cambio')}</label>
            <textarea id="motivo-fase" style={TEXTAREA} placeholder={t('fasessection.opcional')} {...register('motivo_cambio')} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('fasessection.cancelar')}</Button>
          <Button type="submit" variant="primary" size="md" loading={saving}>{t('fasessection.cambiar_fase')}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function FasesSection({ idActivo, estadoActual, onChanged }: Props) {
  const { t } = useT('biologicalAssets');
  const online = useOnlineStatus();
  const puedeCambiar = usePermission(RECURSO_ACTIVOS, ACCION_E);
  const terminal = estadoEsTerminal(estadoActual);
  const { fases, loading, saving, error, saveError, cargar, cambiarFase, setSaveError, ciclos, ciclosLoading, cargarCiclos } = useFases(idActivo);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (abierto) cargarCiclos(); }, [abierto, cargarCiclos]);

  const handleConfirmar = async (dto: CambiarFaseDTO): Promise<boolean> => {
    const ok = await cambiarFase(dto);
    if (ok) { await cargar(); onChanged(); }
    return ok;
  };

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <GitBranch size={16} aria-hidden />{t('fasessection.secuencia_de_fases')}</h2>
        {puedeCambiar && !terminal && (
          <Button variant="primary" size="sm" disabled={!online} onClick={() => { setSaveError(null); setAbierto(true); }}>{t('fasessection.cambiar_fase')}</Button>
        )}
      </div>

      {terminal && (
        <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-muted)', margin: '0 0 var(--s4)' }}>
          El activo está en estado «{estadoActual}». No se pueden cambiar fases en estados terminales (CERRADO, BAJA).
        </p>
      )}

      {error && <Alert variant="error" title={t('fasessection.error_al_cargar_fases')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

      {loading ? (
        <div style={{ height: 120, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : fases.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>{t('fasessection.este_activo_no_tiene_fases_registradas')}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {fases.map((f, i) => (
            <FaseItem key={f.id_gestion_fases ?? i} fase={f} ultimo={i === fases.length - 1} />
          ))}
        </ul>
      )}

      {abierto && (
        <CambiarFaseModal
          ciclos={ciclos}
          ciclosLoading={ciclosLoading}
          historial={fases}
          saving={saving}
          saveError={saveError}
          onClose={() => setAbierto(false)}
          onConfirmar={handleConfirmar}
        />
      )}
    </div>
  );
}
