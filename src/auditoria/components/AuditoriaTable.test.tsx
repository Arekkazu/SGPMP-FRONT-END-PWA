/**
 * #135 (parte 2) — al filtrar Auditoría por un ID de usuario inexistente, el
 * mensaje de "sin resultados" se pintaba como texto plano sin ningún
 * role/aria-live: un lector de pantalla no tenía forma de saber que el
 * filtro terminó y no encontró nada.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuditoriaTable } from './AuditoriaTable';

describe('AuditoriaTable — #135 estado "sin resultados" anunciado', () => {
  it('anuncia con role="status" cuando el filtro no encuentra eventos', () => {
    render(
      <AuditoriaTable eventos={[]} loading={false} onVerificar={() => {}} tiposEvento={[]} />
    );

    expect(screen.getByRole('status')).toHaveTextContent(/no se encontraron/i);
  });
});
