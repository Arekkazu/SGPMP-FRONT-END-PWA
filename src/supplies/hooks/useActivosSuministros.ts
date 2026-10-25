// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: catálogo de activos para elegir a quién se le registra |
import { useEffect, useState } from 'react';
import { activosApi } from '../api/activosApi';
import type { ActivoOpcion } from '../types';

const MAX_PAGINAS = 5; // ponytail: hasta 500 activos sugeridos; el campo acepta igual cualquier ID.

/** Sugerencias del selector de activo. Si falla, el selector sigue aceptando el ID escrito. */
export function useActivosSuministros() {
  const [activos, setActivos] = useState<ActivoOpcion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    (async () => {
      const todos: ActivoOpcion[] = [];
      try {
        for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
          const r = await activosApi.listar(pagina);
          todos.push(...r.registros);
          if (pagina >= r.total_paginas) break;
        }
      } catch {
        // sin sugerencias: el campo acepta el ID
      }
      if (vigente) { setActivos(todos); setCargando(false); }
    })();
    return () => { vigente = false; };
  }, []);

  return { activos, cargando };
}
