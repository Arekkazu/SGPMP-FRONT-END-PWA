// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-21 | Arekkazu | PAGINA 404: la dirección inexistente se muestra, «Regresar» solo con página anterior y tema solo sin sesión |
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Switch, useHistory } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { NoEncontradoPage } from './NoEncontradoPage';

const sesion = { token: null as string | null, sesionOffline: false, isBootstrapping: false };
vi.mock('../auth/useAuth', () => ({ useAuth: () => sesion }));

afterEach(() => {
  sesion.token = null;
  document.documentElement.removeAttribute('data-theme');
});

function renderEn(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Switch>
        <Route exact path="/" render={() => <EnlaceRoto />} />
        <Route component={NoEncontradoPage} />
      </Switch>
    </MemoryRouter>,
  );
}

function EnlaceRoto() {
  const history = useHistory();
  return <button type="button" onClick={() => history.push('/potrero-x')}>ir</button>;
}

test('muestra la dirección buscada y lleva al inicio, sin «Regresar» si se abrió directo', () => {
  renderEn('/no-existe?x=1');

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/potrero/i);
  expect(screen.getByText('/no-existe?x=1')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /volver al inicio/i })).toHaveAttribute('href', '/');
  expect(screen.queryByRole('button', { name: /regresar/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /modo oscuro/i })).toBeInTheDocument();
});

test('«Regresar» aparece al llegar navegando dentro de la app; con sesión no cambia el tema', async () => {
  sesion.token = 'jwt';
  renderEn('/');
  await userEvent.click(screen.getByRole('button', { name: 'ir' }));

  expect(screen.getByRole('button', { name: /regresar/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /modo/i })).not.toBeInTheDocument();
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
});
