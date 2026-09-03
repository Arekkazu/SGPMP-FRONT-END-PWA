import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useT } from '../../shared/i18n/useT';
import { RotateCcw, Save } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import type { WidgetCatalogoItem, WidgetConfigDTO } from '../types';

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
  icon: string;
  defaultSpan: 1 | 2;
}

const ICONOS: Record<string, string> = {
  temp_galpon: '🌡️', hum_galpon: '💧', ph_estanque: '⚗️', co2_galpon: '💨',
  temp_corral: '🌡️', estado_iot: '📡', cal_sensores: '🔧', alertas: '⚠️',
  alertas_crit: '🔴', hist_temp: '📈', hist_hum: '📊', prod_aves: '🐔',
  prod_bovinos: '🐄', fincas_estado: '🏡', cfg_pendiente: '⏳',
};

const ICONO_POR_DEFECTO = '📦';

function aWidgetDef(w: WidgetCatalogoItem): WidgetDef {
  return {
    id: w.id_widget,
    key: w.clave,
    nombre: w.nombre,
    grupo: w.grupo,
    icon: ICONOS[w.clave] ?? ICONO_POR_DEFECTO,
    defaultSpan: w.span_predeterminado,
  };
}

// Tope de la grilla 4x3. La matriz local ya lo impone estructuralmente, pero el
// usuario merece el mensaje del RF en vez de un clic que no hace nada.
const MAX_WIDGETS = 12;


// ── Grid cell type ────────────────────────────────────────────────────────────
// idWidget === -1 means "covered by the span of the widget to the left"
type GridCell = { idWidget: number; key: string; span: number } | null;

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
  const { t } = useT('configuration');
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', padding: 'var(--s4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: 'var(--surface-card)', borderRadius: 'var(--r-xl)',
        border: '1px solid var(--surface-border)', padding: 'var(--s6)',
        width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)',
      }}>
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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

  const handleCatalogClick = (key: string) => {
    if (isInGrid(key)) return;
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  const handleCellClick = (fila: number, col: number) => {
    const cell = localGrid[fila][col];

    if (cell && cell.idWidget !== -1) {
      // Remove widget from grid
      const newGrid = localGrid.map((row) => [...row]);
      const span = cell.span;
      for (let s = 0; s < span && col + s < 4; s++) {
        newGrid[fila][col + s] = null;
      }
      setLocalGrid(newGrid);
      setActiveWidgets((prev) => prev.filter((k) => k !== cell.key));
      setLimiteAviso(false);
      return;
    }

    if (cell && cell.idWidget === -1) return; // covered by span — ignore

    if (!selectedKey) return; // empty cell, nothing selected

    // Place the selected widget
    const def = widgets.find((w) => w.key === selectedKey);
    if (!def) return;

    // El RF pide informar cuando se alcanza el maximo, no ignorar el clic en
    // silencio. La matriz 4x3 ya impide pasar de 12, pero sin este aviso el
    // usuario no sabe por que dejo de poder agregar.
    if (contarColocados(localGrid) >= MAX_WIDGETS) {
      setLimiteAviso(true);
      return;
    }
    setLimiteAviso(false);

    const span = def.defaultSpan;
    // Validate: span must fit in row and not collide
    if (col + span > 4) return;
    for (let s = 0; s < span; s++) {
      if (localGrid[fila][col + s] !== null) return;
    }

    const newGrid = localGrid.map((row) => [...row]);
    newGrid[fila][col] = { idWidget: def.id, key: def.key, span };
    for (let s = 1; s < span; s++) {
      newGrid[fila][col + s] = { idWidget: -1, key: '', span: 0 };
    }
    setLocalGrid(newGrid);
    setActiveWidgets((prev) => prev.includes(def.key) ? prev : [...prev, def.key]);
    setSelectedKey(null);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s5)' }}>
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
          description={`El dashboard permite un máximo de ${MAX_WIDGETS} elementos activos simultáneamente. Por favor, desactive un widget antes de agregar uno nuevo.`}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {saved && (
        <Alert variant="success" title={t('dashboardlayoutsection.guardado')} description={t('dashboardlayoutsection.el_layout_del_dashboard_se_actualizo')} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {selectedKey && (
        <Alert
          variant="info"
          title={`Widget seleccionado: ${widgets.find((w) => w.key === selectedKey)?.nombre}`}
          description={t('dashboardlayoutsection.haz_clic_en_una_celda_vacia_de_la_grilla')}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--s5)', alignItems: 'start' }}>

        {/* Left: grid editor */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s3)' }}>
            Grilla del dashboard (4 columnas × 3 filas)
          </div>
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
                  const isTarget = isEmpty && !!selectedKey;

                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleCellClick(fila, col)}
                      disabled={!canAct}
                      style={{
                        gridColumn: `span ${span}`,
                        height: 80,
                        border: isEmpty
                          ? `2px dashed ${isTarget ? 'var(--brand-500)' : 'var(--surface-border)'}`
                          : '2px solid var(--brand-400)',
                        borderRadius: 'var(--r-md)',
                        background: isEmpty
                          ? isTarget ? 'rgba(var(--brand-50-rgb, 240,253,244),0.5)' : 'var(--surface-hover)'
                          : 'var(--surface-card)',
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
                      aria-label={def ? `Quitar ${def.nombre}` : isTarget ? `Colocar ${selectedKey}` : `Celda vacía fila ${fila + 1} columna ${col + 1}`}
                    >
                      {cell && def ? (
                        <>
                          <span style={{ fontSize: '20px', lineHeight: 1 }} role="img" aria-label={def.nombre}>{def.icon}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                            {def.nombre}
                          </span>
                          {span > 1 && (
                            <span style={{ fontSize: '10px', color: 'var(--brand-600)', fontFamily: 'var(--font-mono)' }}>
                              ×{span}col
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: isTarget ? '20px' : '16px', color: isTarget ? 'var(--brand-500)' : 'var(--text-muted)' }}>
                          {isTarget ? '+' : '·'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

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
                      const isSelected = selectedKey === w.key;
                      return (
                        <button
                          key={w.key}
                          type="button"
                          disabled={inGrid || !canAct}
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
                            opacity: inGrid ? 0.5 : 1,
                            transition: 'border-color 0.15s',
                          }}
                        >
                          <span style={{ fontSize: '16px', flexShrink: 0 }} role="img" aria-label={w.nombre}>{w.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {w.nombre}
                            </div>
                            {w.defaultSpan > 1 && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                ancho ×{w.defaultSpan}
                              </div>
                            )}
                          </div>
                          {inGrid && (
                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--sem-success)', border: '1px solid var(--sem-success)', borderRadius: 'var(--r-full)', padding: '1px 5px', flexShrink: 0 }}>
                              ✓
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
