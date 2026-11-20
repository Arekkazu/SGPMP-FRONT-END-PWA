// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-19 | Arekkazu | INC-M07-373-G37 RF-98: período de gracia del contrato contable desde M09 |
import React, { useEffect, useState } from 'react';
import { FileClock } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { useGraciaContrato } from '../hooks/usePoliticaVision';
import styles from './ParametrosSection.module.css';

/** Mismo recurso que los parámetros operativos (configuraciones_globales). */
const RECURSO = 21;
const MINIMA = 'aaef_gracia_minima_dias';
const DEFECTO = 'aaef_gracia_defecto_dias';
const MAXIMO = 3650;

/**
 * RF-98 / RNF-98.10: días que una versión deprecada del contrato contable sigue disponible para la
 * contabilidad externa. El mínimo limita lo que se puede pedir; el por defecto se usa si no se indica otro.
 */
export function GraciaContratoSection() {
  const { t } = useT('configuration');
  const puedeLeer = usePermission(RECURSO, 2);
  const puedeEditar = usePermission(RECURSO, 3);
  const online = useOnlineStatus();
  const { parametros, loading, saving, error, saveError, cargar, guardar } = useGraciaContrato();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});

  useEffect(() => { if (puedeLeer) void cargar(); }, [puedeLeer, cargar]);
  useEffect(() => {
    setValores(Object.fromEntries(parametros.map((p) => [p.nombre, p.valor == null ? '' : String(p.valor)])));
  }, [parametros]);

  // Mismas reglas que el backend, que las vuelve a validar.
  const validar = (v: Record<string, string>) => {
    const fuera = (texto: string) => {
      const n = Number(texto);
      return texto === '' || !Number.isInteger(n) || n < 1 || n > MAXIMO ? t('graciacontrato.rango_invalido', { max: MAXIMO }) : undefined;
    };
    const resultado = { [MINIMA]: fuera(v[MINIMA] ?? ''), [DEFECTO]: fuera(v[DEFECTO] ?? '') };
    if (!resultado[MINIMA] && !resultado[DEFECTO] && Number(v[DEFECTO]) < Number(v[MINIMA])) {
      resultado[DEFECTO] = t('graciacontrato.defecto_menor');
    }
    return resultado;
  };
  const cambios = Object.fromEntries(parametros
    .filter((p) => valores[p.nombre] !== undefined && Number(valores[p.nombre]) !== Number(p.valor))
    .map((p) => [p.nombre, Number(valores[p.nombre])]));
  const cambiado = Object.keys(cambios).length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fallos = validar(valores);
    setErrores(fallos);
    if (fallos[MINIMA] || fallos[DEFECTO] || !cambiado || !puedeEditar || !online) return;
    void guardar(cambios);
  };

  if (!puedeLeer) return null;

  return (
    <section className={styles.section} aria-labelledby="gracia-contrato-titulo" aria-busy={loading || saving}>
      <header className={styles.header}>
        <div>
          <h2 id="gracia-contrato-titulo"><FileClock size={18} aria-hidden /> {t('graciacontrato.titulo')}</h2>
          <p className={styles.hint}>{t('graciacontrato.descripcion')}</p>
        </div>
      </header>

      {error && <Alert variant="error" title={t('graciacontrato.error_cargar')} description={error.message} />}
      {loading && !error && <div className={styles.skeleton} aria-hidden />}

      {!loading && !error && (
        <form className={styles.editor} onSubmit={onSubmit} noValidate>
          <h3 className={styles.editorTitle}>{t('graciacontrato.parametros')}</h3>
          <div className={styles.editorBody}>
            {saveError && <Alert variant="error" title={t('graciacontrato.no_se_pudo_guardar')} description={saveError.message} />}
            <fieldset className={styles.fields} disabled={!puedeEditar || saving}>
              {[MINIMA, DEFECTO].map((nombre) => (
                <Input
                  key={nombre}
                  id={`gc-${nombre}`}
                  label={t(`graciacontrato.${nombre === MINIMA ? 'minima' : 'defecto'}`)}
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={1}
                  max={MAXIMO}
                  required
                  value={valores[nombre] ?? ''}
                  onChange={(e) => setValores((v) => ({ ...v, [nombre]: e.target.value }))}
                  onBlur={() => setErrores(validar(valores))}
                  hint={t(`graciacontrato.${nombre === MINIMA ? 'minima' : 'defecto'}_ayuda`)}
                  error={errores[nombre]}
                />
              ))}
            </fieldset>
            {puedeEditar && (
              <div className={styles.actions}>
                <Button type="submit" variant="primary" loading={saving} disabled={!online || saving || !cambiado}>
                  {t('graciacontrato.guardar')}
                </Button>
              </div>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
