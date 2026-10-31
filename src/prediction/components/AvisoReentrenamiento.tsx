// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | RF-71: aviso de datos insuficientes para reentrenar el modelo individual |
import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { formatearNumero } from '../../shared/i18n/formato';
import { Alert } from '../../shared/design-system/Alert';
import { modelosApi } from '../api/modelosApi';
import { TIPO_MODELO_LABEL, type EstadoReentrenamiento } from '../types';

/**
 * Por modelo individual: avisa si no hay retroalimentaciones RF-72 suficientes para reentrenar
 * (menos de 200 desde la última versión), si ya se puede solicitar o si cumple RF-71 (500).
 * Sin permiso o sin red no muestra nada: es informativo.
 */
export function AvisoReentrenamiento({ online }: { online: boolean }) {
  const { t } = useT('prediction');
  const [estados, setEstados] = useState<EstadoReentrenamiento[]>([]);
  useEffect(() => {
    if (!online) return undefined;
    let vigente = true;
    modelosApi.estadoReentrenamiento().then((r) => vigente && setEstados(r), () => {});
    return () => { vigente = false; };
  }, [online]);

  return (
    <>
      {estados.map((e) => {
        const valores = {
          modelo: TIPO_MODELO_LABEL[e.tipo_modelo] ?? e.tipo_modelo,
          n: formatearNumero(e.registros_nuevos),
          faltan: formatearNumero(e.faltan),
          solicitud: formatearNumero(e.minimo_solicitud),
          minimo: formatearNumero(e.minimo_reentrenamiento),
        };
        return (
          <Alert
            key={e.tipo_modelo}
            variant={e.estado === 'INSUFICIENTE' ? 'warning' : 'info'}
            title={t(`avisoreentrenamiento.titulo_${e.estado.toLowerCase()}`, valores)}
            description={t(`avisoreentrenamiento.detalle_${e.estado.toLowerCase()}`, valores)}
            style={{ marginBottom: 'var(--s4)' }}
          />
        );
      })}
    </>
  );
}
