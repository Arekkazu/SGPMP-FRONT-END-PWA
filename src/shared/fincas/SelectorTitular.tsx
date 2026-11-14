// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-14 | Arekkazu | FILTRO-FINCA RF-98: titular (NIT) entre los de las fincas del usuario |
import { useMemo } from 'react';
import { Combobox } from '../design-system/Combobox';
import { useT } from '../i18n/useT';
import { useMisFincas } from './useMisFincas';

interface Props {
  id: string;
  /** NIT escrito o elegido (sin DV). */
  value: string;
  onChange: (nit: string) => void;
  label?: string;
  hint?: string;
  required?: boolean;
}

/**
 * Integración contable trabaja por titular, no por finca: las opciones son los NIT de las fincas
 * del usuario (todas para el Administrador), con las fincas de cada uno como detalle.
 */
export function SelectorTitular({ id, value, onChange, label, hint, required }: Props) {
  const { t } = useT('common');
  const { fincas, cargando } = useMisFincas();
  const opciones = useMemo(() => {
    const porNit = new Map<string, { razon: string | null; fincas: string[] }>();
    for (const f of fincas) {
      if (!f.numero_id_tributaria) continue;
      const g = porNit.get(f.numero_id_tributaria) ?? { razon: f.razon_social, fincas: [] };
      g.fincas.push(f.nombre);
      porNit.set(f.numero_id_tributaria, g);
    }
    return [...porNit].map(([nit, g]) => ({ valor: nit, detalle: [g.razon, g.fincas.join(', ')].filter(Boolean).join(' · ') }));
  }, [fincas]);

  return (
    <Combobox
      id={id}
      label={label ?? t('finca.titular')}
      opciones={opciones}
      value={value}
      onChange={(v) => onChange(v.replace(/\D/g, ''))}
      required={required}
      placeholder={cargando ? t('finca.cargando') : t('finca.titular_placeholder')}
      hint={hint ?? (!cargando && opciones.length === 0 ? t('finca.sin_titulares') : undefined)}
    />
  );
}
