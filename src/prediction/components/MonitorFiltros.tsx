// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-10 RF-66: filtros del monitor (animal, tipo, nivel, fechas con rangos rápidos, alerta, pruebas) |
import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { Combobox } from '../../shared/design-system/Combobox';
import { etiquetaDeCatalogo, idDeCatalogo, resolverCatalogo } from '../../shared/lib/catalogo';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';
import { TIPOS_MODELO, etiquetaTipoModelo, type ActivoSelectorItem } from '../types';
import type { FiltrosMonitorPaginado } from '../api/monitorApi';

export type RangoRapido = 'hoy' | '24h' | '7d' | '';

export interface MonitorFiltrosState {
  activo: string;
  id_activo_biologico: string;
  tipo_modelo: string;
  nivel_riesgo: string;
  rango: RangoRapido;
  fecha_desde: string;
  fecha_hasta: string;
  solo_con_alerta: boolean;
  /** Las de modelos en prueba (sombra). En DEV todo corre en prueba: por defecto se incluyen. */
  incluir_sombra: boolean;
}

export const MONITOR_FILTROS_VACIO: MonitorFiltrosState = {
  activo: '', id_activo_biologico: '', tipo_modelo: '', nivel_riesgo: '', rango: '24h',
  fecha_desde: '', fecha_hasta: '', solo_con_alerta: false, incluir_sombra: true,
};

/** Estado de los filtros → parámetros del backend. `ahora` se inyecta en las pruebas. */
export function aFiltrosApi(f: MonitorFiltrosState, ahora: Date = new Date()): FiltrosMonitorPaginado {
  const api: FiltrosMonitorPaginado = { incluir_sombra: f.incluir_sombra };
  if (f.id_activo_biologico) api.id_activo_biologico = Number(f.id_activo_biologico);
  if (f.tipo_modelo) api.tipo_modelo = f.tipo_modelo;
  if (f.nivel_riesgo !== '') api.nivel_riesgo = Number(f.nivel_riesgo);
  if (f.solo_con_alerta) api.solo_con_alerta = true;
  if (f.rango === 'hoy') {
    const d = new Date(ahora); d.setHours(0, 0, 0, 0); api.desde = d.toISOString();
  } else if (f.rango === '24h') {
    api.desde = new Date(ahora.getTime() - 24 * 3600 * 1000).toISOString();
  } else if (f.rango === '7d') {
    api.desde = new Date(ahora.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  } else {
    if (f.fecha_desde) api.desde = inicioDelDiaUtc(f.fecha_desde);
    if (f.fecha_hasta) api.hasta = finDelDiaUtc(f.fecha_hasta);
  }
  return api;
}

interface Props {
  activos: ActivoSelectorItem[];
  value: MonitorFiltrosState;
  onChange: (v: MonitorFiltrosState) => void;
  /** Con `v`, consulta con esos filtros (los rangos rápidos no esperan al re-render). */
  onAplicar: (v?: MonitorFiltrosState) => void;
  onLimpiar: () => void;
}

const RANGOS: Exclude<RangoRapido, ''>[] = ['hoy', '24h', '7d'];

export function MonitorFiltros({ activos, value, onChange, onAplicar, onLimpiar }: Props) {
  const { t } = useT('prediction');
  const catalogo = activos.map((a) => ({ id: a.id_activo_biologico, nombre: a.identificador || `#${a.id_activo_biologico}` }));
  const opciones = activos.map((a) => ({ valor: etiquetaDeCatalogo(a.identificador || `#${a.id_activo_biologico}`, a.id_activo_biologico), detalle: a.nombre_especie ?? undefined }));
  const [tocado, setTocado] = useState(false);
  const sinResolver = value.activo.trim() !== '' && value.id_activo_biologico === '';
  const invertido = value.rango === '' && !!value.fecha_desde && !!value.fecha_hasta && value.fecha_desde > value.fecha_hasta;
  const resolver = () => {
    const r = resolverCatalogo(value.activo, catalogo);
    if (r.estado === 'resuelto') onChange({ ...value, activo: r.texto, id_activo_biologico: String(r.id) });
    setTocado(r.estado === 'sin_resolver');
  };
  const aplicar = () => {
    if (sinResolver) { setTocado(true); return; }
    if (!invertido) onAplicar();
  };
  const set = <K extends keyof MonitorFiltrosState>(k: K, v: MonitorFiltrosState[K]) => onChange({ ...value, [k]: v });

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s4)' }}>
      <div role="group" aria-label={t('monitor.filtro_rango')} style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s3)' }}>
        {RANGOS.map((r) => (
          <Button
            key={r} size="sm" variant={value.rango === r ? 'primary' : 'ghost'} aria-pressed={value.rango === r}
            onClick={() => { const v = { ...value, rango: r, fecha_desde: '', fecha_hasta: '' }; onChange(v); onAplicar(v); }}
          >{t(`monitor.rango_${r}`)}</Button>
        ))}
      </div>
      <div style={FILTER_GRID}>
        <Combobox
          id="mon-activo"
          label={t('monitor.filtro_activo')}
          opciones={opciones}
          value={value.activo}
          onChange={(texto) => {
            const id = idDeCatalogo(texto, catalogo);
            onChange({ ...value, activo: texto, id_activo_biologico: id != null ? String(id) : '' });
            if (id != null || !texto.trim()) setTocado(false);
          }}
          onBlur={resolver}
          onEnter={resolver}
          error={tocado && sinResolver ? t('monitor.filtro_activo_sin_resolver') : undefined}
          placeholder={t('monitor.filtro_activo_placeholder')}
        />
        <div>
          <label style={LABEL} htmlFor="mon-tipo">{t('monitor.tipo_modelo')}</label>
          <select id="mon-tipo" style={INPUT} value={value.tipo_modelo} onChange={(e) => set('tipo_modelo', e.target.value)}>
            <option value="">{t('monitor.todos')}</option>
            {TIPOS_MODELO.map((tm) => <option key={tm} value={tm}>{etiquetaTipoModelo(tm)}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="mon-nivel">{t('monitor.nivel')}</label>
          <select id="mon-nivel" style={INPUT} value={value.nivel_riesgo} onChange={(e) => set('nivel_riesgo', e.target.value)}>
            <option value="">{t('monitor.todos')}</option>
            {[3, 2, 1, 0].map((n) => <option key={n} value={String(n)}>{t(`monitor.nivel_${n}`)}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="mon-desde">{t('monitor.desde')}</label>
          <input id="mon-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={(e) => onChange({ ...value, fecha_desde: e.target.value, rango: '' })} />
        </div>
        <div>
          <label style={LABEL} htmlFor="mon-hasta">{t('monitor.hasta')}</label>
          <input
            id="mon-hasta" type="date" style={INPUT} value={value.fecha_hasta}
            onChange={(e) => onChange({ ...value, fecha_hasta: e.target.value, rango: '' })}
            aria-invalid={invertido} aria-describedby={invertido ? 'mon-rango-error' : undefined}
          />
          {invertido && <p id="mon-rango-error" role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>{t('filtros.rango_invertido', { ns: 'common' })}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s5)', flexWrap: 'wrap', margin: 'var(--s3) 0' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', color: 'var(--text-primary)', minHeight: 'var(--s9)' }}>
          <input type="checkbox" checked={value.solo_con_alerta} onChange={(e) => set('solo_con_alerta', e.target.checked)} />
          {t('monitor.solo_con_alerta')}
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', color: 'var(--text-primary)', minHeight: 'var(--s9)' }}>
          <input type="checkbox" checked={value.incluir_sombra} onChange={(e) => set('incluir_sombra', e.target.checked)} />
          {t('monitor.incluir_pruebas')}
        </label>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={() => { setTocado(false); onLimpiar(); }}>
          <X size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('monitor.limpiar')}</Button>
        <Button variant="secondary" size="sm" onClick={aplicar} disabled={invertido}>
          <Filter size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('monitor.aplicar')}</Button>
      </div>
    </div>
  );
}
