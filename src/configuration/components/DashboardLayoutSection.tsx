import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Check, Plus, RotateCcw, Save, type LucideIcon } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import type { WidgetCatalogoItem, WidgetConfigDTO } from '../types';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import { iconoWidget } from '../iconos';

// ── Widget catalog ────────────────────────────────────────────────────────────
// El catalogo lo define el backend (modulo9.widgets) y llega ya filtrado por el
// rol del usuario. Tenerlo quemado aca hacia que la UI ofreciera widgets que el
// guardado rechazaba con 403. Lo unico que queda del lado del cliente es el
// icono, que es presentacion pura y no tiene por que vivir en la base.
interface WidgetDef {
  id: number;
  key: string;
  nombre: string;
  grupo: string;
  icon: LucideIcon;
  defaultSpan: 1 | 2;
}

function aWidgetDef(w: WidgetCatalogoItem): WidgetDef {
  return {
    id: w.id_widget,
    key: w.clave,
    nombre: w.nombre,
    grupo: w.grupo,
    icon: iconoWidget(w.clave),
    defaultSpan: w.span_predeterminado,
  };
}

// Tope de la grilla 4x3. La matriz local ya lo impone estructuralmente, pero el
// usuario merece el mensaje del RF en vez de un clic que no hace nada.
const MAX_WIDGETS = 12;


// ── Grid cell type ────────────────────────────────────────────────────────────
// idWidget === -1 means "covered by the span of the widget to the left"
type GridCell = { idWidget: number; key: string; span: number } | null;

interface Posicion { fila: number; col: number }

/**
 * Widget elegido: del catalogo (para colocarlo) o de la grilla (para moverlo o
 * quitarlo). TC-DIS-78: antes un clic en un widget colocado lo quitaba de
 * inmediato, asi que no habia forma de reordenar sin mouse ni sin perderlo.
 */
type Seleccion = { key: string; origen: Posicion | null } | null;

/** Copia de la grilla sin el widget de `pos` ni las celdas que cubria su span. */
function sinWidget(grid: GridCell[][], pos: Posicion): GridCell[][] {
  const copia = grid.map((row) => [...row]);
  const span = copia[pos.fila][pos.col]?.span ?? 1;
  for (let s = 0; s < span && pos.col + s < 4; s++) copia[pos.fila][pos.col + s] = null;
  return copia;
}

function initGrid(): GridCell[][] {
  return Array.from({ length: 3 }, () => Array<GridCell>(4).fill(null));
}

function contarColocados(grid: GridCell[][]): number {
  let total = 0;
  for (const fila of grid) {
    for (const cell of fila) {
      if (cell && cell.idWidget !== -1) total += 1;
    }
  }
  return total;
}

function gridFromLayout(grid: WidgetConfigDTO[], catalogo: WidgetDef[]): GridCell[][] {
  const local = initGrid();
  for (const w of grid) {
    if (!w.visible) continue;
    const f = w.posicion_fila - 1;
    const c = w.posicion_columna - 1;
    if (f < 0 || f > 2 || c < 0 || c > 3) continue;
    const cat = catalogo.find((x) => x.id === w.id_widget);
    if (!cat) continue;
    local[f][c] = { idWidget: w.id_widget, key: cat.key, span: w.span_columnas };
    for (let s = 1; s < w.span_columnas && c + s < 4; s++) {
      local[f][c + s] = { idWidget: -1, key: '', span: 0 };
    }
  }
  return local;
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel, saving }: { onConfirm: () => void; onCancel: () => void; saving: boolean }) {
  const dialogRef = useModalA11y(onCancel);
  const { t } = useT('configuration');
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-modal-title"
      className="ds-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="ds-modal__panel ds-modal__panel--sm" style={{ padding: 'var(--s6)' }}>
        <h2 id="restore-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{t('dashboardlayoutsection.restaurar_configuracion_predeterminada')}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s6)', lineHeight: 1.5 }}>{t('dashboardlayoutsection.se_cargara_el_layout_predeterminado_para_tu')}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>{t('dashboardlayoutsection.cancelar')}</Button>
          <Button variant="danger" size="md" loading={saving} onClick={onConfirm}>{t('dashboardlayoutsection.restaurar')}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DashboardLayoutSection() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeEditar = usePermission(25, 3);

  const { layout, catalogo, loading, saving, error, saveError, cargar, guardar, restaurar } =
    useDashboardLayout();
  const widgets = useMemo(() => catalogo.map(aWidgetDef), [catalogo]);
  const grupos = useMemo(
    () => Array.from(new Set(widgets.map((w) => w.grupo))),
    [widgets],
  );

  const [localGrid, setLocalGrid] = useState<GridCell[][]>(initGrid());
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  // Region aria-live: cada cambio de la grilla se anuncia, no solo se ve.
  const [anuncio, setAnuncio] = useState('');
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [saved, setSaved] = useState(false);
  const [limiteAviso, setLimiteAviso] = useState(false);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!layout) return;
    setLocalGrid(gridFromLayout(layout.grid, widgets));
    setActiveWidgets(layout.active_widget);
  }, [layout, widgets]);

  // Check if a widget key is currently in the grid
  const isInGrid = useCallback((key: string) => {
    for (let f = 0; f < 3; f++) {
      for (let c = 0; c < 4; c++) {
        const cell = localGrid[f][c];
        if (cell && cell.idWidget !== -1 && cell.key === key) return true;
      }
    }
    return false;
  }, [localGrid]);

  const nombreDe = (key: string) => widgets.find((w) => w.key === key)?.nombre ?? key;

  const handleCatalogClick = (key: string) => {
    if (isInGrid(key)) return;
    setSeleccion((prev) => (prev?.key === key && !prev.origen ? null : { key, origen: null }));
  };

  const quitarSeleccionado = () => {
    if (!seleccion?.origen) return;
    setLocalGrid(sinWidget(localGrid, seleccion.origen));
    setActiveWidgets((prev) => prev.filter((k) => k !== seleccion.key));
    setLimiteAviso(false);
    setAnuncio(t('dashboardlayoutsection.widget_quitado', { nombre: nombreDe(seleccion.key) }));
    setSeleccion(null);
  };

  const handleCellClick = (fila: number, col: number) => {
    const cell = localGrid[fila][col];
    if (cell && cell.idWidget === -1) return; // cubierta por un span

    if (cell) {
      const mismo = seleccion?.origen?.fila === fila && seleccion.origen.col === col;
      setSeleccion(mismo ? null : { key: cell.key, origen: { fila, col } });
      return;
    }

    if (!seleccion) return; // celda vacia sin nada elegido
    const def = widgets.find((w) => w.key === seleccion.key);
    if (!def) return;

    // El RF pide informar cuando se alcanza el maximo, no ignorar el clic en
    // silencio. Mover no suma widgets, asi que solo aplica al colocar.
    if (!seleccion.origen && contarColocados(localGrid) >= MAX_WIDGETS) {
      setLimiteAviso(true);
      return;
    }
    setLimiteAviso(false);

    // Al mover, el origen se libera antes de validar el destino.
    const base = seleccion.origen ? sinWidget(localGrid, seleccion.origen) : localGrid;
    const span = seleccion.origen ? localGrid[seleccion.origen.fila][seleccion.origen.col]?.span ?? def.defaultSpan : def.defaultSpan;
    const cabe = col + span <= 4 && Array.from({ length: span }, (_, s) => base[fila][col + s]).every((c) => c === null);
    if (!cabe) {
      setAnuncio(t('dashboardlayoutsection.no_cabe', { nombre: def.nombre, ancho: span }));
      return;
    }

    const newGrid = base.map((row) => [...row]);
    newGrid[fila][col] = { idWidget: def.id, key: def.key, span };
    for (let s = 1; s < span; s++) {
      newGrid[fila][col + s] = { idWidget: -1, key: '', span: 0 };
    }
    setLocalGrid(newGrid);
    setActiveWidgets((prev) => prev.includes(def.key) ? prev : [...prev, def.key]);
    setAnuncio(t(seleccion.origen ? 'dashboardlayoutsection.widget_movido' : 'dashboardlayoutsection.widget_colocado', { nombre: def.nombre, fila: fila + 1, columna: col + 1 }));
    setSeleccion(null);
  };

  const buildDTO = () => {
    const layoutConfig: WidgetConfigDTO[] = [];
    let orden = 0;
    for (let f = 0; f < 3; f++) {
      for (let c = 0; c < 4; c++) {
        const cell = localGrid[f][c];
        if (cell && cell.idWidget !== -1) {
          layoutConfig.push({
            id_widget: cell.idWidget,
            posicion_fila: f + 1,
            posicion_columna: c + 1,
            span_columnas: cell.span,
            visible: true,
            orden: orden++,
          });
        }
      }
    }
    // Devolver la version leida deja que el backend detecte que un admin
    // cambio el perfil del usuario mientras editaba.
    return {
      layout_config: layoutConfig,
      active_widget: activeWidgets,
      version_perfil: layout?.version_perfil ?? null,
    };
  };

  const handleGuardar = async () => {
    setSaved(false);
    const ok = await guardar(buildDTO());
    if (ok) setSaved(true);
  };

  const handleRestaurar = async () => {
    const ok = await restaurar();
    setConfirmRestore(false);
    if (ok) setSaved(false);
  };

  const canAct = online && puedeEditar;

  if (loading) {
    return (
      <div>
        <div style={{ height: 24, width: 200, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', marginBottom: 'var(--s4)', animation: 'pulse 1.4s infinite' }} />
        <div style={{ height: 280, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s infinite' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('dashboardlayoutsection.dashboard_personalizable')}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('dashboardlayoutsection.organiza_los_widgets_en_la_grilla_43')}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s3)', flexShrink: 0 }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={!canAct || saving}
            onClick={() => setConfirmRestore(true)}
          >
            <RotateCcw size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('dashboardlayoutsection.restaurar_predeterminado')}</Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            disabled={!canAct || saving}
            onClick={handleGuardar}
          >
            <Save size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('dashboardlayoutsection.guardar_configuracion')}</Button>
        </div>
      </div>

      {/* Alerts */}
      {!online && (
        <Alert variant="warning" title={t('dashboardlayoutsection.sin_conexion')} description={t('dashboardlayoutsection.las_acciones_de_escritura_estan')} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {error && (
        <Alert variant="error" title={t('dashboardlayoutsection.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {saveError && (
        <Alert
          variant="error"
          title={saveError.code === 'CONFLICTO_PERFIL_MODIFICADO' ? t('dashboardlayoutsection.configuracion_desactualizada') : t('dashboardlayoutsection.error_al_guardar')}
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {limiteAviso && (
        <Alert
          variant="warning"
          title={t('dashboardlayoutsection.limite_de_widgets_alcanzado')}
          description={t('dashboardlayoutsection.limite_de_widgets_detalle', { max: MAX_WIDGETS })}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {saved && (
        <Alert variant="success" title={t('dashboardlayoutsection.guardado')} description={t('dashboardlayoutsection.el_layout_del_dashboard_se_actualizo')} style={{ marginBottom: 'var(--s4)' }} />
      )}

      <p className="ds-sr-only" aria-live="polite">{anuncio}</p>

      {seleccion && (
        <div style={{ marginBottom: 'var(--s4)' }}>
          <Alert
            variant="info"
            title={t('dashboardlayoutsection.widget_seleccionado', { nombre: nombreDe(seleccion.key) })}
            description={seleccion.origen
              ? t('dashboardlayoutsection.elige_celda_para_mover')
              : t('dashboardlayoutsection.haz_clic_en_una_celda_vacia_de_la_grilla')}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', marginTop: 'var(--s2)' }}>
            {seleccion.origen && (
              <Button variant="danger" size="sm" onClick={quitarSeleccionado} disabled={!canAct}>
                {t('dashboardlayoutsection.quitar_del_dashboard')}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setSeleccion(null)}>
              {t('dashboardlayoutsection.cancelar')}
            </Button>
          </div>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="ds-split-aside" style={{ gap: 'var(--s5)', alignItems: 'start' }}>

        {/* Left: grid editor */}
        <div>
          <div id="dashboard-grilla-titulo" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s3)' }}>
            {t('dashboardlayoutsection.grilla_titulo')}
          </div>
          <div role="group" aria-labelledby="dashboard-grilla-titulo">
          {/* Row labels + grid */}
          {[0, 1, 2].map((fila) => (
            <div key={fila} style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--s2)', marginBottom: 'var(--s2)' }}>
              <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                F{fila + 1}
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s2)' }}>
                {[0, 1, 2, 3].map((col) => {
                  const cell = localGrid[fila][col];

                  // Covered by span — render nothing visible (the span widget spans over it)
                  if (cell && cell.idWidget === -1) return null;

                  const span = cell ? cell.span : 1;
                  const def = cell ? widgets.find((w) => w.id === cell.idWidget) : null;
                  const isEmpty = !cell;
                  const isTarget = isEmpty && !!seleccion;
                  const isMoving = !!cell && seleccion?.origen?.fila === fila && seleccion.origen.col === col;
                  const pos = { fila: fila + 1, columna: col + 1 };

                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleCellClick(fila, col)}
                      disabled={!canAct}
                      aria-pressed={cell ? isMoving : undefined}
                      style={{
                        gridColumn: `span ${span}`,
                        height: 80,
                        border: isEmpty
                          ? `2px dashed ${isTarget ? 'var(--brand-500)' : 'var(--surface-border)'}`
                          : `2px solid ${isMoving ? 'var(--brand-600)' : 'var(--brand-400)'}`,
                        borderRadius: 'var(--r-md)',
                        background: isEmpty
                          ? isTarget ? 'var(--brand-50)' : 'var(--surface-hover)'
                          : isMoving ? 'var(--brand-50)' : 'var(--surface-card)',
                        cursor: canAct ? 'pointer' : 'default',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--s1)',
                        padding: 'var(--s2)',
                        transition: 'border-color 0.15s, background 0.15s',
                        textAlign: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                      // TC-DIS-78: el nombre visible del widget y la posicion, no su clave interna.
                      aria-label={def
                        ? t('dashboardlayoutsection.celda_widget', { nombre: def.nombre, ...pos })
                        : isTarget && seleccion
                          ? t(seleccion.origen ? 'dashboardlayoutsection.mover_a_celda' : 'dashboardlayoutsection.colocar_en_celda', { nombre: nombreDe(seleccion.key), ...pos })
                          : t('dashboardlayoutsection.celda_vacia', pos)}
                    >
                      {cell && def ? (
                        <>
                          <def.icon size={20} strokeWidth={1.5} color="var(--brand-600)" aria-hidden />
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                            {def.nombre}
                          </span>
                          {span > 1 && (
                            <span style={{ fontSize: '10px', color: 'var(--brand-600)', fontFamily: 'var(--font-mono)' }}>
                              {t('dashboardlayoutsection.ancho_columnas', { n: span })}
                            </span>
                          )}
                        </>
                      ) : (
                        isTarget && <Plus size={20} strokeWidth={1.5} color="var(--brand-600)" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          </div>

          {/* Column labels */}
          <div style={{ display: 'flex', gap: 'var(--s2)', marginLeft: 36, marginTop: 'var(--s1)' }}>
            {[1, 2, 3, 4].map((c) => (
              <div key={c} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                C{c}
              </div>
            ))}
          </div>
        </div>

        {/* Right: widget catalog */}
        <div style={{
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: 'var(--s3) var(--s4)', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('dashboardlayoutsection.catalogo_de_widgets')}</div>
          </div>
          <div style={{ padding: 'var(--s3)', maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            {grupos.map((grupo) => {
              const delGrupo = widgets.filter((w) => w.grupo === grupo);
              return (
                <div key={grupo}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s2)' }}>
                    {grupo}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                    {delGrupo.map((w) => {
                      const inGrid = isInGrid(w.key);
                      const isSelected = seleccion?.key === w.key && !seleccion.origen;
                      return (
                        <button
                          key={w.key}
                          type="button"
                          disabled={inGrid || !canAct}
                          aria-pressed={inGrid ? undefined : isSelected}
                          onClick={() => handleCatalogClick(w.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--s2)',
                            padding: 'var(--s2) var(--s3)',
                            background: isSelected ? 'var(--surface-hover)' : 'var(--surface-card)',
                            border: `1px solid ${isSelected ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                            borderRadius: 'var(--r-md)',
                            cursor: inGrid || !canAct ? 'default' : 'pointer',
                            textAlign: 'left',
                            minHeight: 'var(--s9)',
                            transition: 'border-color 0.15s',
                          }}
                        >
                          <w.icon size={20} strokeWidth={1.5} color={inGrid ? 'var(--text-muted)' : 'var(--brand-600)'} aria-hidden style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Atenuado con un token de texto, no con opacity (regla del DS). */}
                            <div title={w.nombre} style={{ fontSize: '12px', fontWeight: 600, color: inGrid ? 'var(--text-muted)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {w.nombre}
                            </div>
                            {w.defaultSpan > 1 && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {t('dashboardlayoutsection.ancho_columnas', { n: w.defaultSpan })}
                              </div>
                            )}
                          </div>
                          {inGrid && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '10px', fontWeight: 600, color: 'var(--sem-success)', border: '1px solid var(--sem-success-border)', background: 'var(--sem-success-bg)', borderRadius: 'var(--r-full)', padding: '1px 6px', flexShrink: 0 }}>
                              <Check size={10} strokeWidth={2.5} aria-hidden />{t('dashboardlayoutsection.en_el_dashboard')}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {confirmRestore && (
        <ConfirmModal
          saving={saving}
          onConfirm={handleRestaurar}
          onCancel={() => setConfirmRestore(false)}
        />
      )}
    </div>
  );
}
