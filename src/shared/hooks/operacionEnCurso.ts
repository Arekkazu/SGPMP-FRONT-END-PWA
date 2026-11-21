// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-21 | Arekkazu | INC-M08-392-G027 RF-107: operaciones en curso visibles fuera de la vista que las inició |
/*
 * RF-107 8.2 nivel 1: el modal de una acción crítica no puede convivir con una operación en curso. Las vistas que
 * lanzan una operación larga (cierre del período, generación de un reporte) la registran aquí; sigue registrada
 * aunque el usuario cambie de sección, porque la petición sigue viva. Store de módulo, como la cola de avisos.
 */
const enCurso: string[] = [];

/** Registra la operación (su nombre para el usuario: «el cierre del período») y devuelve la función que la termina. */
export function iniciarOperacion(nombre: string): () => void {
  enCurso.push(nombre);
  let terminada = false;
  return () => {
    if (terminada) return;
    terminada = true;
    enCurso.splice(enCurso.indexOf(nombre), 1);
  };
}

/** Nombre de la operación en curso más reciente, o `null` si no hay ninguna. */
export function operacionEnCurso(): string | null {
  return enCurso.length ? enCurso[enCurso.length - 1] : null;
}

/** Corre `fn` registrada como operación en curso hasta que termine, bien o mal. */
export async function enOperacion<T>(nombre: string, fn: () => Promise<T>): Promise<T> {
  const terminar = iniciarOperacion(nombre);
  try {
    return await fn();
  } finally {
    terminar();
  }
}
