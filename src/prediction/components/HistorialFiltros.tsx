import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { NIVEL_RIESGO_LABEL } from '../lib/riesgo';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';
import type { ActivoSelectorItem } from '../types';

export interface HistorialFiltrosState {
  idActivo: string;
  fecha_inicio: string;
  fecha_fin: string;
  nivel_riesgo: string;
  id_patologia: string;
  incluir_alertas: boolean;
}

export function historialFiltrosVacio(): HistorialFiltrosState {
  const hoy = new Date();
  const hace30 = new Date(hoy.getTime() - 30 * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { idActivo: '', fecha_inicio: iso(hace30), fecha_fin: iso(hoy), nivel_riesgo: '', id_patologia: '', incluir_alertas: false };
}

interface Props {
  value: HistorialFiltrosState;
  activos: ActivoSelectorItem[];
  activosError: boolean;
  patologias: { id: number; nombre: string }[];
  onChange: (v: HistorialFiltrosState) => void;
  onConsultar: () => void;
  onLimpiar: () => void;
  loading: boolean;
}

export function HistorialFiltros({ value, activos, activosError, patologias, onChange, onConsultar, onLimpiar, loading }: Props) {
  const { t } = useT('prediction');
  const set = <K extends keyof HistorialFiltrosState>(k: K, v: HistorialFiltrosState[K]) => onChange({ ...value, [k]: v });
  const errFechas = value.fecha_inicio && value.fecha_fin && value.fecha_inicio > value.fecha_fin;

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="hist-activo">{t('historialfiltros.activo_lote')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></label>
          {activosError ? (
            <input id="hist-activo" type="number" style={INPUT} placeholder={t('historialfiltros.id_de_activo')} value={value.idActivo} onChange={(e) => set('idActivo', e.target.value)} />
          ) : (
            <select id="hist-activo" style={INPUT} value={value.idActivo} onChange={(e) => set('idActivo', e.target.value)}>
              <option value="">{t('historialfiltros.selecciona')}</option>
              {activos.map((a) => (
                <option key={a.id_activo_biologico} value={a.id_activo_biologico}>
                  {a.identificador ?? `Activo ${a.id_activo_biologico}`}{a.nombre_especie ? ` · ${a.nombre_especie}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label style={LABEL} htmlFor="hist-desde">{t('historialfiltros.desde')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></label>
          <input id="hist-desde" type="date" style={INPUT} value={value.fecha_inicio} max={value.fecha_fin || undefined} onChange={(e) => set('fecha_inicio', e.target.value)} />
        </div>

        <div>
          <label style={LABEL} htmlFor="hist-hasta">{t('historialfiltros.hasta')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></label>
          <input id="hist-hasta" type="date" style={INPUT} value={value.fecha_fin} onChange={(e) => set('fecha_fin', e.target.value)} />
        </div>

        <div>
          <label style={LABEL} htmlFor="hist-nivel">{t('historialfiltros.nivel_de_riesgo')}</label>
          <select id="hist-nivel" style={INPUT} value={value.nivel_riesgo} onChange={(e) => set('nivel_riesgo', e.target.value)}>
            <option value="">{t('historialfiltros.todos')}</option>
            {Object.entries(NIVEL_RIESGO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div>
          <label style={LABEL} htmlFor="hist-pat">{t('historialfiltros.patologia')}</label>
          <select id="hist-pat" style={INPUT} value={value.id_patologia} onChange={(e) => set('id_patologia', e.target.value)}>
            <option value="">{t('historialfiltros.todas')}</option>
            {patologias.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', paddingBottom: 'var(--s2)' }}>
            <input type="checkbox" checked={value.incluir_alertas} onChange={(e) => set('incluir_alertas', e.target.checked)} style={{ accentColor: 'var(--brand-500)', width: 16, height: 16 }} />{t('historialfiltros.incluir_alertas')}</label>
        </div>
      </div>

      {errFechas && <p role="alert" style={{ margin: '0 0 var(--s2)', fontSize: '12px', color: 'var(--sem-error)' }}>{t('historialfiltros.la_fecha_inicial_no_puede_ser_posterior_a')}</p>}

      <div style={{ display: 'flex', gap: 'var(--s2)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>
          <X size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialfiltros.limpiar')}</Button>
        <Button variant="primary" size="sm" loading={loading} disabled={!value.idActivo || !!errFechas} onClick={onConsultar}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialfiltros.consultar')}</Button>
      </div>
    </div>
  );
}
