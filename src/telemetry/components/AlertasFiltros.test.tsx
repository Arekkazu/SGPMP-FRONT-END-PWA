// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-02 RF-57: el filtro por animal escrito a medias no consulta en silencio sin el filtro |
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '../../shared/i18n';
import { AlertasFiltros, ALERTAS_FILTROS_VACIO, type AlertasFiltrosState } from './AlertasFiltros';
import type { ActivoOpcionTelemetria } from '../api/alertasApi';

const ACTIVOS = [
  { id_activo_biologico: 4, identificador: 'BOV-003', nombre_especie: 'Bovino' },
  { id_activo_biologico: 5, identificador: 'BOV-004', nombre_especie: 'Bovino' },
] as ActivoOpcionTelemetria[];

function Montaje({ onAplicar, espia }: { onAplicar: () => void; espia: (v: AlertasFiltrosState) => void }) {
  const [v, setV] = useState(ALERTAS_FILTROS_VACIO);
  return <AlertasFiltros activos={ACTIVOS} value={v} onChange={(x) => { setV(x); espia(x); }} onAplicar={onAplicar} onLimpiar={() => setV(ALERTAS_FILTROS_VACIO)} />;
}

describe('AlertasFiltros · animal o lote', () => {
  it('texto a medias ambiguo: no consulta y avisa en el campo', () => {
    const onAplicar = vi.fn();
    render(<Montaje onAplicar={onAplicar} espia={() => undefined} />);
    const campo = screen.getByRole('combobox', { name: /Animal o lote/i });
    fireEvent.change(campo, { target: { value: 'bov' } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/i }));
    expect(onAplicar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/Elige un animal o lote de la lista/);
  });

  it('código que coincide con un solo activo: se elige al salir del campo y manda el id', () => {
    const onAplicar = vi.fn();
    const espia = vi.fn();
    render(<Montaje onAplicar={onAplicar} espia={espia} />);
    const campo = screen.getByRole('combobox', { name: /Animal o lote/i });
    fireEvent.change(campo, { target: { value: 'bov-003' } });
    fireEvent.blur(campo);
    expect(espia).toHaveBeenLastCalledWith(expect.objectContaining({ id_activo_biologico: '4', activo: 'BOV-003 (#4)' }));
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/i }));
    expect(onAplicar).toHaveBeenCalledTimes(1);
  });

  it('elegido de la lista: manda el id_activo_biologico', () => {
    const espia = vi.fn();
    render(<Montaje onAplicar={vi.fn()} espia={espia} />);
    const campo = screen.getByRole('combobox', { name: /Animal o lote/i });
    fireEvent.change(campo, { target: { value: 'bov' } });
    fireEvent.click(screen.getByRole('option', { name: /BOV-004/ }));
    expect(espia).toHaveBeenLastCalledWith(expect.objectContaining({ id_activo_biologico: '5' }));
  });
});
