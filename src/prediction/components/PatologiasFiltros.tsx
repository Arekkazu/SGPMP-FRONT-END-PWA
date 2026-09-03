import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { CATALOGO_ESPECIES } from '../lib/catalogos';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';

export interface PatologiasFiltrosState {
  busqueda: string;
  especie: string;   // '' | 'TODAS' | id
  estado: string;    // '' | 'activas' | 'inactivas'
  tipo: string;      // '' | 'base' | 'personalizada'
}

export const PATOLOGIAS_FILTROS_VACIO: PatologiasFiltrosState = {
  busqueda: '', especie: '', estado: '', tipo: '',
};

interface Props {
  value: PatologiasFiltrosState;
  onChange: (v: PatologiasFiltrosState) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
}

export function PatologiasFiltros({ value, onChange, onAplicar, onLimpiar }: Props) {
  const { t } = useT('prediction');
  const set = <K extends keyof PatologiasFiltrosState>(k: K, v: PatologiasFiltrosState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
      <div style={FILTER_GRID}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LABEL} htmlFor="pat-busqueda">{t('patologiasfiltros.buscar')}</label>
          <div style={{ position: 'relative' }}>
            <Search size={15} aria-hidden style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
            <input
              id="pat-busqueda"
              style={{ ...INPUT, paddingLeft: 32 }}
              placeholder={t('patologiasfiltros.nombre_de_patologia')}
              value={value.busqueda}
              onChange={(e) => set('busqueda', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onAplicar(); }}
            />
          </div>
        </div>

        <div>
          <label style={LABEL} htmlFor="pat-especie">{t('patologiasfiltros.especie')}</label>
          <select id="pat-especie" style={INPUT} value={value.especie} onChange={(e) => set('especie', e.target.value)}>
            <option value="">{t('patologiasfiltros.todas')}</option>
            {CATALOGO_ESPECIES.map((e) => <option key={e.valor} value={e.valor}>{e.nombre}</option>)}
          </select>
        </div>

        <div>
          <label style={LABEL} htmlFor="pat-estado">{t('patologiasfiltros.estado')}</label>
          <select id="pat-estado" style={INPUT} value={value.estado} onChange={(e) => set('estado', e.target.value)}>
            <option value="">{t('patologiasfiltros.todos')}</option>
            <option value="activas">{t('patologiasfiltros.activas')}</option>
            <option value="inactivas">{t('patologiasfiltros.inactivas')}</option>
          </select>
        </div>

        <div>
          <label style={LABEL} htmlFor="pat-tipo">{t('patologiasfiltros.tipo')}</label>
          <select id="pat-tipo" style={INPUT} value={value.tipo} onChange={(e) => set('tipo', e.target.value)}>
            <option value="">{t('patologiasfiltros.todos')}</option>
            <option value="base">{t('patologiasfiltros.base')}</option>
            <option value="personalizada">{t('patologiasfiltros.personalizada')}</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--s2)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>
          <X size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('patologiasfiltros.limpiar')}</Button>
        <Button variant="secondary" size="sm" onClick={onAplicar}>
          <Filter size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('patologiasfiltros.aplicar')}</Button>
      </div>
    </div>
  );
}
