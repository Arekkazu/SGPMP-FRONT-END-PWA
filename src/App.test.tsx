import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

// Evita que el bootstrap de AuthContext dispare un POST /sesiones/refresh
// real (sin servidor en el entorno de test, solo generaría ruido en stderr).
vi.mock('./shared/api/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./shared/api/http')>();
  return { ...actual, refreshAccessToken: vi.fn().mockRejectedValue(new Error('sin sesión en test')) };
});

test('renders without crashing', async () => {
  const { baseElement, unmount } = render(<App />);
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
  expect(baseElement).toBeDefined();
  unmount();
});
