import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Combobox } from '../../shared/design-system/Combobox';
import { Button } from '../../shared/design-system/Button';
import { etiquetaDeCatalogo, idDeCatalogo } from '../../shared/lib/catalogo';
import type { FincaResponse } from '../../configuration/types';
import './FincasAsignadas.css';

interface Props {
  fincas: FincaResponse[];
  seleccionadas: Set<number>;
  onChange: (ids: Set<number>) => void;
  cargando: boolean;
}

/**
 * Fincas de un usuario: buscador para agregar y la lista de las asignadas.
 * Reemplaza la lista de casillas, que con muchas fincas se volvía interminable
 * (T-06). Se agrega eligiendo la sugerencia o escribiendo el ID y pulsando
 * Enter/«Agregar»: el ID sirve aunque la finca no esté en la lista cargada;
 * el backend lo valida al guardar.
 */
export function FincasAsignadas({ fincas, seleccionadas, onChange, cargando }: Props) {
  const { t } = useT('usuarios');
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string>();

  const catalogo = fincas.map((f) => ({ id: f.id_finca, nombre: f.nombre }));
  const nombre = (id: number) => fincas.find((f) => f.id_finca === id)?.nombre ?? `#${id}`;
  const opciones = fincas
    .filter((f) => !seleccionadas.has(f.id_finca))
    .map((f) => ({ valor: etiquetaDeCatalogo(f.nombre, f.id_finca), detalle: f.ubicacion?.municipio }));

  const agregar = (valor: string) => {
    if (!valor.trim()) return;
    const id = idDeCatalogo(valor, catalogo);
    if (id == null) {
      setError(t('usuariomodal.finca_no_encontrada'));
      return;
    }
    setError(undefined);
    setTexto('');
    if (!seleccionadas.has(id)) onChange(new Set(seleccionadas).add(id));
  };

  const quitar = (id: number) => {
    const next = new Set(seleccionadas);
    next.delete(id);
    onChange(next);
  };

  return (
    <fieldset className="fincas-asignadas">
      <legend className="fincas-asignadas__titulo">{t('usuariomodal.fincas_asignadas')}</legend>

      <div className="fincas-asignadas__buscador">
        <div className="fincas-asignadas__campo">
          <Combobox
            id="usuario-agregar-finca"
            label={t('usuariomodal.agregar_finca')}
            opciones={opciones}
            value={texto}
            onChange={(v) => { setTexto(v); setError(undefined); }}
            onSelect={(o) => agregar(o.valor)}
            onEnter={agregar}
            disabled={cargando}
            placeholder={cargando ? t('usuariomodal.cargando_fincas') : undefined}
            hint={t('usuariomodal.agregar_finca_hint')}
            error={error}
          />
        </div>
        <Button type="button" variant="secondary" size="md" onClick={() => agregar(texto)} disabled={cargando}>
          {t('usuariomodal.agregar')}
        </Button>
      </div>

      <p className="fincas-asignadas__conteo" aria-live="polite">
        {seleccionadas.size === 0
          ? t('usuariomodal.sin_fincas_asignadas')
          : t('usuariomodal.fincas_asignadas_conteo', { count: seleccionadas.size })}
      </p>
      {seleccionadas.size > 0 && (
        <ul className="fincas-asignadas__lista" aria-label={t('usuariomodal.fincas_asignadas')}>
          {[...seleccionadas].map((id) => (
            <li key={id} className="fincas-asignadas__item">
              <span>{nombre(id)}</span>
              <button
                type="button"
                className="fincas-asignadas__quitar"
                aria-label={t('usuariomodal.quitar_finca', { nombre: nombre(id) })}
                onClick={() => quitar(id)}
              >
                <X size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
