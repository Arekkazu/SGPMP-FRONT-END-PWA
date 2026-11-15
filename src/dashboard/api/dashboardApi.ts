// | Fecha      | Nombre   | Que se hizo                                       |
// |------------|----------|---------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: datos y opciones de cada widget        |
import { http } from '../../shared/api/http';

export type EstadoWidget = 'OK' | 'SIN_DATOS' | 'ERROR';

/** Datos de un widget. `datos` tiene la forma propia de cada widget. */
export interface DatosWidget {
  clave: string;
  estado: EstadoWidget;
  mensaje: string | null;
  actualizado_en: string;
  /** Cambia solo si cambian los datos: con la misma huella no se redibuja. */
  huella: string;
  /** `todas`: se mostró toda la finca porque lo elegido no es de ella o no se eligió nada. */
  alcance?: 'seleccion' | 'todas' | null;
  datos: Record<string, unknown>;
}

export interface ValorOpcion {
  valor: number | string;
  nombre?: string | null;
  area?: string | null;
}

// RF-103: si un widget no responde en 2 s muestra «Datos no disponibles» y los demás siguen.
const TIEMPO_MAXIMO_MS = 2000;

export const dashboardApi = {
  async datos(clave: string, idFinca: number | null): Promise<DatosWidget> {
    const res = await http.get<DatosWidget>(`/dashboard/widgets/${clave}`, {
      params: idFinca ? { id_finca: idFinca } : undefined,
      timeout: TIEMPO_MAXIMO_MS,
    });
    return res.data;
  },

  async opciones(clave: string, idFinca: number | null): Promise<Record<string, ValorOpcion[]>> {
    const res = await http.get<Record<string, ValorOpcion[]>>(`/dashboard/widgets/${clave}/opciones`, {
      params: idFinca ? { id_finca: idFinca } : undefined,
    });
    return res.data;
  },
};
