// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | RF-71: aviso de datos insuficientes para reentrenar el modelo individual |
// | 2026-10-31 | Arekkazu | RF-71/RF-73: botón para solicitar el reentrenamiento (queda en la bitácora) |
import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { formatearNumero } from '../../shared/i18n/formato';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import type { ApiError } from '../../shared/api/errors';
import { modelosApi } from '../api/modelosApi';
import { TIPO_MODELO_LABEL, type EstadoReentrenamiento, type TipoModelo } from '../types';

/**
 * Por modelo individual: avisa si no hay retroalimentaciones RF-72 suficientes para reentrenar
 * (menos de 200 desde la última versión), si ya se puede solicitar o si cumple RF-71 (500).
 * Sin permiso o sin red no muestra nada: es informativo. Con permiso E y desde el mínimo de
 * solicitud ofrece «Solicitar reentrenamiento», que solo deja el evento en la bitácora (RF-73).
 */
export function AvisoReentrenamiento({ online, puedeSolicitar = false }: { online: boolean; puedeSolicitar?: boolean }) {
  const { t } = useT('prediction');
  const [estados, setEstados] = useState<EstadoReentrenamiento[]>([]);
  const [enviando, setEnviando] = useState<TipoModelo | null>(null);
  const [solicitados, setSolicitados] = useState<Set<TipoModelo>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const solicitar = (tipo: TipoModelo) => {
    setEnviando(tipo);
    setError(null);
    modelosApi.solicitarReentrenamiento(tipo)
      .then(() => setSolicitados((s) => new Set(s).add(tipo)))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setEnviando(null));
  };
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
        const solicitado = solicitados.has(e.tipo_modelo);
        return (
          <div key={e.tipo_modelo} style={{ marginBottom: 'var(--s4)' }}>
            <Alert
              variant={e.estado === 'INSUFICIENTE' ? 'warning' : 'info'}
              title={t(`avisoreentrenamiento.titulo_${e.estado.toLowerCase()}`, valores)}
              description={solicitado ? t('avisoreentrenamiento.solicitado', valores)
                : t(`avisoreentrenamiento.detalle_${e.estado.toLowerCase()}`, valores)}
            />
            {puedeSolicitar && e.estado !== 'INSUFICIENTE' && !solicitado && (
              <Button variant="secondary" size="sm" loading={enviando === e.tipo_modelo} disabled={!online}
                onClick={() => solicitar(e.tipo_modelo)} style={{ marginTop: 'var(--s2)' }}>
                {t('avisoreentrenamiento.solicitar')}
              </Button>
            )}
          </div>
        );
      })}
      {error && <Alert variant="error" title={t('avisoreentrenamiento.no_se_pudo_solicitar')} description={error}
        style={{ marginBottom: 'var(--s4)' }} />}
    </>
  );
}
