// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-14 | Arekkazu | FILTRO-FINCA RF-25: combobox de las fincas del usuario para los filtros |
import { useEffect, useMemo, useState } from 'react';
import { Combobox } from '../design-system/Combobox';
import { useT } from '../i18n/useT';
import { etiquetaDeCatalogo, idDeCatalogo, resolverCatalogo } from '../lib/catalogo';
import { useMisFincas } from './useMisFincas';

interface Props {
  id: string;
  /** Finca elegida; `null` = todas. */
  idFinca: number | null;
  onChange: (idFinca: number | null) => void;
  label?: string;
}

/** Filtro por finca: solo las del usuario (todas para el Administrador); se escribe el nombre o el ID. */
export function SelectorFinca({ id, idFinca, onChange, label }: Props) {
  const { t } = useT('common');
  const { fincas, cargando } = useMisFincas();
  const [texto, setTexto] = useState('');
  const [sinResolver, setSinResolver] = useState(false);
  const catalogo = useMemo(() => fincas.map((f) => ({ id: f.id_finca, nombre: f.nombre })), [fincas]);
  const opciones = useMemo(() => fincas.map((f) => ({
    valor: etiquetaDeCatalogo(f.nombre, f.id_finca),
    detalle: f.razon_social ?? undefined,
  })), [fincas]);

  // «Limpiar filtros» vuelve el id a null desde afuera: el texto lo sigue.
  useEffect(() => { if (idFinca === null) { setTexto(''); setSinResolver(false); } }, [idFinca]);

  const resolver = () => {
    const r = resolverCatalogo(texto, catalogo);
    setSinResolver(r.estado === 'sin_resolver');
    if (r.estado === 'resuelto') { setTexto(r.texto); onChange(r.id); }
  };

  return (
    <Combobox
      id={id}
      label={label ?? t('finca.etiqueta')}
      opciones={opciones}
      value={texto}
      onChange={(v) => { setTexto(v); setSinResolver(false); onChange(v.trim() ? idDeCatalogo(v, catalogo) : null); }}
      onBlur={resolver}
      onEnter={resolver}
      placeholder={cargando ? t('finca.cargando') : t('finca.placeholder')}
      error={sinResolver ? t('finca.sin_resolver') : undefined}
      hint={!cargando && fincas.length === 0 ? t('finca.sin_fincas') : undefined}
    />
  );
}
