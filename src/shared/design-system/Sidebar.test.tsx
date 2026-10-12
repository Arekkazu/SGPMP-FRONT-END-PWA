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

let permisoConcedido = true;
vi.mock('../rbac/usePermission', () => ({
  usePermission: () => permisoConcedido,
}));

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ userInfo: { nombre: 'Ana', apellidos: 'Ruiz', nombre_rol: 'Administrador' } }),
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
    permisoConcedido = true;
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

  it('un item sin permiso queda marcado aria-disabled y no dispara onNavigate', async () => {
    permisoConcedido = false;
    const onNavigate = vi.fn();
    renderSidebar({ onNavigate });

    const item = screen.getByRole('link', { name: /usuarios/i });
    expect(item).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(item);

    expect(onNavigate).not.toHaveBeenCalled();
  });
});
