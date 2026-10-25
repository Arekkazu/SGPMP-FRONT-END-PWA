// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-75/RF-76: filtros por activo, rango de fechas y estado |
import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { useT } from '../../shared/i18n/useT';
import type { ActivoOpcion, FiltrosRegistros } from '../types';
import { SelectorActivo } from './SelectorActivo';
import { FILTROS } from './estilos';

interface Props {
  prefijo: string;
  activos: ActivoOpcion[];
  cargandoActivos: boolean;
  cargando: boolean;
  onBuscar: (filtros: FiltrosRegistros) => void;
}

export function FiltrosRegistrosBar({ prefijo, activos, cargandoActivos, cargando, onBuscar }: Props) {
  const { t } = useT('supplies');
  const [texto, setTexto] = useState('');
  const [idActivo, setIdActivo] = useState<number | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState('');
  const rangoInvalido = !!desde && !!hasta && desde > hasta;

  const buscar = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (rangoInvalido) return;
    onBuscar({
      id_activo_biologico: idActivo ?? undefined,
      fecha_desde: desde || undefined,
      fecha_hasta: hasta || undefined,
      estado_registro: estado || undefined,
    });
  };
  const limpiar = () => {
    setTexto(''); setIdActivo(null); setDesde(''); setHasta(''); setEstado('');
    onBuscar({});
  };

  return (
    <form onSubmit={buscar} role="search" style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
      <SelectorActivo id={`${prefijo}-filtro-activo`} activos={activos} cargando={cargandoActivos} value={texto} onChange={(v, id) => { setTexto(v); setIdActivo(id); }} />
      <Input id={`${prefijo}-desde`} label={t('comun.desde')} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
      <Input
        id={`${prefijo}-hasta`} label={t('comun.hasta')} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
        error={rangoInvalido ? t('comun.rango_invalido') : undefined}
      />
      <Select id={`${prefijo}-estado`} label={t('comun.estado')} value={estado} onChange={(e) => setEstado(e.target.value)}>
        <option value="">{t('comun.todos')}</option>
        <option value="VALIDADO">{t('estado.VALIDADO')}</option>
        <option value="ANULADO">{t('estado.ANULADO')}</option>
      </Select>
      <div style={{ display: 'flex', gap: 'var(--s2)', paddingBottom: 'var(--s1)' }}>
        <Button type="submit" variant="secondary" size="md" loading={cargando}><Search size={16} aria-hidden />{t('comun.buscar')}</Button>
        <Button type="button" variant="ghost" size="md" onClick={limpiar} aria-label={t('comun.limpiar_filtros')}><X size={16} aria-hidden /></Button>
      </div>
    </form>
  );
}
