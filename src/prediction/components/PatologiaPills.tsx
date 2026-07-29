import React from 'react';
import { CheckCircle2, Ban, Lock, Pencil } from 'lucide-react';
import { Pill } from './Pill';

/** Estado activo/inactivo de una patología (icono + texto + color). */
export function EstadoActivoPill({ activo }: { activo: boolean }) {
  return activo ? (
    <Pill tono="success" icon={<CheckCircle2 size={12} aria-hidden />}>Activa</Pill>
  ) : (
    <Pill tono="neutral" icon={<Ban size={12} aria-hidden />}>Inactiva</Pill>
  );
}

/** Tipo base (inmutable) vs personalizada (editable). */
export function TipoPatologiaPill({ esBase }: { esBase: boolean }) {
  return esBase ? (
    <Pill tono="info" icon={<Lock size={12} aria-hidden />} title="Patología base del sistema (inmutable)">Base</Pill>
  ) : (
    <Pill tono="warning" icon={<Pencil size={12} aria-hidden />}>Personalizada</Pill>
  );
}
