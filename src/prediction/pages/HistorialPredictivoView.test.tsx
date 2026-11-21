// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-106: TVCO, pendientes y acceso al formulario de retroalimentación |
// | 2026-11-20 | Arekkazu | QA-M08 CU04 H-02 RF-106: la marca de la evaluación queda sobre su predicción |
// | 2026-11-21 | Arekkazu | INC-M08-387-G020/391-G024 RF-106: eje en el rango elegido, zoom y límite de marcadores |
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  HistorialPredictivoView, LIMITE_MARCADORES, marcadoresVisibles, moverVentana, puntosDelHistorial, rangoDelEje,
} from './HistorialPredictivoView';
import { historialPredictivoApi } from '../api/historialPredictivoApi';
import { reportesApi } from '../../reportes/api/reportesApi';

vi.mock('../../reportes/api/reportesApi', () => ({ reportesApi: { opciones: vi.fn(), generar: vi.fn(), descargar: vi.fn() } }));
vi.mock('../api/historialPredictivoApi', () => ({ historialPredictivoApi: { consultar: vi.fn() } }));
vi.mock('recharts', async () => {
  const real = await vi.importActual<typeof import('recharts')>('recharts');
  return { ...real, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 600, height: 300 }}>{children}</div> };
});

describe('Historial clínico predictivo (RF-106)', () => {
  it('muestra la TVCO y lleva al formulario de retroalimentación con la predicción', async () => {
    vi.mocked(reportesApi.opciones).mockResolvedValue([{ valor: 7, etiqueta: 'BOV-7 · Bovino' }]);
    vi.mocked(historialPredictivoApi.consultar).mockResolvedValue({
      activo: { id_activo_biologico: 7, identificador: 'BOV-7', especie: 'Bovino', finca: 'La Esperanza', estado: 'ACTIVO' },
      rango_fechas_aplicado: { fecha_inicio: '2025-11-18', fecha_fin: '2026-11-18' }, ventana_correspondencia_horas: 12,
      modo_visualizacion: 'LINEAL', predicciones: [], eventos_sanitarios: [], retroalimentaciones: [], grupos: [],
      correspondencias: [],
      tvco: { porcentaje: 75, texto: '75% (4 validadas; 1 excluida: sin retro)', tvco_denominador: 4,
              tvco_excluidas_conflicto: 0, excluidas_sin_retroalimentacion: 1, tasa_error: 25 },
      pendientes: { total: 1, pagina: 1, por_pagina: 20, items: [
        { id_resultado_inferencia: 'abc', fecha_inferencia: '2026-11-10T12:00:00Z', nivel_riesgo: 3, condicion: 'Mastitis' }] },
      metadatos: { total_inferencias: 5, total_eventos_sanitarios: 0, total_retroalimentaciones: 4, total_pendientes: 1, total_conflictos: 0 },
      fuentes_no_disponibles: [], mensaje: null,
    });
    let ruta = '';
    render(
      <MemoryRouter initialEntries={['/prediccion/historial-predictivo']}>
        <HistorialPredictivoView />
        <Route path="*" render={({ location }) => { ruta = location.pathname + location.search; return null; }} />
      </MemoryRouter>,
    );
    const campo = await screen.findByRole('combobox', { name: /Animal o lote/ });
    await vi.waitFor(() => expect(reportesApi.opciones).toHaveBeenCalledWith('activo'));
    await new Promise((r) => setTimeout(r, 0));
    fireEvent.change(campo, { target: { value: 'BOV-7 · Bovino' } });
    expect(await screen.findByText('75% (4 validadas; 1 excluida: sin retro)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar retroalimentación' }));
    expect(ruta).toBe('/prediccion/retroalimentacion?resultado=abc&activo=7');
  });
});

it('la marca de cada evaluación queda sobre el punto de su predicción, no en la fecha en que se evaluó', () => {
  const { retros } = puntosDelHistorial({
    predicciones: [{ tipo: 'PREDICCION', fecha: '2026-11-15T21:13:00Z', id_resultado_inferencia: 'p1', nivel_riesgo: 1 }],
    retroalimentaciones: [
      { tipo: 'RETROALIMENTACION', fecha: '2026-11-20T23:54:00Z', id_resultado_inferencia: 'p1', valoracion: 'CORRECTO' },
      { tipo: 'RETROALIMENTACION', fecha: '2026-11-20T23:55:00Z', id_resultado_inferencia: 'oculta', valoracion: 'PARCIAL' },
    ],
    eventos_sanitarios: [],
  } as unknown as Parameters<typeof puntosDelHistorial>[0]);

  expect(retros[0]).toMatchObject({ x: new Date('2026-11-15T21:13:00Z').getTime(), y: 1.3, valoracion: 'CORRECTO' });
  // Si su predicción no está a la vista (filtro de nivel), queda en la franja de evaluaciones en su fecha.
  expect(retros[1]).toMatchObject({ x: new Date('2026-11-20T23:55:00Z').getTime(), y: 3.3 });
});

it('el eje X va del inicio del día «Desde» al final del día «Hasta», no del primer al último dato', () => {
  const [a, b] = rangoDelEje({ rango_fechas_aplicado: { fecha_inicio: '2025-11-20', fecha_fin: '2026-11-20' } } as Parameters<typeof rangoDelEje>[0]);
  expect(a).toBe(new Date('2025-11-20T00:00:00').getTime());
  expect(b).toBe(new Date('2026-11-20T23:59:59.999').getTime());
  // El 1/7/2026 queda cerca del 61 % del ancho (criterio de QA G020).
  expect((new Date('2026-07-01T12:00:00').getTime() - a) / (b - a)).toBeCloseTo(0.61, 2);
});

it('acercar, alejar y desplazar no salen del rango consultado', () => {
  const rango: [number, number] = [0, 1000 * 3_600_000];
  const cerca = moverVentana(rango, rango, 'acercar');
  expect(cerca).toEqual([250 * 3_600_000, 750 * 3_600_000]);
  expect(moverVentana(cerca, rango, 'antes')).toEqual([0, 500 * 3_600_000]);
  expect(moverVentana([0, 500 * 3_600_000], rango, 'antes')).toEqual([0, 500 * 3_600_000]);
  expect(moverVentana(cerca, rango, 'alejar')).toEqual(rango);
});

it('con más de 1.000 marcadores muestrea la línea y deja todos los eventos y evaluaciones', () => {
  const serie = (n: number) => Array.from({ length: n }, (_, i) => ({ x: i }));
  const todo = { linea: serie(1460), eventos: serie(240), retros: serie(300) };
  const dibujo = marcadoresVisibles(todo, [0, 5000]);
  expect(dibujo.eventos).toHaveLength(240);
  expect(dibujo.retros).toHaveLength(300);
  expect(dibujo.linea.length + dibujo.eventos.length + dibujo.retros.length).toBeLessThanOrEqual(LIMITE_MARCADORES);
  expect(dibujo.omitidas).toBe(1460 - dibujo.linea.length);
  // Al acercar la ventana a una parte, esa parte se ve completa.
  expect(marcadoresVisibles(todo, [0, 99]).linea).toHaveLength(100);
  // Con 1.000 o menos, todos.
  expect(marcadoresVisibles({ linea: serie(500), eventos: serie(250), retros: serie(250) }, [0, 5000]).omitidas).toBe(0);
});
