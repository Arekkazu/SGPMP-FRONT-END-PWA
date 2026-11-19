// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107 CA-05: el modal crítico no se cierra con Escape ni con clic afuera |
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModalShell } from './ModalShell';

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
});
