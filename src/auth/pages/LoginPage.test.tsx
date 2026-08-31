import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { LoginPage } from './LoginPage';
import type { ApiError } from '../../shared/api/errors';

const useLoginMock = vi.fn();
vi.mock('../hooks/useLogin', () => ({ useLogin: () => useLoginMock() }));

function renderConError(error: ApiError | null) {
  useLoginMock.mockReturnValue({ login: vi.fn(), loading: false, error, online: true });
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

const ENLACE = /reenviar correo de activación/i;

test('ofrece reenviar la activación cuando la cuenta está pendiente', () => {
  renderConError({ code: 'CUENTA_PENDIENTE', message: 'Su cuenta no ha sido activada.', status: 403 });

  expect(screen.getByRole('link', { name: ENLACE })).toHaveAttribute('href', '/reenviar-activacion');
});

test('no ofrece el reenvío para otros errores de login', () => {
  renderConError({ code: 'CREDENCIALES_INVALIDAS', message: 'Correo o contraseña incorrectos.', status: 401 });

  expect(screen.queryByRole('link', { name: ENLACE })).toBeNull();
});
