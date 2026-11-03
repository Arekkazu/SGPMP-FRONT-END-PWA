// | Fecha      | Nombre   | Que se hizo                                                        |
// |------------|----------|--------------------------------------------------------------------|
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: ventana de retroalimentación desde M09     |
// | 2026-11-03 | Arekkazu | AJF-14 RF-71 BE-6: días para el reentrenamiento programado (0 = apagado) |
import React, { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { useVentanaRetroalimentacion } from '../hooks/usePoliticaVision';
import styles from './ParametrosSection.module.css';

/** Mismo recurso que los parámetros operativos (configuraciones_globales). */
const RECURSO = 21;
const NOMBRE = 'ventana_retroalimentacion_dias';
const MINIMO = 7;
const MAXIMO = 365;
/** AJF-14 BE-6: un animal cuya versión tiene más de estos días se reentrena solo. 0 = apagado. */
const NOMBRE_PROGRAMADO = 'dias_reentrenamiento_programado';
/**
 * RF-72: días calendario desde la inferencia en los que el Veterinario puede registrar
 * retroalimentación. Antes solo lo cargaba el script DEV-14.
 */
export function VentanaRetroalimentacionSection() {
  const { t } = useT('configuration');
  const puedeLeer = usePermission(RECURSO, 2);
  const puedeEditar = usePermission(RECURSO, 3);
  const online = useOnlineStatus();
  const { parametros, loading, saving, error, saveError, cargar, guardar } = useVentanaRetroalimentacion();
  const [valor, setValor] = useState('');
  const [errorCampo, setErrorCampo] = useState<string>();

  const actual = parametros.find((p) => p.nombre === NOMBRE);
  const programado = parametros.find((p) => p.nombre === NOMBRE_PROGRAMADO);
  const [dias, setDias] = useState('');
  const [errorDias, setErrorDias] = useState<string>();
  useEffect(() => { if (puedeLeer) void cargar(); }, [puedeLeer, cargar]);
  useEffect(() => { setValor(actual?.valor == null ? '' : String(actual.valor)); }, [actual?.valor]);
  useEffect(() => { setDias(programado?.valor == null ? '' : String(programado.valor)); }, [programado?.valor]);
  const validarDias = (texto: string) => {
    const n = Number(texto);
    return texto !== '' && Number.isInteger(n) && n >= 0 && n <= MAXIMO
      ? undefined : t('ventanaretro.programado_invalido', { max: MAXIMO });
  };
  const diasCambiado = !!programado && dias !== '' && Number(dias) !== Number(programado.valor);

  // Mismo rango que DEV-14; el backend lo vuelve a validar.
  const validar = (texto: string) => {
    const dias = Number(texto);
    return texto !== '' && Number.isInteger(dias) && dias >= MINIMO && dias <= MAXIMO
      ? undefined : t('ventanaretro.rango_invalido', { min: MINIMO, max: MAXIMO });
  };
  const ventanaCambiada = valor !== '' && Number(valor) !== Number(actual?.valor);
  const cambiado = ventanaCambiada || diasCambiado;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fallo = ventanaCambiada ? validar(valor) : undefined;
    const falloDias = diasCambiado ? validarDias(dias) : undefined;
    setErrorCampo(fallo);
    setErrorDias(falloDias);
    if (fallo || falloDias || !cambiado || !puedeEditar || !online) return;
    const cambios: Record<string, number> = {};
    if (ventanaCambiada) cambios[NOMBRE] = Number(valor);
    if (diasCambiado) cambios[NOMBRE_PROGRAMADO] = Number(dias);
    void guardar(cambios);
  };

  if (!puedeLeer) return null;

  return (
    <section className={styles.section} aria-labelledby="ventana-retro-titulo" aria-busy={loading || saving}>
      <header className={styles.header}>
        <div>
          <h2 id="ventana-retro-titulo"><MessageSquareText size={18} aria-hidden /> {t('ventanaretro.titulo')}</h2>
          <p className={styles.hint}>{t('ventanaretro.descripcion')}</p>
        </div>
      </header>

      {error && <Alert variant="error" title={t('ventanaretro.error_cargar')} description={error.message} />}
      {loading && !error && <div className={styles.skeleton} aria-hidden />}

      {!loading && !error && (
        <form className={styles.editor} onSubmit={onSubmit} noValidate>
          <h3 className={styles.editorTitle}>{t('ventanaretro.parametro')}</h3>
          <div className={styles.editorBody}>
            {actual?.fuente === 'SIN_CONFIGURAR' && (
              <Alert variant="warning" title={t('ventanaretro.sin_configurar')} description={t('ventanaretro.sin_configurar_detalle')} />
            )}
            {saveError && <Alert variant="error" title={t('ventanaretro.no_se_pudo_guardar')} description={saveError.message} />}
            <fieldset className={styles.fields} disabled={!puedeEditar || saving}>
              <Input
                id="vr-dias"
                label={t('ventanaretro.dias')}
                type="number"
                inputMode="numeric"
                step={1}
                min={MINIMO}
                max={MAXIMO}
                required
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                onBlur={() => setErrorCampo(validar(valor))}
                hint={t('ventanaretro.rango', { min: MINIMO, max: MAXIMO })}
                error={errorCampo}
              />
              {programado && (
                <Input
                  id="vr-programado"
                  label={t('ventanaretro.programado')}
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={0}
                  max={MAXIMO}
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  onBlur={() => setErrorDias(validarDias(dias))}
                  hint={t('ventanaretro.programado_ayuda')}
                  error={errorDias}
                />
              )}
            </fieldset>
            {puedeEditar && (
              <div className={styles.actions}>
                <Button type="submit" variant="primary" loading={saving} disabled={!online || saving || !cambiado}>
                  {t('ventanaretro.guardar')}
                </Button>
              </div>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
