import { useEffect, useMemo } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '../api/errors';

/**
 * Lleva cada error de campo del backend al input que lo causó (WCAG 3.3.1):
 * `Input` y `Select` ya ponen `aria-invalid` y enlazan el mensaje por
 * `aria-describedby` cuando reciben el error de react-hook-form.
 *
 * El backend nombra los campos anidados con su ruta (`ubicacion.latitud`), por
 * eso tambien se compara el ultimo segmento. `campos` debe ser una constante
 * del modulo.
 *
 * Devuelve si hace falta ademas la alerta general: cuando el error no trae
 * campos o alguno no corresponde a un input del formulario.
 */
export function useErroresDeServidor<T extends FieldValues>(
  error: ApiError | null,
  setError: UseFormSetError<T>,
  campos: readonly Path<T>[],
): boolean {
  const asignados = useMemo(
    () =>
      (error?.fields ?? []).flatMap(({ field, message }) => {
        const campo = campos.find((c) => c === field || c === field.split('.').pop());
        return campo ? [{ campo, message }] : [];
      }),
    [error, campos],
  );

  useEffect(() => {
    asignados.forEach(({ campo, message }, i) =>
      setError(campo, { type: 'server', message }, { shouldFocus: i === 0 }),
    );
  }, [asignados, setError]);

  return !!error && asignados.length < (error.fields?.length || 1);
}
