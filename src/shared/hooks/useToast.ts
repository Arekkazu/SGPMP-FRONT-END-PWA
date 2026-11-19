// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107: un solo éxito de 5 s, errores en cola de 3, saturación e historial de la sesión |
import { useSyncExternalStore } from 'react';
import i18n from '../i18n';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface AccionToast {
  texto: string;
  /** Ruta interna del front a la que lleva el botón (sin la base). */
  ruta: string;
}

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  /** RF-107 8.3: misma operación → se actualiza el aviso visible en vez de apilar otro. */
  idOperacion?: string;
  accion?: AccionToast;
}

export interface RegistroToast extends Toast {
  creado: number;
  estado: 'activo' | 'en_cola' | 'cerrado' | 'expirado';
}

export interface OpcionesToast {
  idOperacion?: string;
  accion?: AccionToast;
}

/** RF-107 tipo 1: el éxito se ve 5 s; errores y advertencias quedan hasta que el usuario los cierre. */
const AUTO_DISMISS: Record<ToastVariant, number | null> = {
  success: 5000,
  info: 6000,
  warning: null,
  error: null,
};

/** RF-107 8.2: máximo 3 avisos de error visibles; los demás esperan en cola (FIFO). */
export const MAX_ERRORES_VISIBLES = 3;
/** RF-107 8.3: con más de 5 entre visibles y en cola se muestra el aviso de saturación. */
export const UMBRAL_SATURACION = 5;

/*
 * Cola global (T-02 del reporte UAT): store de módulo para que los hooks de cada módulo avisen sin montar un
 * proveedor; `ToastHost` la pinta una sola vez en App.
 *
 * RF-107: el éxito es uno solo (uno nuevo reemplaza al anterior y reinicia los 5 s); los errores se encolan de a
 * 3 visibles; el historial de la sesión guarda todo lo mostrado para el panel del aviso de saturación.
 */
let visibles: Toast[] = [];
let cola: Toast[] = [];
let historial: RegistroToast[] = [];
let ultimoId = 0;
let estado = { visibles, cola, historial };
const temporizadores = new Map<string, ReturnType<typeof setTimeout>>();
const oyentes = new Set<() => void>();

function emitir() {
  estado = { visibles, cola, historial };
  oyentes.forEach((o) => o());
}

function marcar(id: string, nuevo: RegistroToast['estado']) {
  historial = historial.map((h) => (h.id === id ? { ...h, estado: nuevo } : h));
}

function programar(t: Toast) {
  const delay = AUTO_DISMISS[t.variant];
  clearTimeout(temporizadores.get(t.id));
  if (delay !== null) temporizadores.set(t.id, setTimeout(() => cerrar(t.id, 'expirado'), delay));
}

function esPersistente(t: Toast) {
  return t.variant === 'error' || t.variant === 'warning';
}

function promover() {
  while (cola.length && visibles.filter(esPersistente).length < MAX_ERRORES_VISIBLES) {
    const [siguiente, ...resto] = cola;
    cola = resto;
    visibles = [...visibles, siguiente];
    marcar(siguiente.id, 'activo');
  }
}

function cerrar(id: string, como: 'cerrado' | 'expirado') {
  clearTimeout(temporizadores.get(id));
  temporizadores.delete(id);
  visibles = visibles.filter((t) => t.id !== id);
  marcar(id, como);
  promover();
  emitir();
}

export function dismissToast(id: string) {
  cerrar(id, 'cerrado');
}

export function pushToast(variant: ToastVariant, title: string, description?: string,
                          opciones: OpcionesToast = {}): string {
  const { idOperacion, accion } = opciones;
  if (idOperacion) {
    const visible = visibles.find((t) => t.idOperacion === idOperacion);
    if (visible) {
      // Misma operación: se actualiza el aviso que ya se ve.
      const actualizado = { ...visible, variant, title, description, accion };
      visibles = visibles.map((t) => (t.id === visible.id ? actualizado : t));
      programar(actualizado);
      emitir();
      return visible.id;
    }
    if (cola.some((t) => t.idOperacion === idOperacion)) return cola.find((t) => t.idOperacion === idOperacion)!.id;
    if (historial.some((h) => h.idOperacion === idOperacion && h.estado === 'cerrado')) return '';
  }
  const toast: Toast = { id: String(++ultimoId), variant, title, description, idOperacion, accion };
  if (variant === 'success') {
    // Un solo éxito a la vez: el nuevo reemplaza al anterior y reinicia el temporizador.
    visibles.filter((t) => t.variant === 'success').forEach((t) => {
      clearTimeout(temporizadores.get(t.id));
      marcar(t.id, 'cerrado');
    });
    visibles = [...visibles.filter((t) => t.variant !== 'success'), toast];
  } else if (esPersistente(toast) && visibles.filter(esPersistente).length >= MAX_ERRORES_VISIBLES) {
    cola = [...cola, toast];
  } else {
    visibles = [...visibles, toast];
  }
  historial = [...historial, { ...toast, creado: Date.now(), estado: cola.includes(toast) ? 'en_cola' : 'activo' }];
  if (!cola.includes(toast)) programar(toast);
  emitir();
  return toast.id;
}

/** Cierra sesión: el historial y la cola no pasan a otro usuario (RF-107 8.3). */
export function limpiarToasts() {
  temporizadores.forEach((t) => clearTimeout(t));
  temporizadores.clear();
  visibles = [];
  cola = [];
  historial = [];
  emitir();
}

export type Exito = 'registrado' | 'guardado' | 'desactivado' | 'reactivado' | 'eliminado' | 'estado' | 'pendiente_sync';

/** Confirma una mutación exitosa con un patrón fijo: "Registrado correctamente" + el nombre. */
export function avisarExito(tipo: Exito, nombre?: string | null) {
  pushToast('success', i18n.t(`exito.${tipo}`, { ns: 'common' }), nombre ?? undefined);
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

export function useToast() {
  const actual = useSyncExternalStore(suscribir, () => estado, () => estado);
  const pendientes = actual.visibles.filter(esPersistente).length + actual.cola.length;
  return {
    toasts: actual.visibles,
    cola: actual.cola,
    historial: actual.historial,
    saturado: pendientes > UMBRAL_SATURACION,
    pendientes,
    push: pushToast,
    dismiss: dismissToast,
  };
}
