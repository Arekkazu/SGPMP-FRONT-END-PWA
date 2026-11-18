// | Fecha      | Nombre   | Que se hizo                                                              |
// |------------|----------|--------------------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: «Configurar widget», controles armados desde sus opciones     |
import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import { useAuth } from '../../shared/auth/useAuth';
import { dashboardApi, type ValorOpcion } from '../../dashboard/api/dashboardApi';
import { useFincaActiva } from '../../dashboard/hooks/useFincaActiva';
import type { OpcionWidget, ParametrosWidget, WidgetCatalogoItem } from '../types';

interface Props {
  widget: WidgetCatalogoItem;
  parametros: ParametrosWidget;
  onAplicar: (parametros: ParametrosWidget) => void;
  onCancelar: () => void;
}

const MULTIPLES = new Set(['areas', 'especies', 'sensores']);

/**
 * Qué muestra un widget. Los controles salen de las opciones que publica el catálogo: un widget nuevo
 * no exige tocar este formulario. Las áreas, especies y sensores son los de la finca activa; sin elegir
 * nada, el widget muestra toda la finca. Lo elegido se guarda con el dashboard («Guardar configuración»).
 */
export function ConfigurarWidgetModal({ widget, parametros, onAplicar, onCancelar }: Props) {
  const { t } = useT('configuration');
  const dialogRef = useModalA11y(onCancelar);
  const { userInfo } = useAuth();
  const { fincas, idFinca, elegir } = useFincaActiva(userInfo?.id_usuario ?? null);
  const [valores, setValores] = useState<Record<string, ValorOpcion[]>>({});
  const [cargando, setCargando] = useState(true);
  const [elegidos, setElegidos] = useState<ParametrosWidget>(parametros);
  const opciones = widget.opciones ?? [];
  const necesitaFinca = opciones.some((o) => o.tipo !== 'lista');

  useEffect(() => {
    if (necesitaFinca && idFinca === null) return;
    let vigente = true;
    setCargando(true);
    dashboardApi.opciones(widget.clave, idFinca)
      .then((r) => { if (vigente) setValores(r); })
      .catch(() => { if (vigente) setValores({}); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [widget.clave, idFinca, necesitaFinca]);

  const fijar = (nombre: string, valor: ParametrosWidget[string]) => setElegidos((p) => ({ ...p, [nombre]: valor }));
  const etiquetaValor = (opcion: OpcionWidget, v: ValorOpcion) => v.nombre
    ? `${v.nombre}${v.area ? ` · ${v.area}` : ''}`
    : t(`dashboardlayoutsection.valor_opcion.${opcion.nombre}.${String(v.valor)}`, { defaultValue: String(v.valor) });

  const control = (opcion: OpcionWidget) => {
    const lista = valores[opcion.nombre] ?? [];
    const titulo = t(`dashboardlayoutsection.opcion.${opcion.nombre}`, { defaultValue: opcion.nombre });
    if (MULTIPLES.has(opcion.tipo)) {
      const marcados = new Set((elegidos[opcion.nombre] as number[] | undefined) ?? []);
      const alternar = (id: number) => {
        const siguiente = new Set(marcados);
        if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
        fijar(opcion.nombre, [...siguiente]);
      };
      return (
        <fieldset key={opcion.nombre} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{titulo}</legend>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px' }}>{t('dashboardlayoutsection.sin_elegir_todas')}</p>
          {lista.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{t('dashboardlayoutsection.sin_valores')}</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                {lista.map((v) => (
                  <label key={String(v.valor)} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                    <input type="checkbox" checked={marcados.has(Number(v.valor))} onChange={() => alternar(Number(v.valor))} />
                    {etiquetaValor(opcion, v)}
                  </label>
                ))}
              </div>
            )}
        </fieldset>
      );
    }
    const actual = elegidos[opcion.nombre] ?? opcion.defecto ?? '';
    return (
      <Select key={opcion.nombre} id={`opcion-${opcion.nombre}`} label={titulo} value={String(actual ?? '')}
        onChange={(e) => {
          const crudo = e.target.value;
          const original = lista.find((v) => String(v.valor) === crudo)?.valor;
          fijar(opcion.nombre, crudo === '' ? null : (original ?? crudo));
        }}>
        {opcion.tipo === 'area' && <option value="">{t('dashboardlayoutsection.todas_las_areas')}</option>}
        {lista.map((v) => <option key={String(v.valor)} value={String(v.valor)}>{etiquetaValor(opcion, v)}</option>)}
      </Select>
    );
  };

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="configurar-widget-titulo" className="ds-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onCancelar(); }}>
      <div className="ds-modal__panel ds-modal__panel--sm" style={{ padding: 'var(--s6)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
        <h2 id="configurar-widget-titulo" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          {t('dashboardlayoutsection.configurar_widget', { nombre: widget.nombre })}
        </h2>
        {necesitaFinca && fincas.length > 1 && (
          <Select id="configurar-finca" label={t('dashboardlayoutsection.finca_de_las_opciones')} value={idFinca ?? ''}
            onChange={(e) => elegir(Number(e.target.value))}>
            {fincas.map((f) => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
          </Select>
        )}
        {necesitaFinca && fincas.length === 0
          ? <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{t('dashboardlayoutsection.sin_fincas')}</p>
          : cargando ? <div aria-busy="true" style={{ height: 80, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)' }} />
            : opciones.map(control)}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancelar}>{t('dashboardlayoutsection.cancelar')}</Button>
          <Button variant="primary" size="md" onClick={() => onAplicar(elegidos)}>{t('dashboardlayoutsection.aplicar')}</Button>
        </div>
      </div>
    </div>
  );
}
