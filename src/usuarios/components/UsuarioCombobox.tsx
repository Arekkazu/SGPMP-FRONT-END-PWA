import React, { useEffect, useState } from 'react';
import { Combobox, type OpcionCombobox } from '../../shared/design-system/Combobox';
import { etiquetaDeCatalogo } from '../../shared/lib/catalogo';
import { usuariosApi } from '../api/usuariosApi';

const ESPERA_MS = 300;
const MIN_CARACTERES = 2;

/**
 * ID del usuario escrito en el campo: el número tal cual (como el campo «ID de
 * usuario» de antes, que usan las pruebas de QA) o la sugerencia elegida
 * «Nombre (#id)». Un nombre suelto no basta: varios usuarios pueden llamarse
 * igual. ``null`` si no se puede resolver; ``undefined`` si el campo está vacío.
 */
export function idDeUsuario(texto: string): number | null | undefined {
  const v = (texto ?? '').trim();
  if (!v) return undefined;
  const id = /^\d+$/.test(v) ? v : v.match(/\(#(\d+)\)$/)?.[1];
  return id ? Number(id) || null : null;
}

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (texto: string) => void;
  hint?: string;
  error?: string;
}

/**
 * Filtro por usuario con autocompletado. Busca en `GET /usuarios/admin` por
 * nombre (o por correo si lleva «@») mientras se escribe. Sin permiso de
 * lectura de usuarios no hay sugerencias, pero el ID escrito sigue sirviendo.
 */
export function UsuarioCombobox({ id, label, value, onChange, hint, error }: Props) {
  const [opciones, setOpciones] = useState<OpcionCombobox[]>([]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < MIN_CARACTERES || idDeUsuario(q) != null) return;
    let vigente = true;
    const espera = setTimeout(() => {
      usuariosApi
        .listar({ ...(q.includes('@') ? { correo: q } : { nombre: q }), pagina: 1, tamano: 20 })
        .then((res) => {
          if (vigente) {
            setOpciones(res.items.map((u) => ({
              valor: etiquetaDeCatalogo(u.nombre_usuario, u.id_usuario),
              detalle: u.correo_electronico,
            })));
          }
        })
        .catch(() => { if (vigente) setOpciones([]); });
    }, ESPERA_MS);
    return () => { vigente = false; clearTimeout(espera); };
  }, [value]);

  return (
    <Combobox
      id={id}
      label={label}
      opciones={opciones}
      value={value}
      onChange={onChange}
      hint={hint}
      error={error}
    />
  );
}
