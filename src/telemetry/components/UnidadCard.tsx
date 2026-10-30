// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 T-22/M3-11: plurales, contadores con texto, semáforo legible y día del último dato |
// | 2026-10-26 | Arekkazu | INC-M03-205-G93 RF-58: unidad sin sensores en GRIS con "Sin datos disponibles" |
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo 13.4 RF-58: encabezado plegable con el problema del área en palabras |
import React from 'react';
import { MapPin, Wifi, WifiOff, AlertOctagon, BellRing, ChevronDown } from 'lucide-react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { Pill } from './Pill';
import { SemaforoPill, etiquetaSemaforo } from './SemaforoPill';
import { momentoCaptura, valorConUnidad } from '../lib/sensorEscala';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import { semaforo, type Titular } from '../lib/enVivo';
import type { ResumenUnidadSchema } from '../types';

/** M3-11: el número va con su texto ("3 en línea"); antes solo había ícono y un `title`. */
function Contador({ icon, valor, etiqueta, color }: { icon: React.ReactNode; valor: number; etiqueta: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', fontSize: '12px', color: 'var(--text-secondary)' }}>
      <span style={{ color, display: 'inline-flex' }}>{icon}</span>
      <strong style={{ color: 'var(--text-primary)' }}>{formatearNumero(valor)}</strong>
      {etiqueta}
    </span>
  );
}

const COLOR_TITULAR = { ROJO: 'var(--sem-error)', AMARILLO: 'var(--sem-warning)', VERDE: 'var(--sem-success)', GRIS: 'var(--text-muted)' };

interface Props {
  unidad: ResumenUnidadSchema;
  titular: Titular;
  abierta: boolean;
  onAlternar: () => void;
  /** id del contenido que abre y cierra (aria-controls). */
  idContenido: string;
}

export function UnidadCard({ unidad, titular, abierta, onAlternar, idContenido }: Props) {
  const { t } = useT('telemetry');
  // Prototipo 13.4: el área dice qué le pasa sin abrirla ("Ph: 9,1 · Fuera de rango").
  const [texto, color] = titular.tipo === 'problema'
    ? [`${etiquetaCodigo(titular.sensor.tipo_variable)}: ${valorConUnidad(titular.sensor.ultimo_valor, titular.sensor.ultima_unidad)} · ${etiquetaSemaforo(titular.sensor.estado_semaforo)}`,
      COLOR_TITULAR[semaforo(titular.sensor.estado_semaforo)]]
    : titular.tipo === 'en_rango' ? [t('unidadcard.todas_en_rango'), COLOR_TITULAR.VERDE]
    : titular.tipo === 'sin_datos' ? [t('unidadcard.sin_datos_desde', { momento: momentoCaptura(titular.desde) }), COLOR_TITULAR.GRIS]
    : [unidad.mensaje_estado ?? t('unidadcard.sin_datos_disponibles'), COLOR_TITULAR.GRIS];

  return (
    <OptionCard
      aria-expanded={abierta}
      aria-controls={idContenido}
      onClick={onAlternar}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s4)', flexWrap: 'wrap', padding: 'var(--s4) var(--s5)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s3)', minWidth: 0, flex: '1 1 260px' }}>
        <div style={{ color: 'var(--brand-500)', paddingTop: 2 }}><MapPin size={18} aria-hidden /></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {unidad.nombre_infraestructura}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {unidad.nombre_finca}
            {unidad.ultimo_dato_recibido && ` · último dato ${momentoCaptura(unidad.ultimo_dato_recibido)}`}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color, marginTop: 'var(--s1)' }}>{texto}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        {/* RF-58 CU04 E1 (INC-M03-205-G93): la unidad sin sensores no muestra contadores fabricados. */}
        {unidad.total_sensores > 0 && (<>
        <Contador icon={<Wifi size={14} aria-hidden />} valor={unidad.sensores_online} etiqueta="en línea" color="var(--sem-success)" />
        <Contador icon={<WifiOff size={14} aria-hidden />} valor={unidad.sensores_sin_senal} etiqueta="sin señal" color="var(--text-muted)" />
        <Contador icon={<AlertOctagon size={14} aria-hidden />} valor={unidad.sensores_con_error} etiqueta="con error o fuera de rango" color="var(--sem-error)" />
        {unidad.alertas_activas_count > 0 && (
          <Pill tono="error" icon={<BellRing size={12} aria-hidden />}>{t('conteo.alertas_activas', { count: unidad.alertas_activas_count, n: formatearNumero(unidad.alertas_activas_count) })}</Pill>
        )}
        </>)}
        <SemaforoPill estado={unidad.estado_general} />
        <ChevronDown size={18} aria-hidden style={{ color: 'var(--text-muted)', transform: abierta ? 'rotate(180deg)' : undefined, transition: 'transform .15s ease-out' }} />
      </div>
    </OptionCard>
  );
}
