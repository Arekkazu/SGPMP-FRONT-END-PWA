// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107 CA-05: el modal crítico no se cierra con Escape ni con clic afuera |
// | 2026-11-21 | Arekkazu | INC-M08-392-G027/385-G026 RF-107: no se abre con una operación en curso y queda en el historial |
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModalShell } from './ModalShell';
import { iniciarOperacion } from '../hooks/operacionEnCurso';
import { limpiarToasts, useToast } from '../hooks/useToast';
import { renderHook } from '@testing-library/react';

describe('Modal de acción crítica (RF-107 tipo 5)', () => {
  it('bloqueante: ni Escape, ni clic afuera, ni botón de cerrar', () => {
    const onClose = vi.fn();
    render(<ModalShell bloqueante title="¿Confirmas el cierre?" onClose={onClose}><p>Irreversible</p></ModalShell>);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
  });

  it('un modal común se sigue cerrando con Escape', () => {
    const onClose = vi.fn();
    render(<ModalShell title="Detalle" onClose={onClose}><p>Contenido</p></ModalShell>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('con una operación en curso la acción crítica no se abre y pide esperar (8.2 nivel 1)', () => {
    limpiarToasts();
    const terminar = iniciarOperacion('el cierre del período');
    const onClose = vi.fn();
    render(<ModalShell bloqueante title="Revocar" onClose={onClose}><p>Definitiva</p></ModalShell>);
    terminar();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts.map((t) => t.title)).toEqual(['Espera a que finalice el cierre del período antes de continuar.']);
  });

  it('sin operación en curso se abre y queda en el historial de la sesión como bloqueante (8.5)', () => {
    limpiarToasts();
    const { unmount } = render(<ModalShell bloqueante title="Revocar" onClose={vi.fn()}><p>Definitiva</p></ModalShell>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();
    const { result } = renderHook(() => useToast());
    expect(result.current.historial).toEqual([expect.objectContaining({ title: 'Revocar', bloquea_interfaz: true, estado: 'cerrado' })]);
  });
});
