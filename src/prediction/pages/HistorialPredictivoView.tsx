// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-106: línea de tiempo de predicciones, eventos y retroalimentaciones con TVCO |
// | 2026-11-19 | Arekkazu | M8-01 RF-106: predicción de un modelo de prueba marcada como tal |
// | 2026-11-20 | Arekkazu | QA-M08 CU04 H-02 RF-106: la marca de cada evaluación va sobre su predicción |
// | 2026-11-21 | Arekkazu | INC-M08-387..390-G020..G024 RF-106: eje en el rango elegido, conectores, «N eventos», conflicto amarillo con sus valoraciones, zoom y límite de marcadores |
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, XAxis, YAxis,
} from 'recharts';
import { ChevronLeft, ChevronRight, Download, History, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Combobox } from '../../shared/design-system/Combobox';
import { Input } from '../../shared/design-system/Input';
import { pushToast } from '../../shared/hooks/useToast';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import type { ApiError } from '../../shared/api/errors';
import { FECHA_NUMERICA, formatearFecha, formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { reportesApi, type OpcionFiltro } from '../../reportes/api/reportesApi';
import {
  historialPredictivoApi, type HistorialPredictivo, type MarcadorHistorial,
} from '../api/historialPredictivoApi';

const NIVELES = [0, 1, 2, 3];
const Y_EVENTO = 3.6;
const Y_RETRO = 3.3;
const Y_GRUPO = 3.9;
// La marca de la evaluación va justo encima del punto de la predicción evaluada (RF-106 CA-4).
const SOBRE_PUNTO = 0.3;
/** RF-106 RNF-05: más marcadores que estos en la ventana visible y la línea de riesgo se dibuja muestreada. */
export const LIMITE_MARCADORES = 1000;
const HORA_MS = 3_600_000;
// R6a pide el triángulo amarillo y el DS no tiene un amarillo de relleno; el borde --sem-warning lo separa del
// fondo en los dos temas.
const AMARILLO = '#f5c518';
const ICONO_VALORACION: Record<string, string> = { CORRECTO: '✓', INCORRECTO: '✗', PARCIAL: '◐', SIN_EVENTO: '○' };

type Ventana = [number, number];

/** RF-106 Proceso 3: el eje X es el rango elegido, en días completos del usuario, no del primer al último dato. */
export function rangoDelEje(datos: HistorialPredictivo): Ventana {
  const { fecha_inicio, fecha_fin } = datos.rango_fechas_aplicado;
  return [new Date(`${fecha_inicio}T00:00:00`).getTime(), new Date(`${fecha_fin}T23:59:59.999`).getTime()];
}

/**
 * RNF-02: acercar, alejar y desplazar la ventana visible sin salir del rango consultado. Acercar llega hasta una
 * hora de ancho; desplazar mueve media ventana.
 */
export function moverVentana([a, b]: Ventana, [min, max]: Ventana, accion: 'acercar' | 'alejar' | 'antes' | 'despues'): Ventana {
  const ancho = b - a;
  const centro = a + ancho / 2;
  const nuevo = accion === 'acercar' ? Math.max(ancho / 2, HORA_MS) : accion === 'alejar' ? Math.min(ancho * 2, max - min) : ancho;
  let inicio = accion === 'antes' ? a - ancho / 2 : accion === 'despues' ? a + ancho / 2 : centro - nuevo / 2;
  inicio = Math.min(Math.max(inicio, min), max - nuevo);
  return [inicio, inicio + nuevo];
}

/**
 * RNF-05: solo se dibuja lo que cae en la ventana visible. Si aun así pasa de LIMITE_MARCADORES, la línea de riesgo
 * (la serie densa) se muestrea parejo para dejar sitio a eventos y evaluaciones, que se dibujan siempre; acercar la
 * ventana muestra el resto.
 */
export function marcadoresVisibles<L extends { x: number }, E extends { x: number }, R extends { x: number }>(
  series: { linea: L[]; eventos: E[]; retros: R[] }, [a, b]: Ventana,
) {
  const dentro = <P extends { x: number }>(l: P[]) => l.filter((p) => p.x >= a && p.x <= b);
  const eventos = dentro(series.eventos);
  const retros = dentro(series.retros);
  const todas = dentro(series.linea);
  const cupo = Math.max(LIMITE_MARCADORES - eventos.length - retros.length, 2);
  if (todas.length + eventos.length + retros.length <= LIMITE_MARCADORES || todas.length <= cupo) {
    return { linea: todas, eventos, retros, omitidas: 0 };
  }
  const paso = Math.ceil(todas.length / cupo);
  const linea = todas.filter((_, i) => i % paso === 0 || i === todas.length - 1);
  return { linea, eventos, retros, omitidas: todas.length - linea.length };
}

/** Series del gráfico: línea de riesgo, eventos y la marca de cada evaluación sobre su predicción. */
export function puntosDelHistorial(datos: HistorialPredictivo | null) {
  if (!datos) return { linea: [], eventos: [], retros: [] };
  const tiempo = (m: MarcadorHistorial) => new Date(m.fecha).getTime();
  return {
    linea: datos.predicciones.map((p) => ({ x: tiempo(p), nivel: p.nivel_riesgo ?? 0, ...p })),
    eventos: datos.eventos_sanitarios.map((e) => ({ x: tiempo(e), y: Y_EVENTO, ...e })),
    // Antes iban en la fecha de la evaluación, en una franja fija: el punto evaluado quedaba sin marca y varias
    // evaluaciones del mismo día se tapaban (QA M08 CU04 H-02). Sin su predicción a la vista, queda en la franja.
    retros: datos.retroalimentaciones.map((r) => {
      const p = datos.predicciones.find((x) => x.id_resultado_inferencia === r.id_resultado_inferencia);
      return { ...r, x: p ? tiempo(p) : tiempo(r), y: p ? (p.nivel_riesgo ?? 0) + SOBRE_PUNTO : Y_RETRO };
    }),
  };
}

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

  const puntos = useMemo(() => puntosDelHistorial(datos), [datos]);
  const rango = useMemo<Ventana | null>(() => (datos ? rangoDelEje(datos) : null), [datos]);
  const [ventana, setVentana] = useState<Ventana | null>(null);
  useEffect(() => setVentana(null), [rango]);  // una consulta nueva vuelve a mostrar todo su rango
  const visible = ventana ?? rango;
  const dibujo = useMemo(() => (visible ? marcadoresVisibles(puntos, visible) : null), [puntos, visible]);
  const mover = (accion: Parameters<typeof moverVentana>[2]) => {
    if (visible && rango) setVentana(moverVentana(visible, rango, accion));
  };

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
  // recharts solo trae tooltip por eje en ComposedChart: sobre un evento mostraba la predicción más cercana. Cada
  // marcador lleva su propio <title> (el navegador lo muestra al pasar el ratón).
  const diferenciaDe = (m: MarcadorHistorial) => datos?.correspondencias.find((c) => !c.colision
    && (m.tipo === 'PREDICCION' ? c.id_resultado_inferencia === m.id_resultado_inferencia : c.id_evento === m.id_evento))?.diferencia;
  const tituloPrediccion = (m: MarcadorHistorial) => [
    formatearFechaHora(m.fecha), t('historialpredictivo.tt_prediccion', { nivel: etiquetaNivel(m.nivel_riesgo ?? 0), condicion: m.condicion }),
    m.modo_sombra ? t('retroalimentacionview.de_prueba') : null, diferenciaDe(m)].filter(Boolean).join(' · ');
  const tituloEvento = (m: MarcadorHistorial) => [
    formatearFechaHora(m.fecha), m.descripcion, m.veterinario, diferenciaDe(m)].filter(Boolean).join(' · ');
  // R6a: en un conflicto, el título lista todas las valoraciones de esa predicción: «Vet → valor · fecha / …».
  const tituloRetro = (m: MarcadorHistorial) => (datos?.retroalimentaciones ?? [])
    .filter((r) => r.id_resultado_inferencia === m.id_resultado_inferencia)
    .map((r) => `${r.veterinario} → ${t(`historialpredictivo.valoracion.${r.valoracion}`)} · ${formatearFechaHora(r.fecha)}`)
    .join(' / ');
  const tituloGrupo = (g: MarcadorHistorial[]) => [t('historialpredictivo.n_eventos', { count: g.length }),
    ...g.map((m) => `${t(`historialpredictivo.tipo.${m.tipo}`)} · ${formatearFechaHora(m.fecha)}`)].join(' / ');
  const tiempo = (m: MarcadorHistorial) => new Date(m.fecha).getTime();
  const gruposPts = (datos?.grupos ?? []).map((g) => ({ x: Math.min(...g.map(tiempo)), y: Y_GRUPO, grupo: g }))
    .filter((g) => !visible || (g.x >= visible[0] && g.x <= visible[1]));
  // R5b/R5d: predicción y evento a la ventana de correspondencia o menos, unidos por un conector punteado.
  const conectores = (datos?.correspondencias ?? []).filter((c) => !c.colision).flatMap((c) => {
    const p = puntos.linea.find((x) => x.id_resultado_inferencia === c.id_resultado_inferencia);
    const e = puntos.eventos.find((x) => x.id_evento === c.id_evento);
    return p && e ? [{ clave: `${c.id_resultado_inferencia}-${c.id_evento}`, p, e }] : [];
  });
  const ticks = visible ? Array.from({ length: 6 }, (_, i) => visible[0] + ((visible[1] - visible[0]) * i) / 5) : undefined;
  const corto = visible !== null && visible[1] - visible[0] <= 2 * 24 * HORA_MS;
  const etiquetaTick = (v: number) => (corto ? formatearFechaHora(v) : formatearFecha(v, FECHA_NUMERICA));
  const enZoom = ventana !== null;

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
            <div role="group" aria-label={t('historialpredictivo.zoom_grupo')}
                 style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', marginBottom: 'var(--s2)' }}>
              <Button size="sm" variant="ghost" onClick={() => mover('antes')} disabled={!visible || !rango || visible[0] <= rango[0]}>
                <ChevronLeft size={16} aria-hidden /> {t('historialpredictivo.zoom_antes')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => mover('acercar')} disabled={!visible || visible[1] - visible[0] <= HORA_MS}>
                <ZoomIn size={16} aria-hidden /> {t('historialpredictivo.zoom_acercar')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => mover('alejar')} disabled={!enZoom}>
                <ZoomOut size={16} aria-hidden /> {t('historialpredictivo.zoom_alejar')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => mover('despues')} disabled={!visible || !rango || visible[1] >= rango[1]}>
                {t('historialpredictivo.zoom_despues')} <ChevronRight size={16} aria-hidden />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setVentana(null)} disabled={!enZoom}>
                <Maximize2 size={16} aria-hidden /> {t('historialpredictivo.zoom_todo')}
              </Button>
            </div>
            {visible && enZoom && (
              <p role="status" style={{ margin: '0 0 var(--s2)', fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)' }}>
                {t('historialpredictivo.zoom_ventana', { desde: etiquetaTick(visible[0]), hasta: etiquetaTick(visible[1]) })}
              </p>
            )}
            {dibujo && dibujo.omitidas > 0 && (
              <p role="status" style={{ margin: '0 0 var(--s2)', fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)' }}>
                {t('historialpredictivo.muestreo', { dibujadas: dibujo.linea.length, total: dibujo.linea.length + dibujo.omitidas })}
              </p>
            )}
            <div style={{ width: '100%', height: 320 }} role="img" aria-label={t('historialpredictivo.grafico_aria')}>
              <ResponsiveContainer>
                <ComposedChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" scale="time" domain={visible ?? ['dataMin', 'dataMax']} ticks={ticks}
                         allowDataOverflow tickFormatter={etiquetaTick} />
                  <YAxis domain={[0, 4]} ticks={NIVELES} tickFormatter={(v) => etiquetaNivel(Number(v))} width={70} />
                  {conectores.map(({ clave, p, e }) => (
                    <ReferenceLine key={clave} segment={[{ x: p.x, y: p.nivel }, { x: e.x, y: Y_EVENTO }]} ifOverflow="hidden"
                                   stroke="var(--text-secondary)" strokeDasharray="4 3" className="hp-conector" />
                  ))}
                  <Line data={dibujo?.linea ?? []} dataKey="nivel" type="stepAfter" stroke="var(--brand-600, #2f5d3a)" isAnimationActive={false}
                        dot={(p: { cx?: number; cy?: number; index?: number; payload?: MarcadorHistorial }) => (
                          <circle key={p.index} cx={p.cx} cy={p.cy} r={3} fill="var(--brand-600, #2f5d3a)">
                            {p.payload && <title>{tituloPrediccion(p.payload)}</title>}
                          </circle>
                        )} />
                  <Scatter data={dibujo?.eventos ?? []} dataKey="y" isAnimationActive={false}
                           shape={(p: { cx?: number; cy?: number; payload?: MarcadorHistorial }) => (
                             <rect x={(p.cx ?? 0) - 5} y={(p.cy ?? 0) - 5} width={10} height={10} fill="var(--danger-600, #dc2626)">
                               {p.payload && <title>{tituloEvento(p.payload)}</title>}
                             </rect>
                           )} />
                  <Scatter data={dibujo?.retros ?? []} dataKey="y" isAnimationActive={false}
                           shape={(p: { cx?: number; cy?: number; payload?: MarcadorHistorial }) => {
                             const conflicto = !!p.payload?.en_conflicto;
                             return (
                               <text x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="central" fontSize={conflicto ? 16 : 14}
                                     fill={conflicto ? AMARILLO : 'var(--text-primary)'} stroke={conflicto ? 'var(--sem-warning)' : undefined}
                                     strokeWidth={conflicto ? 0.8 : undefined} paintOrder="stroke" style={{ cursor: 'default' }}>
                                 {conflicto ? '⚠' : ICONO_VALORACION[p.payload?.valoracion ?? ''] ?? '•'}
                                 {p.payload && <title>{tituloRetro(p.payload)}</title>}
                               </text>
                             );
                           }} />
                  {/* R5c: marcadores a una hora o menos, bajo un solo «N eventos» en su posición. */}
                  <Scatter data={gruposPts} dataKey="y" isAnimationActive={false}
                           shape={(p: { cx?: number; cy?: number; payload?: { grupo: MarcadorHistorial[] } }) => (
                             <text x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}
                                   fill="var(--text-primary)" className="hp-grupo">
                               {t('historialpredictivo.n_eventos', { count: p.payload?.grupo.length ?? 0 })}
                               {p.payload && <title>{tituloGrupo(p.payload.grupo)}</title>}
                             </text>
                           )} />
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
                <ul>{datos.correspondencias.map((c, i) => {
                  const p = puntos.linea.find((x) => x.id_resultado_inferencia === c.id_resultado_inferencia);
                  const e = puntos.eventos.find((x) => x.id_evento === c.id_evento);
                  return (
                    <li key={i}>{t('historialpredictivo.par', {
                      prediccion: p ? formatearFechaHora(p.fecha) : '—', evento: e ? formatearFechaHora(e.fecha) : '—', diferencia: c.diferencia })}</li>
                  );
                })}</ul>
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
