// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-12 RF-71: vista oficial sin modo demo: avance por modelo, solicitudes, versiones creadas y calibración por animal |
// | 2026-11-02 | Arekkazu | AJF-14 RF-71 FE-1..4: procesos reales con fases y solicitud por animal |
// | 2026-11-03 | Arekkazu | AJF-14 RF-71: la lista de animales sin barra final y con aviso si no carga |
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ClipboardList, Boxes, Gauge as GaugeIcon, CheckCircle2, Loader2, Cpu, Play } from 'lucide-react';
import { Combobox } from '../../shared/design-system/Combobox';
import { etiquetaDeCatalogo, idDeCatalogo, resolverCatalogo } from '../../shared/lib/catalogo';
import { ProcesosReentrenamiento } from '../components/ProcesosReentrenamiento';
import { useActivosPrediccion } from '../hooks/useActivosPrediccion';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { PermissionDenied } from '../components/PermissionDenied';
import { EstadoModeloPill } from '../components/EstadoModeloPill';
import { Pill } from '../components/Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import { RECURSO_MODELOS, RECURSO_AUDITORIA, RECURSO_HISTORIAL, ACCION_E, ACCION_R } from '../rbac';
import { etiquetaTipoModelo, type EstadoReentrenamiento } from '../types';
import { useReentrenamiento } from '../hooks/useReentrenamiento';

const CARD: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' };
const H2: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' };
const AYUDA: React.CSSProperties = { margin: '0 0 var(--s4)', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '75ch' };

/** Barra 0 → mínimo para solicitar → mínimo para reentrenar, con las dos marcas visibles. */
function AvanceRetro({ e }: { e: EstadoReentrenamiento }) {
  const { t } = useT('prediction');
  const tope = Math.max(e.minimo_reentrenamiento, 1);
  const ancho = Math.min(100, (e.registros_nuevos / tope) * 100);
  const marca = (e.minimo_solicitud / tope) * 100;
  const color = e.estado === 'LISTO' ? 'var(--sem-success)' : e.estado === 'PUEDE_SOLICITARSE' ? 'var(--sem-info)' : 'var(--sem-warning)';
  return (
    <div>
      <div aria-hidden style={{ position: 'relative', height: 10, borderRadius: 'var(--r-full)', background: 'var(--surface-hover)', margin: 'var(--s3) 0 var(--s1)' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${ancho}%`, borderRadius: 'var(--r-full)', background: color }} />
        <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${marca}%`, width: 2, background: 'var(--text-primary)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        <span>0</span>
        <span>{t('reentrenamiento.marca_solicitud', { n: formatearNumero(e.minimo_solicitud) })}</span>
        <span>{t('reentrenamiento.marca_reentrenar', { n: formatearNumero(e.minimo_reentrenamiento) })}</span>
      </div>
      <p className="ds-sr-only">{t('reentrenamiento.avance_sr', { n: formatearNumero(e.registros_nuevos), solicitud: formatearNumero(e.minimo_solicitud), minimo: formatearNumero(e.minimo_reentrenamiento) })}</p>
    </div>
  );
}

export function ReentrenamientoView() {
  const { t } = useT('prediction');
  const online = useOnlineStatus();
  const puedeEjecutar = usePermission(RECURSO_MODELOS, ACCION_E);
  const puedeVerModelos = usePermission(RECURSO_MODELOS, ACCION_R);
  const puedeVerBitacora = usePermission(RECURSO_AUDITORIA, ACCION_R);
  const puedeVerInferencias = usePermission(RECURSO_HISTORIAL, ACCION_R);
  const r = useReentrenamiento({ online, puedeVerBitacora, puedeVerInferencias });
  // FE-2: solicitar por animal, eligiéndolo por su código.
  const { activos, error: errorActivos } = useActivosPrediccion();
  const catalogo = activos.map((a) => ({ id: a.id_activo_biologico, nombre: a.identificador || `#${a.id_activo_biologico}` }));
  const [animal, setAnimal] = useState('');
  const [idAnimal, setIdAnimal] = useState<number | null>(null);
  const [animalTocado, setAnimalTocado] = useState(false);
  const abierto = idAnimal != null ? r.procesoAbiertoDe(idAnimal) : null;
  const motivoAnimal = !puedeEjecutar ? t('reentrenamiento.motivo_sin_permiso')
    : !online ? t('reentrenamiento.motivo_sin_conexion')
      : idAnimal == null ? t('procesos.motivo_elige_animal')
        : abierto ? t('procesos.motivo_abierto', { estado: t(`procesos.estado_${abierto.estado}`) })
          : null;
  const resolverAnimal = () => {
    const res = resolverCatalogo(animal, catalogo);
    if (res.estado === 'resuelto') { setAnimal(res.texto); setIdAnimal(res.id); }
    setAnimalTocado(res.estado === 'sin_resolver');
  };

  if (!puedeEjecutar && !puedeVerModelos) return <PermissionDenied seccion="Reentrenamiento" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <RefreshCw size={20} aria-hidden />{t('reentrenamientoview.reentrenamiento_de_modelos')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('reentrenamiento.descripcion')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)', display: 'flex', flexDirection: 'column', gap: 'var(--s7)' }}>
        {!online && <Alert variant="warning" title={t('reentrenamiento.sin_conexion')} description={t('reentrenamiento.sin_conexion_texto')} />}

        <section aria-labelledby="re-procesos">
          <h2 id="re-procesos" style={H2}><Cpu size={17} aria-hidden />{t('procesos.titulo')}</h2>
          <p style={AYUDA}>{t('procesos.ayuda')}</p>
          <div style={{ ...CARD, marginBottom: 'var(--s4)' }}>
            <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                <Combobox
                  id="re-animal"
                  label={t('procesos.animal')}
                  opciones={activos.map((a) => ({ valor: etiquetaDeCatalogo(a.identificador || `#${a.id_activo_biologico}`, a.id_activo_biologico), detalle: a.nombre_especie ?? undefined }))}
                  value={animal}
                  onChange={(texto) => { setAnimal(texto); const id = idDeCatalogo(texto, catalogo); setIdAnimal(id); if (id != null || !texto.trim()) setAnimalTocado(false); }}
                  onBlur={resolverAnimal}
                  onEnter={resolverAnimal}
                  error={animalTocado ? t('procesos.animal_sin_resolver') : undefined}
                  placeholder={t('procesos.animal_placeholder')}
                  vacio={errorActivos ? t('procesos.animales_no_cargaron') : undefined}
                  hint={errorActivos ? t('procesos.animales_no_cargaron') : undefined}
                />
              </div>
              <Button variant="primary" size="sm" loading={r.enviandoAnimal} disabled={!!motivoAnimal}
                aria-describedby={motivoAnimal ? 're-animal-motivo' : undefined}
                onClick={async () => { if (idAnimal != null && await r.solicitarAnimal(idAnimal)) { setAnimal(''); setIdAnimal(null); } }}>
                <Play size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('avisoreentrenamiento.solicitar')}
              </Button>
            </div>
            {motivoAnimal && <p id="re-animal-motivo" style={{ margin: 'var(--s2) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{motivoAnimal}</p>}
            {r.errorAnimal && <Alert variant={r.errorAnimal.status === 409 || r.errorAnimal.status === 422 ? 'warning' : 'error'} title={t('avisoreentrenamiento.no_se_pudo_solicitar')} description={r.errorAnimal.message} style={{ marginTop: 'var(--s3)' }} />}
          </div>
          {r.procesos.error ? (
            <Alert variant={r.procesos.error.status === 403 ? 'warning' : 'error'} title={t('procesos.error')} description={r.procesos.error.message} />
          ) : r.procesos.datos.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.procesos.loading ? t('reentrenamiento.cargando') : t('procesos.vacio')}</p>
          ) : (
            <div aria-live="polite"><ProcesosReentrenamiento procesos={r.procesos.datos} /></div>
          )}
        </section>

        <section aria-labelledby="re-estado">
          <h2 id="re-estado" style={H2}><GaugeIcon size={17} aria-hidden />{t('reentrenamiento.estado_titulo')}</h2>
          <p style={AYUDA}>{t('reentrenamiento.estado_ayuda')}</p>
          {r.estados.error && <Alert variant={r.estados.error.status === 403 ? 'warning' : 'error'} title={t('reentrenamiento.error_estado')} description={r.estados.error.message} style={{ marginBottom: 'var(--s4)' }} />}
          {r.errorSolicitud && <Alert variant={r.errorSolicitud.status === 422 ? 'warning' : 'error'} title={t('avisoreentrenamiento.no_se_pudo_solicitar')} description={r.errorSolicitud.message} style={{ marginBottom: 'var(--s4)' }} />}
          {r.estados.loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('reentrenamiento.cargando')}</p>}
          <div className="ds-fg3" style={{ gap: 'var(--s4)' }}>
            {r.estados.datos.map((e) => {
              const motivo = !puedeEjecutar ? t('reentrenamiento.motivo_sin_permiso')
                : !online ? t('reentrenamiento.motivo_sin_conexion')
                  : e.estado === 'INSUFICIENTE' ? t('reentrenamiento.motivo_minimo', { faltan: formatearNumero(e.faltan), solicitud: formatearNumero(e.minimo_solicitud) })
                    : null;
              const idMotivo = `re-motivo-${e.tipo_modelo}`;
              return (
                <article key={e.tipo_modelo} style={CARD}>
                  <header style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s2)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{etiquetaTipoModelo(e.tipo_modelo)}</span>
                    <Pill tono={e.estado === 'LISTO' ? 'success' : e.estado === 'PUEDE_SOLICITARSE' ? 'info' : 'warning'}>{t(`reentrenamiento.estado_${e.estado}`)}</Pill>
                  </header>
                  <p style={{ margin: 'var(--s2) 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {t('reentrenamiento.retro_nuevas', { n: formatearNumero(e.registros_nuevos) })}
                    {e.desde && ` ${t('reentrenamiento.desde_version', { fecha: formatearFechaHora(e.desde) })}`}
                  </p>
                  <AvanceRetro e={e} />
                  <div style={{ marginTop: 'var(--s3)' }}>
                    <Button
                      variant={e.estado === 'LISTO' ? 'primary' : 'secondary'} size="sm"
                      disabled={!!motivo} loading={r.enviando === e.tipo_modelo}
                      aria-describedby={motivo ? idMotivo : undefined}
                      onClick={() => void r.solicitar(e.tipo_modelo)}
                    >{t('avisoreentrenamiento.solicitar')}</Button>
                    {motivo && <p id={idMotivo} style={{ margin: 'var(--s2) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{motivo}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="re-solicitudes">
          <h2 id="re-solicitudes" style={H2}><ClipboardList size={17} aria-hidden />{t('reentrenamiento.solicitudes_titulo')}</h2>
          <p style={AYUDA}>{t('reentrenamiento.solicitudes_ayuda')}</p>
          {!puedeVerBitacora ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('reentrenamiento.solicitudes_sin_permiso')}</p>
          ) : r.solicitudes.error ? (
            <Alert variant="error" title={t('reentrenamiento.error_solicitudes')} description={r.solicitudes.error.message} />
          ) : r.solicitudes.datos.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.solicitudes.loading ? t('reentrenamiento.cargando') : t('reentrenamiento.sin_solicitudes')}</p>
          ) : (
            <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('reentrenamiento.solicitudes_titulo')}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={THEAD_ROW}>{[t('reentrenamiento.col_fecha'), t('reentrenamiento.col_tipo_modelo'), t('reentrenamiento.col_retro'), t('reentrenamiento.col_solicitante')].map((h) => <th key={h} scope="col" style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {r.solicitudes.datos.map((s) => (
                    <tr key={s.id_evento}>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatearFechaHora(s.fecha_evento)}</td>
                      <td style={TD}>{etiquetaTipoModelo(String(s.payload_evento?.tipo_modelo ?? s.id_referencia ?? ''))}</td>
                      <td style={{ ...TD, fontVariantNumeric: 'tabular-nums' }}>{s.payload_evento?.registros_nuevos != null ? formatearNumero(Number(s.payload_evento.registros_nuevos)) : '—'}</td>
                      <td style={TD}>{s.nombre_usuario ?? (s.id_usuario != null ? `#${s.id_usuario}` : '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="re-versiones">
          <h2 id="re-versiones" style={H2}><Boxes size={17} aria-hidden />{t('reentrenamiento.versiones_titulo')}</h2>
          <p style={AYUDA}>{t('reentrenamiento.versiones_ayuda')}</p>
          {r.versiones.error ? (
            <Alert variant={r.versiones.error.status === 403 ? 'warning' : 'error'} title={t('reentrenamiento.error_versiones')} description={r.versiones.error.message} />
          ) : r.versionesReentrenadas.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.versiones.loading ? t('reentrenamiento.cargando') : t('reentrenamiento.sin_versiones')}</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
              {r.versionesReentrenadas.map((v) => (
                <li key={v.id_version_modelo} style={{ ...CARD, padding: 'var(--s3) var(--s4)', display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    <strong>{v.nombre_version}</strong> · {etiquetaTipoModelo(v.tipo_modelo)}
                    {v.id_activo_biologico != null && ` · ${t('modelostable.activo_biologico', { id: v.id_activo_biologico })}`}
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>{v.fecha_registro ? formatearFechaHora(v.fecha_registro) : '—'}</span>
                  </span>
                  <span style={{ display: 'inline-flex', gap: 'var(--s2)', alignItems: 'center' }}>
                    <EstadoModeloPill estado={v.estado_version} />
                    <Link to="/prediccion/modelos" style={{ fontSize: '12px', color: 'var(--brand-600)' }}>{t('reentrenamiento.ver_en_modelos')}</Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="re-calibracion">
          <h2 id="re-calibracion" style={H2}><Loader2 size={17} aria-hidden />{t('reentrenamiento.calibracion_titulo')}</h2>
          <p style={AYUDA}>{t('reentrenamiento.calibracion_ayuda')}</p>
          {!puedeVerInferencias ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('reentrenamiento.calibracion_sin_permiso')}</p>
          ) : r.ultimas.error ? (
            <Alert variant="error" title={t('reentrenamiento.error_calibracion')} description={r.ultimas.error.message} />
          ) : r.calibracion.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.ultimas.loading ? t('reentrenamiento.cargando') : t('reentrenamiento.sin_calibracion')}</p>
          ) : (
            <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('reentrenamiento.calibracion_titulo')}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={THEAD_ROW}>{[t('reentrenamiento.col_animal'), t('reentrenamiento.col_version'), t('reentrenamiento.col_calibracion'), t('reentrenamiento.col_ultima')].map((h) => <th key={h} scope="col" style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {r.calibracion.map((c) => (
                    <tr key={c.idActivo}>
                      <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>{c.animal}</td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.version ?? '—'}</td>
                      <td style={TD}>
                        {c.calibrando
                          ? <Pill tono="warning" icon={<Loader2 size={12} aria-hidden />}>{t('reentrenamiento.calibrando')}</Pill>
                          : <Pill tono="success" icon={<CheckCircle2 size={12} aria-hidden />}>{t('reentrenamiento.calibrado')}</Pill>}
                      </td>
                      <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatearFechaHora(c.ultimaInferencia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
