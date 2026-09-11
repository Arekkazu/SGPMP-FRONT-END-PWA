import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { RecaptchaField } from './RecaptchaField';

const { recaptchaPropsMock } = vi.hoisted(() => ({
  recaptchaPropsMock: vi.fn(),
}));

vi.mock('react-google-recaptcha', () => ({
  default: (props: Record<string, unknown>) => {
    recaptchaPropsMock(props);
    return <div data-testid="google-recaptcha" />;
  },
}));

beforeEach(() => {
  recaptchaPropsMock.mockClear();
  localStorage.clear();
});

test('configura reCAPTCHA v2 en español y entrega el token', () => {
  const onTokenChange = vi.fn();
  const onExpired = vi.fn();
  const onErrored = vi.fn();

  render(
    <RecaptchaField
      siteKey="site-key-publica"
      onTokenChange={onTokenChange}
      onExpired={onExpired}
      onErrored={onErrored}
    />,
  );

  expect(screen.getByTestId('google-recaptcha')).toBeInTheDocument();
  const props = recaptchaPropsMock.mock.lastCall?.[0] as {
    sitekey: string;
    hl: string;
    theme: string;
    onChange: (token: string | null) => void;
  };
  expect(props).toMatchObject({
    sitekey: 'site-key-publica',
    hl: 'es',
    theme: 'light',
  });

  act(() => props.onChange('token-google'));
  expect(onTokenChange).toHaveBeenCalledWith('token-google');
});

test('falla cerrado y no renderiza Google si falta la site key', () => {
  render(
    <RecaptchaField
      siteKey=""
      onTokenChange={vi.fn()}
      onExpired={vi.fn()}
      onErrored={vi.fn()}
    />,
  );

  expect(screen.queryByTestId('google-recaptcha')).toBeNull();
  expect(screen.getByRole('alert')).toHaveTextContent('Verificación de seguridad no configurada');
});
