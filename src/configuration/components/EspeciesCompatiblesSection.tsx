// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-30 | Arekkazu | INC-M03-135-G01 RF-49: especies compatibles de un sensor desde M09 |
import React, { useEffect, useState } from 'react';
import { Dna, RefreshCw, Check } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { Stepper } from '../../shared/design-system/Stepper';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useDispositivosIot } from '../hooks/useDispositivosIot';
import { useSensores } from '../hooks/useSensores';
import { useEspecies } from '../hooks/useEspecies';
import { useEspeciesCompatibles } from '../hooks/useEspeciesCompatibles';
import { DispSelector } from './DispSelector';
import { SensorSelector } from './SensorSelector';
import type { DispositivoIotResponse, SensorResponse } from '../types';

/** modulo1.recursos: 'sensores'. */
const RECURSO = 12;

type Paso = 'dispositivo' | 'sensor' | 'especies';

/**
 * RF-49 R3: M02 solo deja vincular un sensor a un animal de una especie de esta lista
 * (si no existe, COMPATIBILIDAD_SENSOR_NO_CONFIGURADA). Antes no había dónde configurarla.
 */
export function EspeciesCompatiblesSection() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeLeer = usePermission(RECURSO, 2);
  const puedeEditar = usePermission(RECURSO, 3);

  const { dispositivos, loading: loadingDisp, cargar: cargarDisp } = useDispositivosIot();
  const { sensores, loading: loadingSensores, error: errorSensores, cargar: cargarSensores } = useSensores();
  const { especies, loading: loadingEspecies, cargar: cargarEspecies } = useEspecies();
  const compat = useEspeciesCompatibles();

  const [paso, setPaso] = useState<Paso>('dispositivo');
  const [dispositivo, setDispositivo] = useState<DispositivoIotResponse | null>(null);
  const [sensor, setSensor] = useState<SensorResponse | null>(null);
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [tocado, setTocado] = useState(false);

  useEffect(() => { if (puedeLeer) { cargarDisp(); void cargarEspecies(true); } }, [puedeLeer, cargarDisp, cargarEspecies]);
  useEffect(() => { setSeleccion(compat.ids); }, [compat.ids]);

  const elegirDispositivo = (d: DispositivoIotResponse) => {
    setDispositivo(d); setSensor(null); setPaso('sensor');
    cargarSensores(d.id_dispositivo_iot);
  };
  const elegirSensor = (s: SensorResponse) => {
    setSensor(s); setTocado(false); setPaso('especies');
    void compat.cargar(s.id_sensores);
  };
  const reiniciar = () => { setPaso('dispositivo'); setDispositivo(null); setSensor(null); };
  const alternar = (id: number) => setSeleccion((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const errorSeleccion = tocado && seleccion.length === 0 ? t('especiescompatibles.minimo_una') : undefined;
  const cambiado = seleccion.length !== compat.ids.length || seleccion.some((id) => !compat.ids.includes(id));

  const guardar = () => {
    setTocado(true);
    if (!sensor || seleccion.length === 0) return;
    void compat.guardar(sensor.id_sensores, seleccion);
  };

  if (!puedeLeer) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <Dna size={18} color="var(--brand-500)" aria-hidden />
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('especiescompatibles.titulo')}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>{t('especiescompatibles.descripcion')}</p>
          </div>
        </div>
        {paso !== 'dispositivo' && (
          <Button variant="ghost" size="sm" onClick={() => { reiniciar(); cargarDisp(); }}>
            <RefreshCw size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('especiescompatibles.reiniciar')}</Button>
        )}
      </div>

      {!online && <Alert variant="warning" title={t('especiescompatibles.sin_conexion')} description={t('especiescompatibles.sin_conexion_detalle')} style={{ marginBottom: 'var(--s4)' }} />}
      {!puedeEditar && <Alert variant="info" title={t('especiescompatibles.solo_lectura')} description={t('especiescompatibles.solo_lectura_detalle')} style={{ marginBottom: 'var(--s4)' }} />}

      {online && (
        <>
          <Stepper
            aria-label={t('especiescompatibles.pasos')}
            actual={paso}
            pasos={[
              { id: 'dispositivo', label: t('calibracionsection.paso_dispositivo') },
              { id: 'sensor', label: t('calibracionsection.paso_sensor') },
              { id: 'especies', label: t('especiescompatibles.paso_especies') },
            ]}
          />

          {paso === 'dispositivo' && (
            <DispSelector dispositivos={dispositivos} loading={loadingDisp} onSelect={elegirDispositivo} idBuscador="buscar-disp-especies" />
          )}

          {paso === 'sensor' && dispositivo && (
            <SensorSelector sensores={sensores} loading={loadingSensores} error={errorSensores} onSelect={elegirSensor} onBack={reiniciar} />
          )}

          {paso === 'especies' && sensor && (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>
                {t('especiescompatibles.elige_para')} <strong>{sensor.nombre}</strong>
              </p>
              {compat.error && <Alert variant="error" title={t('especiescompatibles.error_cargar')} description={compat.error.message} style={{ marginBottom: 'var(--s4)' }} />}
              {compat.saveError && <Alert variant="error" title={t('especiescompatibles.no_se_pudo_guardar')} description={compat.saveError.message} style={{ marginBottom: 'var(--s4)' }} />}
              {!compat.loading && !compat.error && compat.ids.length === 0 && (
                <Alert variant="warning" title={t('especiescompatibles.sin_configurar')} description={t('especiescompatibles.sin_configurar_detalle')} style={{ marginBottom: 'var(--s4)' }} />
              )}

              {compat.loading || loadingEspecies ? (
                <div aria-hidden style={{ height: 90, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)' }} />
              ) : (
                <div
                  role="group"
                  aria-label={t('especiescompatibles.especies')}
                  aria-describedby={errorSeleccion ? 'especies-compatibles-error' : undefined}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}
                >
                  {especies.filter((e) => e.es_activo).map((e) => (
                    <OptionCard
                      key={e.id_especie}
                      variant="pill"
                      selected={seleccion.includes(e.id_especie)}
                      disabled={!puedeEditar || compat.saving}
                      onClick={() => alternar(e.id_especie)}
                    >
                      {seleccion.includes(e.id_especie) && <Check size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />}
                      {e.nombre}
                    </OptionCard>
                  ))}
                </div>
              )}
              {errorSeleccion && (
                <span id="especies-compatibles-error" role="alert" style={{ display: 'block', marginTop: 'var(--s2)', fontSize: '12px', color: 'var(--sem-error)' }}>{errorSeleccion}</span>
              )}

              {puedeEditar && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--s5)' }}>
                  <Button variant="primary" onClick={guardar} loading={compat.saving} disabled={compat.loading || !cambiado}>
                    {t('especiescompatibles.guardar')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
