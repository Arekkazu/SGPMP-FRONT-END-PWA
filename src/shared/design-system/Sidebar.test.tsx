// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-20: el menú lee los permisos de la sesión (cualquiera de los del módulo) |
/**
 * #132 — los items del sidebar eran <button>, nunca <a>, así que su rol
 * accesible nunca era "link" pese a navegar a otra vista (confirmado también
 * en escritorio, donde no hay excusa de espacio). Este test fija ese
 * contrato: rol de navegación, no de botón.
 */
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

let permisos: Array<{ id_recurso: number; id_accion: number }> = [];
const ADMIN = [1, 2, 6, 8, 29, 33, 18, 52].map((r) => ({ id_recurso: r, id_accion: 2 }));

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ userInfo: { nombre: 'Ana', apellidos: 'Ruiz', nombre_rol: 'Administrador' }, permisos }),
}));

vi.mock('../contexto/useContexto', () => ({
  useContexto: () => ({ contexto: null }),
}));

function renderSidebar(props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Sidebar {...props} />
    </MemoryRouter>
  );
}

describe('Sidebar — #132 marcado semántico y navegación móvil', () => {
  beforeEach(() => {
    permisos = ADMIN;
  });

  it('los items de navegación son <a> (rol link), no botones', () => {
    renderSidebar();

    const item = screen.getByRole('link', { name: /usuarios/i });
    expect(item.tagName).toBe('A');
    expect(item).toHaveAttribute('href', '/usuarios');
    expect(screen.queryByRole('button', { name: /usuarios/i })).not.toBeInTheDocument();
  });

  it('el logout sigue siendo un botón real (no navega a una ruta)', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it('al navegar por un item habilitado, avisa para cerrar el drawer móvil (#132)', async () => {
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate });

    await userEvent.click(screen.getByRole('link', { name: /usuarios/i }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('un módulo sin permiso no aparece en el menú (M9-10)', () => {
    permisos = [];
    renderSidebar();

    expect(screen.queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument();
    // Lo que no exige permiso sigue visible.
    expect(screen.getByRole('link', { name: /dashboard|panel/i })).toBeInTheDocument();
  });

  it('T-20: Predicción aparece con cualquiera de sus permisos, no solo con Patologías', () => {
    // Productor: solo el Historial diagnóstico (42). Antes no veía el módulo y lo abría por URL.
    permisos = [{ id_recurso: 42, id_accion: 2 }];
    renderSidebar();

    expect(screen.getByRole('link', { name: /predicci/i })).toHaveAttribute('href', '/prediccion');
    expect(screen.queryByRole('link', { name: /telemetr/i })).not.toBeInTheDocument();
  });
});
