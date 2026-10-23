// | Fecha      | Nombre       | Que se hizo                                           |
// |------------|--------------|-------------------------------------------------------|
// | 2026-10-23 | destroyerban | FE-08 RF-70: la OTA lista versiones APROBADO          |
// RF-70 · Lógica pura de la distribución OTA por componente (FE-01b, DEV-15).
import type {
  CrearDistribucionOtaDTO,
  DespliegueOtaResponse,
  DistribucionOtaResponse,
  EstadoVersion,
  FaseRollout,
  ModoDistribucion,
  VersionModeloResponse,
} from '../types';
import { FASES_ROLLOUT } from '../types';

/**
 * Estados que se pueden distribuir por OTA (FE-08, RFC-015 C3): la versión APROBADO se
 * distribuye y el Veterinario la activa después del despliegue (RF-69); la ACTIVO también,
 * para nodos nuevos (P-2, igual que el backend en DEV-26). APROBADO va primero.
 */
export const ESTADOS_VERSION_DISTRIBUIBLES: readonly EstadoVersion[] = ['APROBADO', 'ACTIVO'];

/** Une las versiones de cada estado distribuible en una sola lista, sin repetir ninguna. */
export function unirVersionesDistribuibles(listas: VersionModeloResponse[][]): VersionModeloResponse[] {
  const vistas = new Set<number>();
  return listas.flat().filter((v) => !vistas.has(v.id_version_modelo) && vistas.add(v.id_version_modelo));
}

/** Los modelos INDIVIDUAL y META no tienen componente: se muestran como modelo completo. */
export const COMPONENTE_COMPLETO = 'COMPLETO';

/**
 * Último despliegue de cada componente en un nodo (el de mayor id). Es la foto del
 * nodo que pide D-05: DETECTOR v3 y ANOMALIAS v1 pueden convivir.
 */
export function ultimoPorComponente(despliegues: DespliegueOtaResponse[]): Record<string, DespliegueOtaResponse> {
  const porComponente: Record<string, DespliegueOtaResponse> = {};
  for (const d of despliegues) {
    const clave = d.componente ?? COMPONENTE_COMPLETO;
    const actual = porComponente[clave];
    if (!actual || d.id_despliegue_ota > actual.id_despliegue_ota) porComponente[clave] = d;
  }
  return porComponente;
}

export type EstadoFase = 'completada' | 'en_curso' | 'pendiente' | 'detenida';

/** Estado de cada fase del rollout a partir de la fase actual y el estado de la distribución. */
export function estadoDeFases(distribucion: Pick<DistribucionOtaResponse, 'fase_rollout' | 'estado_distribucion'>): Record<FaseRollout, EstadoFase> {
  const actual = FASES_ROLLOUT.indexOf(distribucion.fase_rollout);
  const resultado = {} as Record<FaseRollout, EstadoFase>;
  FASES_ROLLOUT.forEach((fase, i) => {
    if (distribucion.estado_distribucion === 'COMPLETADA' || i < actual) resultado[fase] = 'completada';
    else if (i === actual) resultado[fase] = distribucion.estado_distribucion === 'DETENIDA' ? 'detenida' : 'en_curso';
    else resultado[fase] = 'pendiente';
  });
  return resultado;
}

export interface FormDistribucion {
  idVersion: string;
  dispositivos: number[];
  modo: ModoDistribucion;
  ventanaInicio: string;
  ventanaFin: string;
  bateriaMinima: string;
  tamanoFragmento: string;
  reintentos: string;
  porcentajeParcial: string;
}

export const FORM_DISTRIBUCION_INICIAL: FormDistribucion = {
  idVersion: '',
  dispositivos: [],
  modo: 'INMEDIATO',
  ventanaInicio: '',
  ventanaFin: '',
  bateriaMinima: '30',
  tamanoFragmento: '65536',
  reintentos: '3',
  porcentajeParcial: '25',
};

/** Clave i18n (`distribucionform.*`) del error de cada campo, igual que valida el backend. */
export function validarDistribucion(f: FormDistribucion): Partial<Record<keyof FormDistribucion, string>> {
  const errores: Partial<Record<keyof FormDistribucion, string>> = {};
  const entero = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
  if (!f.idVersion) errores.idVersion = 'error_version';
  if (f.dispositivos.length === 0) errores.dispositivos = 'error_dispositivos';
  if (f.modo === 'PROGRAMADO' && (!f.ventanaInicio || !f.ventanaFin)) errores.ventanaInicio = 'error_ventana_requerida';
  if (f.ventanaInicio && f.ventanaFin && new Date(f.ventanaFin) <= new Date(f.ventanaInicio)) errores.ventanaFin = 'error_ventana_orden';
  if (f.bateriaMinima.trim() !== '') {
    const b = Number(f.bateriaMinima);
    if (Number.isNaN(b) || b < 0 || b > 100) errores.bateriaMinima = 'error_bateria';
  }
  if (!(entero(f.tamanoFragmento) > 0)) errores.tamanoFragmento = 'error_fragmento';
  const r = entero(f.reintentos);
  if (Number.isNaN(r) || r > 20) errores.reintentos = 'error_reintentos';
  const p = entero(f.porcentajeParcial);
  if (Number.isNaN(p) || p < 20 || p > 30) errores.porcentajeParcial = 'error_porcentaje';
  return errores;
}

export function aDTO(f: FormDistribucion): CrearDistribucionOtaDTO {
  return {
    id_version_modelo: Number(f.idVersion),
    lista_dispositivos_objetivo: f.dispositivos,
    modo_distribucion: f.modo,
    ventana_inicio: f.ventanaInicio ? new Date(f.ventanaInicio).toISOString() : null,
    ventana_fin: f.ventanaFin ? new Date(f.ventanaFin).toISOString() : null,
    nivel_bateria_minimo: f.bateriaMinima.trim() === '' ? null : Number(f.bateriaMinima),
    tamano_fragmento_bytes: Number(f.tamanoFragmento),
    max_reintentos_descarga: Number(f.reintentos),
    porcentaje_parcial: Number(f.porcentajeParcial),
  };
}

/** Agrega o quita un dispositivo conservando el orden de selección (el primero es el canary). */
export function alternarDispositivo(seleccion: number[], id: number): number[] {
  return seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id];
}
