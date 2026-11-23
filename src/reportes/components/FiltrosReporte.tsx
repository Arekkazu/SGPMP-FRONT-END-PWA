// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-104: filtros de cada reporte armados desde el catálogo del backend |
// | 2026-11-23 | Arekkazu | QA-M08 CU02 H-03 RF-104: la lista con «Todos» del catálogo arranca en «Todos», no en su primer valor |
import React, { useEffect, useState } from 'react';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { useT } from '../../shared/i18n/useT';
import { reportesApi, type OpcionFiltro } from '../api/reportesApi';
import type { FiltroCatalogo, ReporteCatalogo, ValoresFiltros } from '../tipos';

type TipoReferencia = Exclude<FiltroCatalogo['tipo'], 'fecha' | 'lista'>;

/** Opciones de un filtro de referencia, una sola vez por tipo mientras la página esté abierta. */
const cache = new Map<TipoReferencia, Promise<OpcionFiltro[]>>();
function cargarOpciones(tipo: TipoReferencia): Promise<OpcionFiltro[]> {
  if (!cache.has(tipo)) {
    cache.set(tipo, reportesApi.opciones(tipo).catch((e) => { cache.delete(tipo); throw e; }));
  }
  return cache.get(tipo)!;
}

function CampoReferencia({ filtro, valor, onCambiar, error, soloCerrados }: {
  filtro: FiltroCatalogo; valor: string | number | undefined; onCambiar: (v: string) => void; error?: string;
  soloCerrados: boolean;
}) {
  const { t } = useT('reportes');
  const [opciones, setOpciones] = useState<OpcionFiltro[] | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    let vivo = true;
    cargarOpciones(filtro.tipo as TipoReferencia)
      .then((o) => { if (vivo) setOpciones(o); })
      .catch(() => { if (vivo) setFallo(true); });
    return () => { vivo = false; };
  }, [filtro.tipo]);
  const visibles = (opciones ?? []).filter((o) => !soloCerrados || filtro.tipo !== 'periodo' || o.estado === 'CERRADO');
  return (
    <Select
      id={`filtro-${filtro.nombre}`}
      label={filtro.etiqueta}
      required={filtro.obligatorio}
      value={valor ?? ''}
      onChange={(e) => onCambiar(e.target.value)}
      error={error ?? (fallo ? t('filtros.opciones_no_cargaron') : undefined)}
      hint={filtro.tipo === 'periodo' && soloCerrados ? t('filtros.solo_cerrados') : undefined}
    >
      <option value="">{opciones === null && !fallo ? t('filtros.cargando') : filtro.obligatorio ? t('filtros.elige') : t('filtros.todos')}</option>
      {visibles.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
    </Select>
  );
}

interface FiltrosReporteProps {
  reporte: ReporteCatalogo;
  valores: ValoresFiltros;
  errores: Record<string, string>;
  onCambiar: (nombre: string, valor: string | number | undefined) => void;
}

/**
 * Un campo por filtro del catálogo (RF-104 Fase 1): fechas, listas de valores y referencias (finca, animal,
 * área, sensor, período) acotadas a las fincas del usuario. Los obligatorios llevan asterisco; los períodos de
 * los reportes contables solo ofrecen los cerrados.
 */
export function FiltrosReporte({ reporte, valores, errores, onCambiar }: FiltrosReporteProps) {
  const { t } = useT('reportes');
  return (
    <div style={{ display: 'grid', gap: 'var(--s4)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      {reporte.filtros.map((f) => {
        const error = errores[f.nombre];
        if (f.tipo === 'fecha') {
          return (
            <Input key={f.nombre} id={`filtro-${f.nombre}`} type="date" label={f.etiqueta} required={f.obligatorio}
                   value={String(valores[f.nombre] ?? '')} error={error}
                   onChange={(e) => onCambiar(f.nombre, e.target.value || undefined)} />
          );
        }
        if (f.tipo === 'lista') {
          // CU02 H-03: si el catálogo trae «TODOS», no hay opción vacía. Con value '' el navegador mostraba el
          // primer valor («Alto», «Vacuna») sin elegirlo: el filtro no se enviaba y elegirlo no disparaba onChange.
          const conTodos = f.valores.includes('TODOS');
          return (
            <Select key={f.nombre} id={`filtro-${f.nombre}`} label={f.etiqueta} required={f.obligatorio}
                    value={String(valores[f.nombre] ?? (conTodos ? 'TODOS' : ''))} error={error}
                    onChange={(e) => onCambiar(f.nombre, e.target.value || undefined)}>
              {!conTodos && <option value="">{t('filtros.todos')}</option>}
              {f.valores.map((v) => <option key={v} value={v}>{t(`valores.${v}`, { defaultValue: v })}</option>)}
            </Select>
          );
        }
        return (
          <CampoReferencia key={f.nombre} filtro={f} valor={valores[f.nombre]} error={error}
                           soloCerrados={reporte.periodo_cerrado}
                           onCambiar={(v) => onCambiar(f.nombre, v ? Number(v) : undefined)} />
        );
      })}
    </div>
  );
}
