import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { TIPOS_MODELO, TIPO_MODELO_LABEL } from '../types';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';

export interface ModelosFiltrosState {
  busqueda: string;
  tipo: string;
  estado: string;
}

export const MODELOS_FILTROS_VACIO: ModelosFiltrosState = { busqueda: '', tipo: '', estado: '' };

const ESTADOS = ['EN_VALIDACION', 'APROBADO', 'ACTIVO', 'DEPRECADO', 'RECHAZADO'];
const ESTADO_LABEL: Record<string, string> = {
  EN_VALIDACION: 'En validación', APROBADO: 'Aprobado', ACTIVO: 'Activo', DEPRECADO: 'Deprecado', RECHAZADO: 'Rechazado',
};

interface Props {
  value: ModelosFiltrosState;
  onChange: (v: ModelosFiltrosState) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
}

export function ModelosFiltros({ value, onChange, onAplicar, onLimpiar }: Props) {
  const set = <K extends keyof ModelosFiltrosState>(k: K, v: ModelosFiltrosState[K]) => onChange({ ...value, [k]: v });

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
      <div style={FILTER_GRID}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LABEL} htmlFor="mod-busqueda">Buscar</label>
          <div style={{ position: 'relative' }}>
            <Search size={15} aria-hidden style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
            <input
              id="mod-busqueda"
              style={{ ...INPUT, paddingLeft: 32 }}
              placeholder="Nombre de versión…"
              value={value.busqueda}
              onChange={(e) => set('busqueda', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onAplicar(); }}
            />
          </div>
        </div>

        <div>
          <label style={LABEL} htmlFor="mod-tipo">Tipo de modelo</label>
          <select id="mod-tipo" style={INPUT} value={value.tipo} onChange={(e) => set('tipo', e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_MODELO.map((t) => <option key={t} value={t}>{TIPO_MODELO_LABEL[t]}</option>)}
          </select>
        </div>

        <div>
          <label style={LABEL} htmlFor="mod-estado">Estado</label>
          <select id="mod-estado" style={INPUT} value={value.estado} onChange={(e) => set('estado', e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--s2)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>
          <X size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} /> Limpiar
        </Button>
        <Button variant="secondary" size="sm" onClick={onAplicar}>
          <Filter size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} /> Aplicar
        </Button>
      </div>
    </div>
  );
}
