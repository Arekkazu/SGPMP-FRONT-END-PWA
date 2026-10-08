/**
 * QA M09 TC-DIS-78: reordenar widgets debe poder hacerse con teclado. Un clic
 * (o Enter) en un widget colocado lo selecciona; la celda vacía siguiente lo
 * mueve, y "Quitar del dashboard" lo saca. Antes el clic lo quitaba sin más.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DashboardLayoutResponse, WidgetCatalogoItem } from '../types';
import { DashboardLayoutSection } from './DashboardLayoutSection';

vi.mock('../../shared/rbac/usePermission', () => ({ usePermission: () => true }));
vi.mock('../../shared/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

const CATALOGO: WidgetCatalogoItem[] = [
  { id_widget: 1, clave: 'temp_galpon', nombre: 'Temperatura galpón', grupo: 'Ambiente', span_predeterminado: 1 },
];

const LAYOUT: DashboardLayoutResponse = {
  id_dashboard_layout: 1, id_usuario: 1, fecha_actualizacion: null, version_perfil: 1,
  active_widget: ['temp_galpon'],
  grid: [{ id_widget: 1, posicion_fila: 1, posicion_columna: 1, span_columnas: 1, visible: true, orden: 0 }],
};

vi.mock('../hooks/useDashboardLayout', () => ({
  useDashboardLayout: () => ({
    layout: LAYOUT, catalogo: CATALOGO, loading: false, saving: false, error: null, saveError: null,
    cargar: vi.fn(), guardar: vi.fn(), restaurar: vi.fn(),
  }),
}));

describe('DashboardLayoutSection — mover y quitar widgets (TC-DIS-78)', () => {
  it('selecciona el widget colocado y lo mueve a otra celda, anunciándolo', () => {
    render(<DashboardLayoutSection />);

    const widget = screen.getByRole('button', { name: /^Temperatura galpón, fila 1 columna 1/ });
    fireEvent.click(widget);
    expect(widget).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Mover Temperatura galpón a fila 2 columna 3' }));

    expect(screen.getByRole('button', { name: /^Temperatura galpón, fila 2 columna 3/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Celda vacía, fila 1 columna 1' })).toBeInTheDocument();
    expect(screen.getByText('Temperatura galpón movido a fila 2 columna 3.')).toBeInTheDocument();
  });

  it('quita el widget solo con la acción explícita', () => {
    render(<DashboardLayoutSection />);

    fireEvent.click(screen.getByRole('button', { name: /^Temperatura galpón, fila 1 columna 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar del dashboard' }));

    expect(screen.queryByRole('button', { name: /^Temperatura galpón, fila/ })).toBeNull();
    expect(screen.getByText('Temperatura galpón quitado del dashboard.')).toBeInTheDocument();
  });
});
