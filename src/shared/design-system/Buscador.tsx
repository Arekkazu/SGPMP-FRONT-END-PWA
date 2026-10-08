import React from 'react';
import { Search } from 'lucide-react';
import { useT } from '../i18n/useT';
import { Input } from './Input';

interface Props {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  /** Qué se busca, para la etiqueta: "Buscar finca". */
  label: string;
  /** Resultados visibles, anunciados al lector de pantalla. */
  resultados: number;
}

/** Campo de búsqueda en vivo para listas de selección largas (T-06). */
export function Buscador({ id, value, onChange, label, resultados }: Props) {
  const { t } = useT('common');
  return (
    <div style={{ marginBottom: 'var(--s4)', maxWidth: 420 }}>
      <Input
        id={id}
        type="search"
        label={label}
        leadingIcon={<Search size={16} />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <p role="status" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)', margin: 'var(--s1) 0 0' }}>
        {value ? t('busqueda.resultados', { count: resultados }) : ''}
      </p>
    </div>
  );
}
