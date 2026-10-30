// | Fecha      | Nombre   | Que se hizo                                                        |
// |------------|----------|--------------------------------------------------------------------|
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: ventana de retroalimentación desde M09     |
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
  useEffect(() => { if (puedeLeer) void cargar(); }, [puedeLeer, cargar]);
  useEffect(() => { setValor(actual?.valor == null ? '' : String(actual.valor)); }, [actual?.valor]);

  // Mismo rango que DEV-14; el backend lo vuelve a validar.
  const validar = (texto: string) => {
    const dias = Number(texto);
    return texto !== '' && Number.isInteger(dias) && dias >= MINIMO && dias <= MAXIMO
      ? undefined : t('ventanaretro.rango_invalido', { min: MINIMO, max: MAXIMO });
  };
  const cambiado = valor !== '' && Number(valor) !== Number(actual?.valor);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fallo = validar(valor);
    setErrorCampo(fallo);
    if (fallo || !cambiado || !puedeEditar || !online) return;
    void guardar({ [NOMBRE]: Number(valor) });
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
