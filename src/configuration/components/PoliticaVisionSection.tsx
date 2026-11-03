// | Fecha      | Nombre   | Que se hizo                                                        |
// |------------|----------|--------------------------------------------------------------------|
// | 2026-10-29 | Arekkazu | INC-M03-82-G192 RF-62: política de visión configurable desde M09   |
import React, { useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { usePoliticaVision } from '../hooks/usePoliticaVision';
import styles from './ParametrosSection.module.css';

/** Mismo recurso que los parámetros operativos (configuraciones_globales). */
const RECURSO = 21;
const PESOS = ['w1', 'w2', 'w3'];
const ENTERO = new Set(['tracks_perdidos_tolerables']);

/**
 * RF-62 (RFC-011): pesos del índice de calidad de visión, tracks tolerables, umbrales de
 * clasificación y factor en calibración. Antes solo los cargaba el script DEV-14.
 */
export function PoliticaVisionSection() {
  const { t } = useT('configuration');
  const puedeLeer = usePermission(RECURSO, 2);
  const puedeEditar = usePermission(RECURSO, 3);
  const online = useOnlineStatus();
  const { parametros, loading, saving, error, saveError, cargar, guardar } = usePoliticaVision();
  const [valores, setValores] = useState<Record<string, string>>({});

  useEffect(() => { if (puedeLeer) void cargar(); }, [puedeLeer, cargar]);
  useEffect(() => {
    setValores(Object.fromEntries(parametros.map((p) => [p.nombre, p.valor == null ? '' : String(p.valor)])));
  }, [parametros]);

  const numero = (nombre: string) => Number(valores[nombre]);
  const sumaPesos = PESOS.reduce((s, n) => s + numero(n), 0);
  // Mismas reglas que DEV-14; el backend las vuelve a validar.
  const errorPesos = Math.abs(sumaPesos - 1) > 1e-9 ? t('politicavision.pesos_suman', { suma: sumaPesos.toFixed(2) }) : undefined;
  const errorUmbrales = numero('umbral_optima') <= numero('umbral_degradada') ? t('politicavision.optima_mayor') : undefined;
  const cambios = useMemo(() => Object.fromEntries(parametros
    .filter((p) => valores[p.nombre] !== undefined && valores[p.nombre] !== '' && Number(valores[p.nombre]) !== Number(p.valor))
    .map((p) => [p.nombre, Number(valores[p.nombre])])), [parametros, valores]);
  const sinConfigurar = parametros.some((p) => p.fuente !== 'CONFIGURADO');
  const puedeGuardar = puedeEditar && online && !saving && !errorPesos && !errorUmbrales
    && (Object.keys(cambios).length > 0 || sinConfigurar);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeGuardar) return;
    // Sin cambios pero sin sembrar: se envía un valor para que el backend siembre los 7.
    const cuerpo = Object.keys(cambios).length ? cambios : { w1: numero('w1') };
    void guardar(cuerpo);
  };

  if (!puedeLeer) return null;

  return (
    <section className={styles.section} aria-labelledby="politica-vision-titulo" aria-busy={loading || saving}>
      <header className={styles.header}>
        <div>
          <h2 id="politica-vision-titulo"><Eye size={18} aria-hidden /> {t('politicavision.titulo')}</h2>
          <p className={styles.hint}>{t('politicavision.descripcion')}</p>
        </div>
      </header>

      {error && <Alert variant="error" title={t('politicavision.error_cargar')} description={error.message} />}
      {loading && !error && <div className={styles.skeleton} aria-hidden />}

      {!loading && !error && (
        <form className={styles.editor} onSubmit={onSubmit} noValidate>
          <h3 className={styles.editorTitle}>{t('politicavision.parametros')}</h3>
          <div className={styles.editorBody}>
            {sinConfigurar && <Alert variant="info" title={t('politicavision.sin_configurar')} description={t('politicavision.sin_configurar_detalle')} />}
            {saveError && <Alert variant="error" title={t('politicavision.no_se_pudo_guardar')} description={saveError.message} />}
            <fieldset className={styles.fields} disabled={!puedeEditar || saving}>
              {parametros.map((p) => {
                const errorCampo = PESOS.includes(p.nombre) ? errorPesos
                  : p.nombre === 'umbral_optima' || p.nombre === 'umbral_degradada' ? errorUmbrales : undefined;
                return (
                  <Input
                    key={p.nombre}
                    id={`pv-${p.nombre}`}
                    label={`${p.nombre}`}
                    type="number"
                    inputMode="decimal"
                    step={ENTERO.has(p.nombre) ? 1 : 0.01}
                    min={p.rango_minimo ?? undefined}
                    max={p.rango_maximo ?? undefined}
                    value={valores[p.nombre] ?? ''}
                    onChange={(e) => setValores((v) => ({ ...v, [p.nombre]: e.target.value }))}
                    hint={`${p.descripcion} · ${t('politicavision.rango', { min: p.rango_minimo, max: p.rango_maximo })}`}
                    error={errorCampo}
                  />
                );
              })}
            </fieldset>
            {puedeEditar && (
              <div className={styles.actions}>
                <Button type="submit" variant="primary" loading={saving} disabled={!puedeGuardar}>{t('politicavision.guardar')}</Button>
              </div>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
