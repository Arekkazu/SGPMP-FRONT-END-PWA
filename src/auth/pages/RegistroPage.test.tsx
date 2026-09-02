import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { RegistroPage } from './RegistroPage';

const { registrarMock, useRegistroMock } = vi.hoisted(() => ({
  registrarMock: vi.fn(),
  useRegistroMock: vi.fn(),
}));

vi.mock('../hooks/useRegistro', () => ({
  useRegistro: () => useRegistroMock(),
}));

vi.mock('../config/recaptcha', () => ({
  recaptchaConfigured: true,
  recaptchaSiteKey: 'site-key-prueba',
}));

vi.mock('../components/RecaptchaField', () => ({
  RecaptchaField: ({
    siteKey,
    error,
    onTokenChange,
  }: {
    siteKey: string;
    error?: string | null;
    onTokenChange: (token: string) => void;
  }) => (
    <div data-site-key={siteKey}>
      <button type="button" onClick={() => onTokenChange('captcha-token-prueba')}>
        Resolver CAPTCHA
      </button>
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

function renderRegistro() {
  return render(
    <MemoryRouter>
      <RegistroPage />
    </MemoryRouter>,
  );
}

async function completarPasoPersonal() {
  fireEvent.change(screen.getByLabelText(/Número de identificación/i), {
    target: { value: '1234567890' },
  });
  fireEvent.change(screen.getByLabelText(/Nombres/i), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText(/Apellidos/i), { target: { value: 'Pérez' } });
  fireEvent.change(screen.getByLabelText(/Fecha de nacimiento/i), {
    target: { value: '1990-01-01' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
  await screen.findByText(/Paso 2 de 2/i);
}

function completarCredenciales() {
  fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
    target: { value: 'ana@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/^Contraseña/i), {
    target: { value: 'Segura1!' },
  });
  fireEvent.change(screen.getByLabelText(/Confirmar contraseña/i), {
    target: { value: 'Segura1!' },
  });
}

beforeEach(() => {
  registrarMock.mockReset();
  useRegistroMock.mockReturnValue({
    registrar: registrarMock,
    loading: false,
    error: null,
    success: false,
    online: true,
  });
});

test('envía captcha_token y bloquea el registro hasta resolver el desafío', async () => {
  registrarMock.mockResolvedValue(true);
  renderRegistro();
  await completarPasoPersonal();
  completarCredenciales();

  const submit = screen.getByRole('button', { name: 'Registrarse' });
  expect(submit).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Resolver CAPTCHA' }));
  expect(submit).toBeEnabled();
  fireEvent.click(submit);

  await waitFor(() => expect(registrarMock).toHaveBeenCalledTimes(1));
  expect(registrarMock).toHaveBeenCalledWith(expect.objectContaining({
    correo_electronico: 'ana@example.com',
    captcha_token: 'captcha-token-prueba',
  }));
});

test('invalida el token después de un envío rechazado', async () => {
  registrarMock.mockResolvedValue(false);
  renderRegistro();
  await completarPasoPersonal();
  completarCredenciales();
  fireEvent.click(screen.getByRole('button', { name: 'Resolver CAPTCHA' }));
  fireEvent.click(screen.getByRole('button', { name: 'Registrarse' }));

  await screen.findByText('Completa nuevamente la verificación antes de reintentar.');
  expect(screen.getByRole('button', { name: 'Registrarse' })).toBeDisabled();
});
