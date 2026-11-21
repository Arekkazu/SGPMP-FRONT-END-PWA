// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-21 | Arekkazu | INC-M08-392-G027 RF-107: el indicador aparece pasados 3 s |
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ProcesoEnCurso } from './ProcesoEnCurso';

afterEach(() => { vi.useRealTimers(); });

test('una operación de 3 s o menos no muestra el indicador; pasados 3 s sí (8.5 paso 3)', () => {
  vi.useFakeTimers();
  render(<ProcesoEnCurso mensaje="Generando el reporte..." />);
  act(() => { vi.advanceTimersByTime(3000); });
  expect(screen.queryByRole('status')).toBeNull();
  act(() => { vi.advanceTimersByTime(1); });
  expect(screen.getByRole('status')).toHaveTextContent('Generando el reporte...');
});
