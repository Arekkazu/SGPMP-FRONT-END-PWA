// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | USAB-M04 prototipo 13.9 RF-66/RF-68/RF-69: Monitor y Contagio en una ficha por lote, con evaluación clínica |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-18/N-05 RF-66: enfermedad y lote por nombre; poblacional sin umbral no se clasifica |
import React, { useEffect, useMemo, useState } from 'react';
import { HeartPulse, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearNumero, formatearHora } from '../../shared/i18n/formato';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { ModalShell } from '../components/ModalShell';
import { ProbBar } from '../components/ProbBar';
import { LineChartPrediccion } from '../components/LineChartPrediccion';
import { InferenciaDetalleModal } from '../components/InferenciaDetalleModal';
import { RetroalimentacionFormModal } from '../components/RetroalimentacionFormModal';
import { PermissionDenied } from '../components/PermissionDenied';
import { useInferencias, useRiesgoContagio } from '../hooks/useMonitor';
import { usePatologias } from '../hooks/usePatologias';
import { useRetroalimentacion } from '../hooks/useRetroalimentacion';
import { aLotes } from '../lib/contagio';
import { diagnosticosPara } from '../lib/diagnosticos';
import { aporteFactores, lotesSanitarios, type LoteSanitario } from '../lib/estadoSanitario';
import { PARADIGMA_POR_TIPO } from '../types';
import { RECURSO_HISTORIAL, RECURSO_RETRO, ACCION_R, ACCION_C } from '../rbac';

/** Nivel de RF-66 (0–3) → colores semánticos; sin predicción, neutro. */
const TONO: Record<string, { color: string; fondo: string; borde: string }> = {
  3: { color: 'var(--sem-error)', fondo: 'var(--sem-error-bg)', borde: 'var(--sem-error-border)' },
  2: { color: 'var(--sem-warning)', fondo: 'var(--sem-warning-bg)', borde: 'var(--sem-warning-border)' },
  1: { color: 'var(--sem-info)', fondo: 'var(--sem-info-bg)', borde: 'var(--sem-info-border)' },
  0: { color: 'var(--sem-success)', fondo: 'var(--sem-success-bg)', borde: 'var(--sem-success-border)' },
  sin: { color: 'var(--text-muted)', fondo: 'var(--surface-bg)', borde: 'var(--surface-border)' },
};
const CONTAGIO_COLOR = { ALTO: 'var(--sem-error)', MEDIO: 'var(--sem-warning)', BAJO: 'var(--sem-success)' };
const FACTORES = [
  { clave: 'fs', color: 'var(--sem-error)' },
  { clave: 'fa', color: 'var(--sem-warning)' },
  { clave: 'fd', color: 'var(--sem-info)' },
] as const;
type Filtro = '3' | '2' | '1' | '0' | 'sin';
const filtroDe = (l: LoteSanitario): Filtro => (l.actual?.nivel == null ? 'sin' : (String(l.actual.nivel) as Filtro));
const pct = (v: number) => formatearNumero(v, { style: 'percent', maximumFractionDigits: 0 });

/** Niveles de las últimas 24 h; la línea se pinta con el color del último. */
function MiniSerie({ serie }: { serie: LoteSanitario['serie'] }) {
  if (serie.length < 2) return null;
  const W = 96, H = 28, x = (k: number) => 2 + (k * (W - 4)) / (serie.length - 1), y = (n: number) => H - 3 - (n / 3) * (H - 6);
  const ultimo = serie[serie.length - 1];
  const color = TONO[ultimo.nivel].color;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden style={{ flexShrink: 0 }}>
      <polyline points={serie.map((s, k) => `${x(k)},${y(s.nivel)}`).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={x(serie.length - 1)} cy={y(ultimo.nivel)} r={3} fill={color} />
    </svg>
  );
}

function Tendencia({ lote }: { lote: LoteSanitario }) {
  const { t } = useT('prediction');
  if (!lote.tendencia) return null;
  const [Icono, color] = lote.tendencia === 'sube' ? [TrendingUp, 'var(--sem-error)']
    : lote.tendencia === 'baja' ? [TrendingDown, 'var(--sem-success)'] : [Minus, 'var(--text-muted)'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', fontSize: '12px', fontWeight: 600, color }}>
      <Icono size={14} aria-hidden />{t(`estadosanitario.tendencia_${lote.tendencia}`)}
    </span>
  );
}

function Ficha({ lote, puedeEvaluar, online, onEvaluar, onPorQue }: {
  lote: LoteSanitario; puedeEvaluar: boolean; online: boolean; onEvaluar: () => void; onPorQue: () => void;
}) {
  const { t } = useT('prediction');
  const a = lote.actual;
  const tono = TONO[a?.nivel ?? 'sin'];
  const poblacional = a ? PARADIGMA_POR_TIPO[a.tipoModelo] === 'POBLACIONAL' : false;
  const c = lote.contagio;
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', minWidth: 0 }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{lote.unidad}</h2>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lote.area} · {lote.especie}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s3)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-md)', background: tono.fondo, border: `1px solid ${tono.borde}` }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('estadosanitario.estado_sanitario')}</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: tono.color }}>
            {a?.nivel != null ? t(`monitor.nivel_${a.nivel}`) : t('estadosanitario.sin_prediccion_corto')}
          </div>
        </div>
        {a && !poblacional && a.confianza != null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{pct(a.confianza)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('estadosanitario.confianza')}</div>
          </div>
        )}
      </div>

      {a ? (
        <>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            {poblacional
              // N-05: sin umbral configurado no hay "umbral 0" ni clasificación.
              ? a.umbralScore
                ? t('estadosanitario.score', { score: formatearNumero(a.score ?? 0, { maximumFractionDigits: 2 }), umbral: formatearNumero(a.umbralScore, { maximumFractionDigits: 2 }) })
                : t('estadosanitario.score_sin_umbral')
              : a.enfermedad && a.nivel !== 0
                ? <>{t('estadosanitario.probable')} <strong>{a.enfermedad}</strong></>
                : <strong>{t('estadosanitario.sin_enfermedad')}</strong>}
          </div>
          {lote.tendencia && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap' }}>
              <MiniSerie serie={lote.serie} /><Tendencia lote={lote} />
            </div>
          )}
        </>
      ) : (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{t('estadosanitario.sin_prediccion')}</p>
      )}

      {c?.nivel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span>{t('estadosanitario.contagio')}</span>
          <span aria-hidden style={{ flex: 1, height: 6, borderRadius: 'var(--r-full)', background: 'var(--surface-hover)', overflow: 'hidden', minWidth: 40 }}>
            <span style={{ display: 'block', height: '100%', width: `${Math.round(c.probabilidad * 100)}%`, background: CONTAGIO_COLOR[c.nivel] }} />
          </span>
          <strong style={{ color: 'var(--text-primary)' }}>{t(`contagio.nivel_${c.nivel}`)}</strong>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s2)', flexWrap: 'wrap', marginTop: 'auto', paddingTop: 'var(--s2)', borderTop: '1px solid var(--surface-border)' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a ? t('estadosanitario.ultima', { hora: a.hora }) : c?.fecha}</span>
        <span style={{ display: 'flex', gap: 'var(--s2)', marginLeft: 'auto' }}>
          {puedeEvaluar && a && (
            <Button variant="secondary" size="sm" disabled={!online} onClick={onEvaluar}>{t('estadosanitario.evaluar')}</Button>
          )}
          <Button variant="ghost" size="sm" onClick={onPorQue}>{t('estadosanitario.ver_por_que')}</Button>
        </span>
      </div>
    </article>
  );
}

function PorQueModal({ lote, onDetalle, onClose }: { lote: LoteSanitario; onDetalle: () => void; onClose: () => void }) {
  const { t } = useT('prediction');
  const a = lote.actual, c = lote.contagio;
  const aporte = c ? aporteFactores(c) : null;
  const H3: React.CSSProperties = { fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' };
  return (
    <ModalShell title={lote.unidad} onClose={onClose} maxWidth={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
          {lote.area} · {lote.especie}{a && ` · ${a.nivel != null ? t(`monitor.nivel_${a.nivel}`) : ''}`}
        </p>

        {lote.serie.length > 1 && (
          <section>
            <h3 style={H3}>{t('estadosanitario.ultimas_24h')}</h3>
            <LineChartPrediccion
              data={lote.serie.map((s) => ({ hora: formatearHora(s.fecha), nivel: s.nivel }))}
              xKey="hora"
              series={[{ dataKey: 'nivel', name: t('monitor.nivel'), color: TONO[lote.serie[lote.serie.length - 1].nivel].color }]}
              yDomain={[0, 3]}
              soloEnteros
              referencias={[{ y: 2, label: t('monitor.nivel_2'), color: 'var(--sem-warning)' }]}
              height={180}
              titulo={t('estadosanitario.ultimas_24h')}
            />
          </section>
        )}

        {a?.distPatologias && (
          <section>
            <h3 style={H3}>{t('estadosanitario.enfermedades')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
              {a.distPatologias.slice(0, 3).map((p) => <ProbBar key={p.nombre} label={p.nombre} valor={p.prob} />)}
            </div>
          </section>
        )}

        <section>
          <h3 style={H3}>{t('estadosanitario.por_que')}</h3>
          {c && aporte ? (
            <>
              {/* M4-10: los pesos en palabras, no la fórmula. */}
              <div role="img" aria-label={FACTORES.map((f) => `${t(`estadosanitario.factor_${f.clave}`)} ${pct(aporte[f.clave])}`).join(', ')}
                style={{ display: 'flex', height: 22, borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                {FACTORES.map((f) => (
                  <span key={f.clave} style={{ width: `${aporte[f.clave] * 100}%`, background: f.color, color: 'var(--text-inverse)', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {aporte[f.clave] > 0.12 ? pct(aporte[f.clave]) : ''}
                  </span>
                ))}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--s3) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--s2)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                {FACTORES.map((f) => (
                  <li key={f.clave} style={{ display: 'flex', gap: 'var(--s2)' }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: f.color, marginTop: 4, flexShrink: 0 }} />
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>{t(`estadosanitario.factor_${f.clave}`)}</strong>{' '}
                      ({t('estadosanitario.pesa', { peso: pct(c.pesos[f.clave]) })}): {t(`estadosanitario.factor_${f.clave}_desc`)}
                    </span>
                  </li>
                ))}
              </ul>
              {c.pesosRecalculados && <p style={{ margin: 'var(--s2) 0 0', fontSize: '12px', color: 'var(--sem-warning)' }}>{t('contagio.pesos_recalculados', c.pesos)}</p>}
            </>
          ) : <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{t('estadosanitario.sin_contagio')}</p>}
        </section>

        {a && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('estadosanitario.modelo', { version: a.version, hora: a.hora })}</span>
            <Button variant="ghost" size="sm" onClick={onDetalle}>{t('estadosanitario.detalle_tecnico')}</Button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

const KPIS: { filtro: Filtro; sub: string }[] = [
  { filtro: '3', sub: 'kpi_sub_3' }, { filtro: '2', sub: 'kpi_sub_2' }, { filtro: '1', sub: 'kpi_sub_1' },
  { filtro: '0', sub: 'kpi_sub_0' }, { filtro: 'sin', sub: 'kpi_sub_sin' },
];

export function EstadoSanitarioView() {
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_HISTORIAL, ACCION_R);
  const puedeEvaluar = usePermission(RECURSO_RETRO, ACCION_C);
  const online = useOnlineStatus();
  const { inferencias, loading, error, cargar } = useInferencias();
  // Sin permiso sobre el motor, contagio responde 403: la ficha sale sin esa barra.
  const { calculos } = useRiesgoContagio();
  const patologiasHook = usePatologias();
  const retro = useRetroalimentacion();

  const [filtro, setFiltro] = useState<Filtro | null>(null);
  const [porQue, setPorQue] = useState<LoteSanitario | null>(null);
  const [detalle, setDetalle] = useState<LoteSanitario | null>(null);
  const [evaluar, setEvaluar] = useState<LoteSanitario | null>(null);
  const [evaluado, setEvaluado] = useState(false);

  useEffect(() => { if (puedeEvaluar) patologiasHook.cargar({ solo_activas: true }); }, [puedeEvaluar]); // eslint-disable-line react-hooks/exhaustive-deps

  const lotes = useMemo(() => lotesSanitarios(inferencias, aLotes(calculos)), [inferencias, calculos]);
  const visibles = filtro ? lotes.filter((l) => filtroDe(l) === filtro) : lotes;
  const cuenta = (f: Filtro) => lotes.filter((l) => filtroDe(l) === f).length;
  // M4-03 / N-03: solo enfermedades de la especie del animal evaluado.
  const opciones = useMemo(
    () => diagnosticosPara(patologiasHook.patologias, { nombre: evaluar?.especie }).map((p) => ({ id: p.id_patologia, nombre: p.nombre_patologia })),
    [patologiasHook.patologias, evaluar],
  );

  if (!puedeVer) return <PermissionDenied seccion={t('estadosanitario.titulo')} />;

  const enviar = async (dto: Parameters<typeof retro.registrar>[0]) => {
    if (await retro.registrar(dto)) { setEvaluar(null); setEvaluado(true); }
  };

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--page-pad)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <HeartPulse size={20} aria-hidden />{t('estadosanitario.titulo')}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('estadosanitario.descripcion')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {error && (
          <div style={{ marginBottom: 'var(--s4)' }}>
            <Alert variant={error.status === 403 ? 'warning' : 'error'} title={t('monitor.error_titulo')} description={error.message} />
            <Button variant="secondary" size="sm" onClick={cargar} style={{ marginTop: 'var(--s2)' }}>{t('monitor.reintentar')}</Button>
          </div>
        )}
        {evaluado && <Alert variant="success" title={t('retroalimentacionview.evaluacion_registrada')} description={t('retroalimentacionview.la_retroalimentacion_clinica_quedo')} style={{ marginBottom: 'var(--s4)' }} />}

        <div role="group" aria-label={t('estadosanitario.resumen_filtra')} style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
          {KPIS.map(({ filtro: f, sub }) => (
            <OptionCard key={f} selected={filtro === f} onClick={() => setFiltro((x) => (x === f ? null : f))} style={{ flex: '1 1 150px', minWidth: 150, width: 'auto', padding: 'var(--s4)' }}>
              <span style={{ display: 'block', fontSize: '24px', fontWeight: 800, color: TONO[f].color, fontVariantNumeric: 'tabular-nums' }}>{formatearNumero(cuenta(f))}</span>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{f === 'sin' ? t('estadosanitario.sin_prediccion_corto') : t(`monitor.nivel_${f}`)}</span>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{t(`estadosanitario.${sub}`)}</span>
            </OptionCard>
          ))}
        </div>

        {loading ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('monitor.cargando')}</p>
          : !error && lotes.length === 0 ? <p role="status" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('estadosanitario.vacio')}</p>
          : filtro && visibles.length === 0 ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('estadosanitario.ninguno_filtro')}</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 'var(--s4)' }}>
              {visibles.map((l) => (
                <Ficha key={l.idActivo} lote={l} puedeEvaluar={puedeEvaluar} online={online}
                  onEvaluar={() => { retro.limpiarSaveError(); setEvaluado(false); setEvaluar(l); }} onPorQue={() => setPorQue(l)} />
              ))}
            </div>
          )}
      </div>

      {porQue && <PorQueModal lote={porQue} onClose={() => setPorQue(null)} onDetalle={() => { setDetalle(porQue); setPorQue(null); }} />}
      {detalle?.actual && <InferenciaDetalleModal inf={detalle.actual} onClose={() => setDetalle(null)} />}
      {evaluar?.actual && (
        <RetroalimentacionFormModal
          contexto={{
            id_resultado_inferencia: evaluar.actual.uuid,
            id_activo_biologico: evaluar.idActivo,
            nombre_activo: evaluar.unidad,
            fecha_inferencia: evaluar.actual.fecha,
            resumen: `${evaluar.unidad} · ${evaluar.actual.enfermedad ?? (evaluar.actual.nivel != null ? t(`monitor.nivel_${evaluar.actual.nivel}`) : '—')}`,
          }}
          patologiasOpciones={opciones}
          saving={retro.saving}
          saveError={retro.saveError}
          online={online}
          onSubmit={enviar}
          onClose={() => setEvaluar(null)}
        />
      )}
    </div>
  );
}
