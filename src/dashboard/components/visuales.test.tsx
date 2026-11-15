// | Fecha      | Nombre   | Que se hizo                                                |
// |------------|----------|------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: semáforo legible sin números y sin códigos crudos |
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Visual } from './visuales';

describe('Visuales del dashboard (RF-103)', () => {
  it('el semáforo dice el estado general en palabras, no solo en color (CA-7)', () => {
    render(<Visual visual="semaforo" clave="semaforo_areas" datos={{ areas: [
      { id_infraestructura: 1, nombre: 'Galpón 1', estado: 'VERDE' },
      { id_infraestructura: 2, nombre: 'Galpón 2', estado: 'ROJO' },
      { id_infraestructura: 3, nombre: 'Estanque', estado: 'SIN_DATOS' },
    ] }} />);
    expect(screen.getAllByText('Crítico')).toHaveLength(2); // general + Galpón 2
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });

  it('las listas traducen los códigos de alerta y nunca los muestran crudos', () => {
    render(<MemoryRouter><Visual visual="lista" clave="alertas" datos={{ total: 1, items: [
      { id_alerta: 1, tipo: 'FIEBRE', severidad: 'CRITICO', area: 'Potrero 2', valor: 40.3, unidad: '°C',
        fecha_generacion: '2026-11-14T15:00:00Z' },
    ] }} /></MemoryRouter>);
    expect(screen.getByText(/Fiebre · Potrero 2/)).toBeInTheDocument();
    expect(screen.queryByText(/FIEBRE|CRITICO/)).toBeNull();
  });

  it('una lista sin pendientes es una buena noticia, no un error', () => {
    render(<Visual visual="lista" clave="precios_por_vencer" datos={{ total: 0, items: [] }} />);
    expect(screen.getByText('Nada pendiente por ahora.')).toBeInTheDocument();
  });

  it('el valor del inventario por método muestra el desglose en pesos', () => {
    render(<Visual visual="cifra" clave="valor_inventario" datos={{ vista: 'POR_METODO', valor_total: 1500000,
      activos: 2, valor_razonable: 1000000, valor_costo: 500000 }} />);
    expect(screen.getByText('A valor razonable')).toBeInTheDocument();
    expect(screen.getByText('Al costo')).toBeInTheDocument();
    expect(screen.getByText('2 animales o lotes')).toBeInTheDocument();
  });
});
