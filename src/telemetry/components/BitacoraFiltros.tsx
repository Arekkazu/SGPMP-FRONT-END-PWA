// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | H-M3-17 CP137 RF-63: rango de fechas invertido se avisa en el campo y no se aplica |
// | 2026-10-31 | Arekkazu | TC-DIS-166 RF-63: filtro por RF de origen del evento |
// | 2026-11-03 | Arekkazu | RF-63: tipo de evento en un desplegable por área del sistema, sin "RF de origen" a la vista |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

export interface BitacoraFiltrosState {
  tipo_evento: string;
  severidad_log: string;
  clasificacion_registro: string;
  resultado: string;
  entidad_afectada_id: string;
  fecha_desde: string;
  fecha_hasta: string;
  rf_origen: string;
}

/**
 * Tipos de evento por componente que los emite (`ComponenteOrigen` del backend). El
 * usuario ve el área del sistema y el evento con nombre; el código del componente solo
 * viaja como filtro `rf_origen` al elegir «Todos» de un grupo.
 */
export const GRUPOS_BITACORA: { componente: string; tipos: string[] }[] = [
  { componente: 'RF53', tipos: ['TELEMETRIA_VALIDADA', 'TELEMETRIA_RECHAZADA', 'ERROR_AUTENTICACION_DISPOSITIVO', 'POSTCOMMIT_RF53_LECTURAS_COMPLETADO', 'POSTCOMMIT_RF53_AUDITORIA_COMPLETADO'] },
  { componente: 'RF54', tipos: ['BUFFER_CAPACITY_WARNING', 'BUFFER_OVERFLOW', 'BUFFER_DATA_CORRUPTION'] },
  { componente: 'RF55', tipos: ['DESVIACION_DETECTADA'] },
  { componente: 'RF56', tipos: ['PAQUETE_INFERENCIA_GENERADO', 'PAQUETE_ENVIADO_IA', 'CONTEXTO_INCOMPLETO'] },
  { componente: 'RF57', tipos: ['ALERTA_GENERADA', 'ALERTA_RECONOCIDA', 'ALERTA_RESUELTA', 'ALERTA_DESCARTADA', 'TRANSICION_ALERTA_RECHAZADA', 'DUPLICADO_ALERTA_CORRELACIONADO', 'ESCALAMIENTO_ALERTA_SLA', 'SLA_ALERTA_INCUMPLIDO', 'NOTIFICACION_FALLIDA', 'MOTOR_INFERENCIA_NO_INTEGRADO', 'POSTCOMMIT_RF57_COMPLETADO'] },
  { componente: 'RF58', tipos: ['VARIABLE_SIN_UMBRAL'] },
  { componente: 'RF59', tipos: ['HISTORIAL_CONSULTADO'] },
  { componente: 'RF60', tipos: ['HEARTBEAT_RECIBIDO', 'DISPOSITIVO_SIN_SEÑAL', 'DISPOSITIVO_INACTIVO', 'DISPOSITIVO_RECONECTADO', 'ESTADO_CAMBIADO', 'POSTCOMMIT_RF60_COMPLETADO', 'POSTCOMMIT_RF60_TRANSICIONES_COMPLETADO', 'POSTCOMMIT_HEARTBEAT_ESTADO_COMPLETADO', 'POSTCOMMIT_HEARTBEAT_ALERTAS_COMPLETADO', 'POSTCOMMIT_HEARTBEAT_SENSORES_COMPLETADO', 'POSTCOMMIT_HEARTBEAT_FIRMWARE_COMPLETADO', 'POSTCOMMIT_HEARTBEAT_AUDITORIA_COMPLETADO', 'POSTCOMMIT_VISION_DETECCION_COMPLETADO'] },
  { componente: 'RF61', tipos: ['VINCULACION_AUTOMATICA', 'SIN_VINCULAR', 'POSTCOMMIT_RF61_COMPLETADO'] },
  { componente: 'RF62', tipos: ['EVALUACION_CALIDAD_COMPLETADA', 'POSTCOMMIT_RF62_COMPLETADO', 'POSTCOMMIT_RF62_FALLIDO', 'POSTCOMMIT_VISION_CALIDAD_COMPLETADO'] },
  { componente: 'RF17', tipos: ['PROPAGACION_UMBRAL_EDGE', 'POSTCOMMIT_RF17_COMPLETADO', 'POSTCOMMIT_RF17_FALLIDO'] },
  { componente: 'RF20', tipos: ['PROPAGACION_TIPO_MODELO_EDGE'] },
  { componente: 'RF23', tipos: ['CREDENCIAL_MQTT_EMITIDA', 'CREDENCIAL_MQTT_REVOCADA', 'CONFIGURACION_REMOTA_REINTENTADA'] },
];

/** Un solo desplegable para dos filtros del backend: «c:<componente>» o «t:<tipo>». */
function valorTipo(v: BitacoraFiltrosState): string {
  if (v.tipo_evento) return `t:${v.tipo_evento}`;
  return v.rf_origen ? `c:${v.rf_origen}` : '';
}

export const BITACORA_FILTROS_VACIO: BitacoraFiltrosState = {
  tipo_evento: '', severidad_log: '', clasificacion_registro: '', resultado: '',
  entidad_afectada_id: '', fecha_desde: '', fecha_hasta: '', rf_origen: '',
};

interface Props {
  value: BitacoraFiltrosState;
  onChange: (v: BitacoraFiltrosState) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
}

export function BitacoraFiltros({ value, onChange, onAplicar, onLimpiar }: Props) {
  const invertido = !!value.fecha_desde && !!value.fecha_hasta && value.fecha_desde > value.fecha_hasta;
  const { t } = useT('telemetry');
  const set = (k: keyof BitacoraFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <>
      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="b-tipo">{t('bitacorafiltros.tipo_de_evento')}</label>
          <select
            id="b-tipo" style={INPUT} value={valorTipo(value)}
            onChange={(e) => {
              const [clase, codigo = ''] = e.target.value.split(/:(.*)/);
              onChange({ ...value, tipo_evento: clase === 't' ? codigo : '', rf_origen: clase === 'c' ? codigo : '' });
            }}
          >
            <option value="">{t('bitacorafiltros.todos')}</option>
            {GRUPOS_BITACORA.map(({ componente, tipos }) => {
              const grupo = t(`bitacorafiltros.origen_${componente}`);
              return (
                <optgroup key={componente} label={grupo}>
                  <option value={`c:${componente}`}>{t('bitacorafiltros.todos_del_grupo', { grupo })}</option>
                  {tipos.map((tipo) => <option key={tipo} value={`t:${tipo}`}>{etiquetaCodigo(tipo)}</option>)}
                </optgroup>
              );
            })}
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="b-sev">{t('bitacorafiltros.severidad')}</label>
          <select id="b-sev" style={INPUT} value={value.severidad_log} onChange={set('severidad_log')}>
            <option value="">{t('bitacorafiltros.todas')}</option>
            <option value="INFO">{t('bitacorafiltros.info')}</option>
            <option value="WARNING">{t('bitacorafiltros.advertencia')}</option>
            <option value="ERROR">{t('bitacorafiltros.error')}</option>
            <option value="CRITICAL">{t('bitacorafiltros.critico')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="b-clas">{t('bitacorafiltros.clasificacion')}</label>
          <select id="b-clas" style={INPUT} value={value.clasificacion_registro} onChange={set('clasificacion_registro')}>
            <option value="">{t('bitacorafiltros.todas')}</option>
            <option value="NIC41">NIC 41 (5 años)</option>
            <option value="TECNICO">Técnico (1 año)</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="b-res">{t('bitacorafiltros.resultado')}</label>
          <select id="b-res" style={INPUT} value={value.resultado} onChange={set('resultado')}>
            <option value="">{t('bitacorafiltros.todos')}</option>
            <option value="EXITOSO">{t('bitacorafiltros.exitoso')}</option>
            <option value="FALLIDO">{t('bitacorafiltros.fallido')}</option>
            <option value="PARCIAL">{t('bitacorafiltros.parcial')}</option>
            <option value="RECHAZADO">{t('bitacorafiltros.rechazado')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="b-ent">{t('bitacorafiltros.id_entidad_afectada')}</label>
          <input id="b-ent" style={INPUT} value={value.entidad_afectada_id} onChange={set('entidad_afectada_id')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="b-desde">{t('bitacorafiltros.desde')}</label>
          <input id="b-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={set('fecha_desde')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="b-hasta">{t('bitacorafiltros.hasta')}</label>
          <input
            id="b-hasta" type="date" style={INPUT} value={value.fecha_hasta} onChange={set('fecha_hasta')}
            aria-invalid={invertido} aria-describedby={invertido ? 'b-rango-error' : undefined}
          />
          {invertido && (
            <p id="b-rango-error" role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
              {t('filtros.rango_invertido', { ns: 'common' })}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
        <Button variant="primary" size="sm" disabled={invertido} onClick={() => { if (!invertido) onAplicar(); }}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('bitacorafiltros.aplicar_filtros')}</Button>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>{t('bitacorafiltros.limpiar')}</Button>
      </div>
    </>
  );
}
