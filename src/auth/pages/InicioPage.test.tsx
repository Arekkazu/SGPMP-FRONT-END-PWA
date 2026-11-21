// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-20 | Arekkazu | INICIO SIGAB: portada sin backend, enlaces de entrada, app instalada y nada animado escondido |
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { InicioPage, esAppInstalada } from './InicioPage';
import { STORAGE_KEY } from '../../shared/tema/tema';

const guardarTema = vi.fn();
vi.mock('../../configuration/api/personalizacionApi', () => ({ temaVisualApi: { guardar: (...a: unknown[]) => guardarTema(...a) } }));

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
  vi.unstubAllGlobals();
});

function renderInicio() {
  return render(<MemoryRouter><InicioPage /></MemoryRouter>);
}

test('lleva a crear la cuenta y a entrar, con un solo h1', () => {
  renderInicio();

  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  for (const enlace of screen.getAllByRole('link', { name: /crear mi cuenta/i })) {
    expect(enlace).toHaveAttribute('href', '/registro');
  }
  expect(screen.getByRole('link', { name: /^entrar$/i })).toHaveAttribute('href', '/login');
});

test('sin sesión, el tema se cambia en el navegador sin llamar al backend', async () => {
  renderInicio();

  await userEvent.click(screen.getByRole('button', { name: /modo oscuro/i }));

  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  expect(screen.getByRole('button', { name: /modo claro/i })).toBeInTheDocument();
  expect(guardarTema).not.toHaveBeenCalled();
});

test('al abrir, aplica el tema que el navegador recuerda', () => {
  localStorage.setItem(STORAGE_KEY, 'dark');
  renderInicio();

  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(screen.getByRole('button', { name: /modo claro/i })).toBeInTheDocument();
});

test('sin aviso de scroll del navegador, nada de lo animado queda escondido', () => {
  // jsdom no trae IntersectionObserver: los avisos y la sincronización se marcan vistos de una vez.
  const { container } = renderInicio();

  expect(container.querySelectorAll('[data-visto="true"]')).toHaveLength(2);
});

test('reconoce la app instalada para mandarla directo al login', () => {
  vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta === '(display-mode: standalone)' }));
  expect(esAppInstalada()).toBe(true);

  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  expect(esAppInstalada()).toBe(false);
});
