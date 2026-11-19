// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-106: línea de tiempo de predicciones, eventos y retroalimentaciones con TVCO |
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Download, History } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Combobox } from '../../shared/design-system/Combobox';
import { Input } from '../../shared/design-system/Input';
import { pushToast } from '../../shared/hooks/useToast';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import type { ApiError } from '../../shared/api/errors';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { reportesApi, type OpcionFiltro } from '../../reportes/api/reportesApi';
import {
  historialPredictivoApi, type HistorialPredictivo, type MarcadorHistorial,
} from '../api/historialPredictivoApi';

const NIVELES = [0, 1, 2, 3];
const Y_EVENTO = 3.6;
const Y_RETRO = 3.3;
const TARJETA: React.CSSProperties = {
  background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg, 12px)',
  padding: 'var(--s4)', marginBottom: 'var(--s4)',
};

function hoyIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function haceUnAnio(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * RF-106: el Veterinario ve en un mismo eje de tiempo las predicciones guardadas del modelo, los eventos sanitarios
 * reales y las retroalimentaciones, con la tasa de validación clínica (TVCO), los conflictos (triángulo) y las
 * predicciones pendientes de evaluar. Las horas se muestran en la zona del usuario. Solo lectura: la evaluación se
 * registra en el formulario de retroalimentación y el reporte se exporta con un clic.
 */
export function HistorialPredictivoView() {
  const { t } = useT('prediction');
  const online = useOnlineStatus();
  const history = useHistory();
  const [activos, setActivos] = useState<OpcionFiltro[]>([]);
  const [texto, setTexto] = useState('');
  const [idActivo, setIdActivo] = useState<number | null>(null);
  const [desde, setDesde] = useState(haceUnAnio());
  const [hasta, setHasta] = useState(hoyIso());
  const [niveles, setNiveles] = useState<number[]>(NIVELES);
  const [conEventos, setConEventos] = useState(true);
  const [conRetro, setConRetro] = useState(true);
  const [modo, setModo] = useState<'LINEAL' | 'AGRUPADO'>('LINEAL');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<HistorialPredictivo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    reportesApi.opciones('activo').then(setActivos).catch(() => setActivos([]));
  }, []);

  useEffect(() => {
    if (idActivo === null) return;
    let vivo = true;
    setCargando(true);
    setError(null);
    historialPredictivoApi.consultar(idActivo, {
      fecha_inicio: desde, fecha_fin: hasta, nivel_riesgo: niveles.length < NIVELES.length ? niveles : undefined,
      modo_visualizacion: modo, incluir_eventos_sanitarios: conEventos, incluir_retroalimentacion: conRetro,
      pagina_pendientes: pagina,
    }).then((d) => { if (vivo) setDatos(d); })
      .catch((e) => { if (vivo) { setError(e as ApiError); setDatos(null); } })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [idActivo, desde, hasta, niveles, conEventos, conRetro, modo, pagina]);

  const puntos = useMemo(() => {
    if (!datos) return { linea: [], eventos: [], retros: [] };
    const tiempo = (m: MarcadorHistorial) => new Date(m.fecha).getTime();
    return {
      linea: datos.predicciones.map((p) => ({ x: tiempo(p), nivel: p.nivel_riesgo ?? 0, ...p })),
      eventos: datos.eventos_sanitarios.map((e) => ({ x: tiempo(e), y: Y_EVENTO, ...e })),
      retros: datos.retroalimentaciones.map((r) => ({ x: tiempo(r), y: Y_RETRO, ...r })),
    };
  }, [datos]);

  const exportar = async () => {
    if (idActivo === null) return;
    setExportando(true);
    try {
      const r = await reportesApi.generar('REPORTE_HISTORICO_SANITARIO', 'PDF',
        { fecha_inicio: desde, fecha_fin: hasta, activo_biologico_id: idActivo });
      if (r.estado === 'GENERADO') {
        for (const parte of r.partes) {
          // eslint-disable-next-line no-await-in-loop
          await reportesApi.descargar(r.id_reporte, parte.numero_parte, parte.nombre_archivo);
        }
        pushToast('success', t('historialpredictivo.exportado'));
      } else {
        pushToast('info', t('historialpredictivo.exportando_fondo'));
      }
    } catch (e) {
      const err = e as ApiError;
      pushToast('error', t('historialpredictivo.no_exporto'), err.message, { accion: err.accion });
    } finally {
      setExportando(false);
    }
  };

  const etiquetaNivel = (n: number) => t(`historialpredictivo.nivel.${n}`);
  const marcadorTooltip = ({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) => {
    if (!active || !payload?.length) return null;
    const m = payload[0].payload as MarcadorHistorial;
    return (
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', padding: 'var(--s2)', maxWidth: 280 }}>
        <strong>{formatearFechaHora(m.fecha)}</strong>
        {m.tipo === 'PREDICCION' && <div>{t('historialpredictivo.tt_prediccion', { nivel: etiquetaNivel(m.nivel_riesgo ?? 0), condicion: m.condicion })}</div>}
        {m.tipo === 'EVENTO_SANITARIO' && <div>{m.descripcion} · {m.veterinario}</div>}
        {m.tipo === 'RETROALIMENTACION' && (
          <div>
            {m.en_conflicto ? '⚠ ' : ''}{m.veterinario} → {t(`historialpredictivo.valoracion.${m.valoracion}`)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 'var(--s5)' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', margin: '0 0 var(--s2)' }}>
        <History size={20} aria-hidden /> {t('historialpredictivo.titulo')}
      </h2>
      <p style={{ margin: '0 0 var(--s4)', color: 'var(--text-secondary)' }}>{t('historialpredictivo.descripcion')}</p>

      <div style={{ ...TARJETA, display: 'grid', gap: 'var(--s3)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Combobox
          id="hp-activo" label={t('historialpredictivo.activo')} required
          opciones={activos.map((a) => ({ valor: a.etiqueta }))}
          value={texto}
          onChange={(v) => {
            setTexto(v);
            const elegido = activos.find((a) => a.etiqueta === v);
            setIdActivo(elegido ? elegido.valor : null);
            setPagina(1);
          }}
          placeholder={t('historialpredictivo.activo_placeholder')}
        />
        <Input id="hp-desde" type="date" label={t('historialpredictivo.desde')} value={desde} max={hasta}
               onChange={(e) => e.target.value && setDesde(e.target.value)} />
        <Input id="hp-hasta" type="date" label={t('historialpredictivo.hasta')} value={hasta} min={desde} max={hoyIso()}
               onChange={(e) => e.target.value && setHasta(e.target.value)} />
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600 }}>{t('historialpredictivo.niveles')}</legend>
          {NIVELES.map((n) => (
            <label key={n} style={{ display: 'inline-flex', gap: 'var(--s1)', marginRight: 'var(--s3)', minHeight: 32, alignItems: 'center' }}>
              <input type="checkbox" checked={niveles.includes(n)}
                     onChange={(e) => setNiveles((x) => (e.target.checked ? [...x, n].sort() : x.filter((y) => y !== n)))} />
              {etiquetaNivel(n)}
            </label>
          ))}
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600 }}>{t('historialpredictivo.mostrar')}</legend>
          <label style={{ display: 'flex', gap: 'var(--s1)', alignItems: 'center' }}>
            <input type="checkbox" checked={conEventos} onChange={(e) => setConEventos(e.target.checked)} /> {t('historialpredictivo.eventos')}
          </label>
          <label style={{ display: 'flex', gap: 'var(--s1)', alignItems: 'center' }}>
            <input type="checkbox" checked={conRetro} onChange={(e) => setConRetro(e.target.checked)} /> {t('historialpredictivo.retros')}
          </label>
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600 }}>{t('historialpredictivo.modo')}</legend>
          {(['LINEAL', 'AGRUPADO'] as const).map((m) => (
            <label key={m} style={{ display: 'inline-flex', gap: 'var(--s1)', marginRight: 'var(--s3)', alignItems: 'center' }}>
              <input type="radio" name="hp-modo" checked={modo === m} onChange={() => setModo(m)} /> {t(`historialpredictivo.modo_${m}`)}
            </label>
          ))}
        </fieldset>
      </div>

      {idActivo === null && <p>{t('historialpredictivo.elige_activo')}</p>}
      {error && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={t('historialpredictivo.no_cargo')} description={error.message} />}
      {cargando && <p role="status">{t('historialpredictivo.cargando')}</p>}

      {datos && (
        <>
          {datos.fuentes_no_disponibles.length > 0 && (
            <Alert variant="warning" title={t('historialpredictivo.fuentes_parciales')} description={datos.fuentes_no_disponibles.join(', ')} />
          )}
          <div style={{ display: 'grid', gap: 'var(--s4)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 'var(--s4)' }}>
            <div style={TARJETA}>
              <div style={{ color: 'var(--text-secondary)' }}>{t('historialpredictivo.tvco')}</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{datos.tvco.texto}</div>
              <small>{t('historialpredictivo.tvco_ayuda')}</small>
            </div>
            <div style={TARJETA}>
              <div>{t('historialpredictivo.total_inferencias', { count: datos.metadatos.total_inferencias })}</div>
              <div>{t('historialpredictivo.total_eventos', { count: datos.metadatos.total_eventos_sanitarios })}</div>
              <div>{t('historialpredictivo.total_retros', { count: datos.metadatos.total_retroalimentaciones })}</div>
              <div>{t('historialpredictivo.total_pendientes', { count: datos.metadatos.total_pendientes })}</div>
              <div>{t('historialpredictivo.total_conflictos', { count: datos.metadatos.total_conflictos })}</div>
            </div>
            <div style={{ ...TARJETA, display: 'flex', alignItems: 'center' }}>
              <Button onClick={() => void exportar()} loading={exportando} disabled={!online || exportando}>
                <Download size={16} aria-hidden /> {t('historialpredictivo.exportar')}
              </Button>
            </div>
          </div>

          {datos.mensaje && <Alert variant="info" title={datos.mensaje} />}

          <div style={TARJETA}>
            <h3 style={{ margin: '0 0 var(--s2)' }}>{t('historialpredictivo.linea_tiempo')}</h3>
            <p style={{ margin: '0 0 var(--s2)', fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)' }}>
              {t('historialpredictivo.leyenda', { horas: datos.ventana_correspondencia_horas })}
            </p>
            <div style={{ width: '100%', height: 320 }} role="img" aria-label={t('historialpredictivo.grafico_aria')}>
              <ResponsiveContainer>
                <ComposedChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" scale="time" domain={['dataMin', 'dataMax']}
                         tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis domain={[0, 4]} ticks={NIVELES} tickFormatter={(v) => etiquetaNivel(Number(v))} width={70} />
                  <Tooltip content={marcadorTooltip} />
                  <Line data={puntos.linea} dataKey="nivel" type="stepAfter" stroke="var(--brand-600, #2f5d3a)" dot isAnimationActive={false} />
                  <Scatter data={puntos.eventos} dataKey="y" fill="var(--danger-600, #dc2626)" shape="square" isAnimationActive={false} />
                  <Scatter data={puntos.retros} dataKey="y" fill="var(--info-600, #2563eb)"
                           shape={(p: { cx?: number; cy?: number; payload?: MarcadorHistorial }) => (
                             <text x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="central" fontSize={14}>
                               {p.payload?.en_conflicto ? '⚠' : ({ CORRECTO: '✓', INCORRECTO: '✗', PARCIAL: '◐', SIN_EVENTO: '○' } as Record<string, string>)[p.payload?.valoracion ?? ''] ?? '•'}
                             </text>
                           )} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {modo === 'AGRUPADO' && datos.grupos.length > 0 && (
              <details style={{ marginTop: 'var(--s3)' }}>
                <summary>{t('historialpredictivo.grupos', { count: datos.grupos.length })}</summary>
                <ul>
                  {datos.grupos.map((g, i) => (
                    <li key={i}>
                      {t('historialpredictivo.n_eventos', { count: g.length })} · {formatearFechaHora(g[0].fecha)}
                      <ul>{g.map((m, j) => <li key={j}>{t(`historialpredictivo.tipo.${m.tipo}`)} · {formatearFechaHora(m.fecha)}</li>)}</ul>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {datos.correspondencias.length > 0 && (
              <details style={{ marginTop: 'var(--s3)' }}>
                <summary>{t('historialpredictivo.correspondencias', { count: datos.correspondencias.length })}</summary>
                <ul>{datos.correspondencias.map((c, i) => <li key={i}>{c.diferencia}</li>)}</ul>
              </details>
            )}
          </div>

          <div style={TARJETA}>
            <h3 style={{ margin: '0 0 var(--s2)' }}>{t('historialpredictivo.pendientes_titulo')}</h3>
            {datos.pendientes.items.length === 0 ? (
              <p>{t('historialpredictivo.sin_pendientes')}</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--s2)' }}>
                {datos.pendientes.items.map((p) => (
                  <li key={p.id_resultado_inferencia} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s3)', alignItems: 'center',
                    justifyContent: 'space-between', borderBottom: '1px solid var(--surface-border)', paddingBottom: 'var(--s2)' }}>
                    <span>{formatearFechaHora(p.fecha_inferencia)} · {etiquetaNivel(p.nivel_riesgo)} · {p.condicion}</span>
                    <Button size="sm" variant="secondary" onClick={() => history.push(
                      `/prediccion/retroalimentacion?resultado=${p.id_resultado_inferencia}&activo=${idActivo}`)}>
                      {t('historialpredictivo.registrar_retro')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {datos.pendientes.total > datos.pendientes.por_pagina && (
              <div style={{ display: 'flex', gap: 'var(--s2)', marginTop: 'var(--s3)' }}>
                <Button size="sm" variant="ghost" disabled={pagina <= 1} onClick={() => setPagina((x) => x - 1)}>{t('historialpredictivo.anterior')}</Button>
                <Button size="sm" variant="ghost" disabled={pagina * datos.pendientes.por_pagina >= datos.pendientes.total}
                        onClick={() => setPagina((x) => x + 1)}>{t('historialpredictivo.siguiente')}</Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
