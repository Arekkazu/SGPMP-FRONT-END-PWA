// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | #393 RF-36: estado de la densidad del lote en el listado y en sus datos |
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import type { ApiError } from '../../shared/api/errors';
import { useT } from '../../shared/i18n/useT';
import { consultasApi } from '../api/consultasApi';
import type { EstadoDensidad, EstadoDensidadLote } from '../types';

const ESTILO: Record<EstadoDensidad, { color: string; icono: React.ReactNode }> = {
  OK: { color: 'var(--sem-success)', icono: <CheckCircle2 size={14} aria-hidden /> },
  AVISO: { color: 'var(--sem-warning)', icono: <AlertTriangle size={14} aria-hidden /> },
  EXCEDE: { color: 'var(--sem-error)', icono: <AlertOctagon size={14} aria-hidden /> },
  SIN_CONFIGURAR: { color: 'var(--text-muted)', icono: <HelpCircle size={14} aria-hidden /> },
};

/** El estado con texto e ícono, nunca solo con color (#393). */
export function EstadoDensidadTexto({ estado }: { estado: EstadoDensidad }) {
  const { t } = useT('biologicalAssets');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', color: ESTILO[estado].color, fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>
      {ESTILO[estado].icono}{t(`densidadlote.estado_${estado}`)}
    </span>
  );
}

/** Barra de la densidad real frente al máximo, con capacidad, cupo y de dónde sale el máximo (#393). */
export function DensidadLoteCard({ idActivo }: { idActivo: number }) {
  const { t } = useT('biologicalAssets');
  const [estado, setEstado] = useState<EstadoDensidadLote | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let vigente = true;
    consultasApi.estadoDensidadLote(idActivo).then((e) => { if (vigente) setEstado(e); }, (e) => { if (vigente) setError(e as ApiError); });
    return () => { vigente = false; };
  }, [idActivo]);

  if (error) return <p role="alert" style={{ color: 'var(--sem-error)', fontSize: '13px' }}>{error.message}</p>;
  if (!estado) return null;
  const pct = estado.porcentaje_del_maximo !== null ? Number(estado.porcentaje_del_maximo) : null;
  const fuente = estado.fuente === 'ETAPA'
    ? t('densidadlote.fuente_etapa', { etapa: estado.nombre_etapa })
    : estado.fuente === 'ESPECIE' ? t('densidadlote.fuente_especie') : null;

  return (
    <section aria-labelledby="densidad-lote-titulo" style={{ marginTop: 'var(--s4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s2)' }}>
        <h3 id="densidad-lote-titulo" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>{t('densidadlote.titulo')}</h3>
        <EstadoDensidadTexto estado={estado.estado} />
      </div>
      {pct !== null ? (
        <>
          <div role="progressbar" aria-labelledby="densidad-lote-titulo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(pct, 100)}
            aria-valuetext={t('densidadlote.porcentaje', { pct })}
            style={{ position: 'relative', height: 10, borderRadius: 'var(--r-full)', background: 'var(--surface-hover)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: ESTILO[estado.estado].color }} />
            <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: `${estado.aviso_preventivo_pct}%`, width: 2, background: 'var(--text-secondary)' }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 'var(--s2) 0 0' }}>
            {t('densidadlote.resumen', { pct, maxima: Number(estado.densidad_maxima), aviso: estado.aviso_preventivo_pct })}
          </p>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--s2)', margin: 'var(--s3) 0 0', fontSize: '13px' }}>
            <div><dt style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t('densidadlote.superficie')}</dt><dd style={{ margin: 0 }}>{t('densidadlote.m2', { valor: Number(estado.superficie) })}</dd></div>
            <div><dt style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t('densidadlote.capacidad')}</dt><dd style={{ margin: 0 }}>{t('densidadlote.animales', { count: estado.capacidad_maxima ?? 0 })}</dd></div>
            <div><dt style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t('densidadlote.cupo')}</dt><dd style={{ margin: 0 }}>{t('densidadlote.animales', { count: estado.cupo_disponible ?? 0 })}</dd></div>
            {estado.biomasa_maxima && estado.biomasa_por_m2 && (
              <div><dt style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{t('densidadlote.biomasa')}</dt><dd style={{ margin: 0 }}>{t('densidadlote.biomasa_valor', { actual: Number(estado.biomasa_por_m2), maxima: Number(estado.biomasa_maxima) })}</dd></div>
            )}
          </dl>
          {fuente && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s2) 0 0' }}>{fuente}</p>}
        </>
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t('densidadlote.sin_maximo')}</p>
      )}
      <Link to="/configuracion" style={{ display: 'inline-block', marginTop: 'var(--s2)', fontSize: '12px', color: 'var(--brand-600)', fontWeight: 600 }}>
        {t('densidadlote.ir_configuracion')}
      </Link>
    </section>
  );
}
