// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-03 RF-72: el formulario recibe la fecha de la inferencia |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 M4-03/N-03 RF-72: diagnósticos de la especie del activo y activo con nombre |
// | 2026-11-03 | Arekkazu | RF-72: bandeja real del backend en vez de datos de ejemplo |
import React, { useEffect, useMemo, useState } from 'react';
import { formatearFecha, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { MessageSquareText, ClipboardCheck, Clock, TimerOff } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { usePatologias } from '../hooks/usePatologias';
import { useRetroalimentacion } from '../hooks/useRetroalimentacion';
import { useBandejaRetroalimentacion, POR_PAGINA_BANDEJA } from '../hooks/useBandejaRetroalimentacion';
import { RetroalimentacionFormModal } from '../components/RetroalimentacionFormModal';
import { Paginacion } from '../components/Paginacion';
import { diagnosticosPara } from '../lib/diagnosticos';
import { Pill, type Tono } from '../components/Pill';
import { PermissionDenied } from '../components/PermissionDenied';
import { TH, TD, TABLE_WRAP, THEAD_ROW, INPUT, LABEL, FILTER_GRID } from '../components/tableStyles';
import { RECURSO_RETRO, ACCION_R, ACCION_C } from '../rbac';
import type { EstadoEvaluacion, FiltrosBandejaRetro, InferenciaPorEvaluar } from '../types';

/** Nivel de riesgo de RF-66: 0 Normal, 1 Bajo, 2 Moderado, 3 Alto. */
const NIVELES: { nivel: number; clave: string; tono: Tono }[] = [
  { nivel: 3, clave: 'alto', tono: 'error' },
  { nivel: 2, clave: 'moderado', tono: 'warning' },
  { nivel: 1, clave: 'bajo', tono: 'success' },
  { nivel: 0, clave: 'normal', tono: 'neutral' },
];
const ESTADO_EVAL: Record<EstadoEvaluacion, { tono: Tono; clave: string }> = {
  PENDIENTE: { tono: 'info', clave: 'pendiente' },
  EVALUADO: { tono: 'success', clave: 'evaluado' },
  VENTANA_VENCIDA: { tono: 'neutral', clave: 'ventana_vencida' },
};

function Kpi({ icon, valor, etiqueta, color }: { icon: React.ReactNode; valor: number | null; etiqueta: string; color: string }) {
  return (
    <div style={{ flex: '1 1 130px', minWidth: 130, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color }}>
        {icon}<span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{valor ?? '—'}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{etiqueta}</div>
    </div>
  );
}

function fmt(dt: string): string {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : formatearFecha(d);
}

export function RetroalimentacionView() {
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_RETRO, ACCION_R);
  const puedeRegistrar = usePermission(RECURSO_RETRO, ACCION_C);
  const online = useOnlineStatus();

  const patologiasHook = usePatologias();
  const retro = useRetroalimentacion();
  const bandeja = useBandejaRetroalimentacion();

  const [fEstado, setFEstado] = useState('');
  const [fRiesgo, setFRiesgo] = useState('');
  const [sel, setSel] = useState<InferenciaPorEvaluar | null>(null);
  const [okFlash, setOkFlash] = useState(false);

  const filtros = (estado = fEstado, riesgo = fRiesgo): FiltrosBandejaRetro => ({
    estado_evaluacion: (estado || undefined) as EstadoEvaluacion | undefined,
    nivel_riesgo: riesgo === '' ? undefined : Number(riesgo),
  });

  useEffect(() => {
    if (!puedeVer) return;
    patologiasHook.cargar({ solo_activas: true });
    void bandeja.cargar(filtros(), 1);
  }, [puedeVer]); // eslint-disable-line react-hooks/exhaustive-deps

  // M4-03 / N-03: solo las patologías válidas de la especie del activo evaluado.
  const patologiasOpciones = useMemo(
    () => diagnosticosPara(patologiasHook.patologias, { nombre: sel?.especie ?? undefined })
      .map((p) => ({ id: p.id_patologia, nombre: p.nombre_patologia })),
    [patologiasHook.patologias, sel]
  );

  const cambiarFiltro = (estado: string, riesgo: string) => {
    setFEstado(estado);
    setFRiesgo(riesgo);
    void bandeja.cargar(filtros(estado, riesgo), 1);
  };

  const enviarRetro = async (dto: Parameters<typeof retro.registrar>[0]) => {
    const ok = await retro.registrar(dto);
    if (ok) {
      setSel(null);
      setOkFlash(true);
      setTimeout(() => setOkFlash(false), 4000);
      void bandeja.recargar();
    }
  };

  /** Por qué no se puede evaluar esta fila (null si se puede). */
  const motivoNoEvaluable = (r: InferenciaPorEvaluar): string | null => {
    if (!puedeRegistrar) return t('retroalimentacionview.motivo_sin_permiso');
    if (!online) return t('retroalimentacionview.el_registro_de_evaluaciones_esta');
    if (r.evaluada_por_mi) return t('retroalimentacionview.motivo_ya_evaluaste');
    if (r.activo_en_baja) return t('retroalimentacionview.motivo_baja');
    if (!r.puede_evaluar) return t('retroalimentacionview.motivo_vencida');
    return null;
  };

  if (!puedeVer) return <PermissionDenied seccion="Retroalimentación clínica" />;

  const datos = bandeja.datos;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / POR_PAGINA_BANDEJA)) : 1;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <MessageSquareText size={20} aria-hidden />{t('retroalimentacionview.retroalimentacion_clinica')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('retroalimentacionview.evaluacion_de_las_predicciones_del_motor')}</p>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>
          {t('retroalimentacionview.que_aparece', { dias: datos?.ventana_dias ?? '—' })}
        </p>

        {okFlash && <Alert variant="success" title={t('retroalimentacionview.evaluacion_registrada')} description={t('retroalimentacionview.la_retroalimentacion_clinica_quedo')} style={{ marginBottom: 'var(--s4)' }} />}
        {!online && <Alert variant="warning" title={t('retroalimentacionview.sin_conexion')} description={t('retroalimentacionview.el_registro_de_evaluaciones_esta')} style={{ marginBottom: 'var(--s4)' }} />}
        {!puedeRegistrar && <Alert variant="info" title={t('retroalimentacionview.solo_supervision')} description={t('retroalimentacionview.tu_rol_puede_consultar_las_evaluaciones')} style={{ marginBottom: 'var(--s4)' }} />}
        {bandeja.error && <Alert variant={bandeja.error.status === 403 ? 'warning' : 'error'} title={t('retroalimentacionview.no_se_pudo_cargar')} description={bandeja.error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <Kpi icon={<Clock size={18} aria-hidden />} valor={datos?.indicadores.pendientes ?? null} etiqueta={t('retroalimentacionview.kpi_pendientes')} color="var(--sem-info)" />
          <Kpi icon={<ClipboardCheck size={18} aria-hidden />} valor={datos?.indicadores.evaluadas ?? null} etiqueta={t('retroalimentacionview.kpi_evaluadas')} color="var(--sem-success)" />
          <Kpi icon={<TimerOff size={18} aria-hidden />} valor={datos?.indicadores.vencidas ?? null} etiqueta={t('retroalimentacionview.kpi_vencidas')} color="var(--text-muted)" />
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
          <div style={FILTER_GRID}>
            <div>
              <label style={LABEL} htmlFor="retro-estado">{t('retroalimentacionview.estado_de_evaluacion')}</label>
              <select id="retro-estado" style={INPUT} value={fEstado} onChange={(e) => cambiarFiltro(e.target.value, fRiesgo)}>
                <option value="">{t('retroalimentacionview.todos')}</option>
                <option value="PENDIENTE">{t('retroalimentacionview.pendiente')}</option>
                <option value="EVALUADO">{t('retroalimentacionview.evaluado')}</option>
                <option value="VENTANA_VENCIDA">{t('retroalimentacionview.ventana_vencida')}</option>
              </select>
            </div>
            <div>
              <label style={LABEL} htmlFor="retro-riesgo">{t('retroalimentacionview.riesgo_inferido')}</label>
              <select id="retro-riesgo" style={INPUT} value={fRiesgo} onChange={(e) => cambiarFiltro(fEstado, e.target.value)}>
                <option value="">{t('retroalimentacionview.todos')}</option>
                {NIVELES.map((n) => <option key={n.nivel} value={n.nivel}>{t(`retroalimentacionview.${n.clave}`)}</option>)}
              </select>
            </div>
          </div>
        </div>

        {bandeja.loading && !datos ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('retroalimentacionview.cargando')}</p>
        ) : datos && datos.items.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('retroalimentacionview.vacio')}</p>
        ) : datos && (
          <>
            <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('retroalimentacionview.tabla_aria')} aria-busy={bandeja.loading}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={THEAD_ROW}>
                    <th style={TH}>{t('retroalimentacionview.activo')}</th>
                    <th style={TH}>{t('retroalimentacionview.especie_finca')}</th>
                    <th style={TH}>{t('retroalimentacionview.riesgo')}</th>
                    <th style={TH}>{t('retroalimentacionview.patologia_estimada')}</th>
                    <th style={{ ...TH, textAlign: 'right' }}>{t('retroalimentacionview.confianza')}</th>
                    <th style={TH}>{t('retroalimentacionview.fecha')}</th>
                    <th style={TH}>{t('retroalimentacionview.estado')}</th>
                    <th style={{ ...TH, textAlign: 'right' }}>{t('retroalimentacionview.acciones')}</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.items.map((r) => {
                    const nivel = NIVELES.find((n) => n.nivel === r.nivel_riesgo) ?? NIVELES[3];
                    const motivo = motivoNoEvaluable(r);
                    const nombre = r.identificador_activo ?? `#${r.id_activo_biologico}`;
                    return (
                      <tr key={r.id_resultado_inferencia}>
                        <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {nombre}
                          {r.modo_sombra && <span style={{ display: 'block', fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>{t('retroalimentacionview.de_prueba')}</span>}
                        </td>
                        <td style={TD}>{[r.especie, r.nombre_finca].filter(Boolean).join(' · ') || '—'}</td>
                        <td style={TD}><Pill tono={nivel.tono}>{t(`retroalimentacionview.${nivel.clave}`)}</Pill></td>
                        <td style={TD}>{r.nombre_patologia ?? t('retroalimentacionview.sin_patologia')}</td>
                        <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatearNumero(Number(r.confianza_global) * 100, { maximumFractionDigits: 0 })} %</td>
                        <td style={TD}>{fmt(r.fecha_inferencia)}</td>
                        <td style={TD}>
                          <Pill tono={ESTADO_EVAL[r.estado_evaluacion].tono}>{t(`retroalimentacionview.${ESTADO_EVAL[r.estado_evaluacion].clave}`)}</Pill>
                          {r.estado_evaluacion === 'PENDIENTE' && (
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{t('retroalimentacionview.vence', { fecha: fmt(r.fecha_limite) })}</span>
                          )}
                          {r.numero_evaluaciones > 0 && (
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{t('retroalimentacionview.evaluaciones', { count: r.numero_evaluaciones })}</span>
                          )}
                        </td>
                        <td style={{ ...TD, textAlign: 'right' }}>
                          <Button
                            variant="secondary" size="sm"
                            disabled={motivo != null}
                            title={motivo ?? undefined}
                            aria-label={motivo ? `${t('retroalimentacionview.evaluar')} ${nombre}: ${motivo}` : `${t('retroalimentacionview.evaluar')} ${nombre}`}
                            onClick={() => { retro.limpiarSaveError(); setSel(r); }}
                          >{t('retroalimentacionview.evaluar')}</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <Paginacion pagina={datos.pagina} totalPaginas={totalPaginas} totalRegistros={datos.total}
                onCambiar={(p) => void bandeja.cargar(filtros(), p)} />
            )}
          </>
        )}
      </div>

      {sel && (
        <RetroalimentacionFormModal
          contexto={{
            id_resultado_inferencia: sel.id_resultado_inferencia,
            id_activo_biologico: sel.id_activo_biologico,
            nombre_activo: sel.identificador_activo ?? undefined,
            fecha_inferencia: sel.fecha_inferencia,
            resumen: `${sel.identificador_activo ?? `#${sel.id_activo_biologico}`} · ${sel.nombre_patologia ?? t('retroalimentacionview.sin_patologia')} (${formatearNumero(Number(sel.confianza_global) * 100, { maximumFractionDigits: 0 })} %)`,
          }}
          patologiasOpciones={patologiasOpciones}
          saving={retro.saving}
          saveError={retro.saveError}
          online={online}
          onSubmit={enviarRetro}
          onClose={() => setSel(null)}
        />
      )}
    </div>
  );
}
