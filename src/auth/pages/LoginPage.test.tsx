import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { LoginPage } from './LoginPage';
import type { ApiError } from '../../shared/api/errors';

const useLoginMock = vi.fn();
vi.mock('../hooks/useLogin', () => ({ useLogin: () => useLoginMock() }));

// `ssoConfigurado` se resuelve al importar el modulo desde import.meta.env, asi
// que la unica forma de cubrir los dos ambientes (con y sin URL) es mockearlo.
const sso = vi.hoisted(() => ({
  agrofusionLoginUrl: 'https://identidad.agrofusion.test/login',
  ssoConfigurado: true,
}));
vi.mock('../config/sso', () => sso);

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

test('avisa cuando el interceptor cerró la sesión antes de llegar a /login', () => {
  sessionStorage.setItem('sgpmp:sesion-cerrada', '1');

  renderConError(null);

  expect(screen.getByText(/sesión cerrada/i)).toBeInTheDocument();
  expect(sessionStorage.getItem('sgpmp:sesion-cerrada')).toBeNull();
});

test('no muestra el aviso de sesión cerrada en un login normal', () => {
  sessionStorage.clear();

  renderConError(null);

  expect(screen.queryByText(/sesión cerrada/i)).toBeNull();
});

// TC-DIS-05: el botón y el separador estaban en la línea base visual y no se
// renderizaban, pese a que el canje del token SSO ya existía.
describe('SSO con AgroFusion', () => {
  const BOTON = /continuar con agrofusion/i;

  afterEach(() => {
    sso.ssoConfigurado = true;
  });

  test('lleva al proveedor de identidad al pulsarlo', async () => {
    const asignarHref = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { set href(v: string) { asignarHref(v); }, replace: vi.fn() },
    });

    renderConError(null);
    await userEvent.click(screen.getByRole('button', { name: BOTON }));

    expect(asignarHref).toHaveBeenCalledWith(sso.agrofusionLoginUrl);
  });

  test('sin URL configurada queda deshabilitado y dice por qué', () => {
    sso.ssoConfigurado = false;

    renderConError(null);

    expect(screen.getByRole('button', { name: BOTON })).toBeDisabled();
    expect(screen.getByText(/configuración pendiente/i)).toBeInTheDocument();
  });
});
