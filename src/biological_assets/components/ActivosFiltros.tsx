import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import type { TipoActivo, EstadoActivoNombre } from '../types';

export interface FiltrosState {
  tipo: '' | TipoActivo;
  estado: '' | EstadoActivoNombre;
  busqueda: string;
}

interface Props {
  value: FiltrosState;
  onChange: (next: FiltrosState) => void;
}

const SELECT: React.CSSProperties = {
  padding: 'var(--s2) var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: 'var(--font-sans)',
  minWidth: 150,
  height: 38,
  cursor: 'pointer',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 'var(--s1)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const ESTADOS: EstadoActivoNombre[] = [
  'ACTIVO', 'INACTIVO', 'EN_TRATAMIENTO', 'AISLADO', 'CERRADO', 'BAJA',
];

const ESTADO_LABEL: Record<EstadoActivoNombre, string> = {
  ACTIVO: 'Activo', INACTIVO: 'Inactivo', EN_TRATAMIENTO: 'En tratamiento',
  AISLADO: 'Aislado', CERRADO: 'Cerrado', BAJA: 'Baja',
};

export function ActivosFiltros({ value, onChange }: Props) {
  const { t } = useT('biologicalAssets');
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--s4)',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        marginBottom: 'var(--s5)',
      }}
    >
      <div>
        <label style={LABEL} htmlFor="filtro-tipo">{t('activosfiltros.tipo')}</label>
        <select
          id="filtro-tipo"
          style={SELECT}
          value={value.tipo}
          onChange={(e) => onChange({ ...value, tipo: e.target.value as FiltrosState['tipo'] })}
        >
          <option value="">{t('activosfiltros.todos')}</option>
          <option value="INDIVIDUAL">{t('activosfiltros.individual')}</option>
          <option value="POBLACIONAL">{t('activosfiltros.poblacional')}</option>
        </select>
      </div>

      <div>
        <label style={LABEL} htmlFor="filtro-estado">{t('activosfiltros.estado')}</label>
        <select
          id="filtro-estado"
          style={SELECT}
          value={value.estado}
          onChange={(e) => onChange({ ...value, estado: e.target.value as FiltrosState['estado'] })}
        >
          <option value="">{t('activosfiltros.todos')}</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, minWidth: 220 }}>
        <label style={LABEL} htmlFor="filtro-busqueda">{t('activosfiltros.buscar')}</label>
        <Input
          id="filtro-busqueda"
          placeholder={t('activosfiltros.identificador_o_especie')}
          leadingIcon={<Search size={16} aria-hidden />}
          value={value.busqueda}
          onChange={(e) => onChange({ ...value, busqueda: e.target.value })}
        />
      </div>
    </div>
  );
}
