// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-13 RF-73: opciones del combobox "Registro" según la entidad elegida |
import { useEffect, useState } from 'react';
import { historialApi } from '../api/historialApi';
import { modelosApi } from '../api/modelosApi';
import { patologiasApi } from '../api/patologiasApi';
import { motorApi } from '../api/motorApi';
import { etiquetaTipoModelo } from '../types';
import type { EntidadReferencia, OpcionReferencia } from '../lib/referenciaAuditoria';

async function cargarOpciones(entidad: EntidadReferencia): Promise<OpcionReferencia[]> {
  switch (entidad) {
    case 'activo_biologico':
      return (await historialApi.listarActivos()).map((a) => ({
        id: a.id_activo_biologico,
        nombre: a.identificador || `#${a.id_activo_biologico}`,
        detalle: a.nombre_especie ?? undefined,
      }));
    case 'version_modelo':
      return (await modelosApi.listar({ limit: 200 })).items.map((v) => ({
        id: v.id_version_modelo, nombre: v.nombre_version, detalle: etiquetaTipoModelo(v.tipo_modelo),
      }));
    case 'patologia':
      return (await patologiasApi.listar({})).items.map((p) => ({ id: p.id_patologia, nombre: p.nombre_patologia }));
    case 'configuracion_motor_ia':
      return (await motorApi.listar()).items.map((c) => ({ id: c.id_configuracion_motor, nombre: etiquetaTipoModelo(c.tipo_modelo) }));
  }
}

/** Catálogo de la entidad elegida en "Relacionado con". Sin red o sin permiso queda vacío. */
export function useReferenciasAuditoria(entidad: EntidadReferencia | ''): { opciones: OpcionReferencia[]; cargando: boolean } {
  const [opciones, setOpciones] = useState<OpcionReferencia[]>([]);
  const [cargando, setCargando] = useState(false);
  useEffect(() => {
    setOpciones([]);
    if (!entidad) return;
    let vigente = true;
    setCargando(true);
    cargarOpciones(entidad)
      .then((o) => { if (vigente) setOpciones(o); })
      .catch(() => { /* el filtro queda sin sugerencias; el backend valida */ })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [entidad]);
  return { opciones, cargando };
}
