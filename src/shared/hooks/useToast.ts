import { useSyncExternalStore } from 'react';
import i18n from '../i18n';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

const AUTO_DISMISS: Record<ToastVariant, number | null> = {
  success: 4000,
  info: 6000,
  warning: null,
  error: null,
};

/** Límite de carga cognitiva del DS (CLAUDE.md): máximo 3 visibles. */
const MAX_TOASTS = 3;

/*
 * Cola global (T-02 del reporte UAT): solo 2 de 10 creaciones confirmaban algo.
 * Es un store de módulo y no un Context para que los hooks de cada módulo
 * puedan avisar el éxito sin que cada página monte un proveedor; `ToastHost`
 * lo pinta una sola vez en App.
 */
let toasts: Toast[] = [];
let ultimoId = 0;
const oyentes = new Set<() => void>();

function emitir(siguiente: Toast[]) {
  toasts = siguiente;
  oyentes.forEach((o) => o());
}

export function dismissToast(id: string) {
  emitir(toasts.filter((t) => t.id !== id));
}

export function pushToast(variant: ToastVariant, title: string, description?: string): string {
  const id = String(++ultimoId);
  emitir([...toasts, { id, variant, title, description }].slice(-MAX_TOASTS));
  const delay = AUTO_DISMISS[variant];
  if (delay !== null) setTimeout(() => dismissToast(id), delay);
  return id;
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
  const lista = useSyncExternalStore(suscribir, () => toasts, () => toasts);
  return { toasts: lista, push: pushToast, dismiss: dismissToast };
}
