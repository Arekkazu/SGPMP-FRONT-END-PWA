// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-84/RF-88/RF-109: periodicidad, parámetros por especie, costos de venta y matriz |
// | 2026-11-05 | Arekkazu | M06 prototipos: matriz contable con búsqueda y filtros; sin ids en pantalla |
// | 2026-11-11 | Arekkazu | USAB-M05-M06 RF-82..94: reporte de usabilidad del 11-11 (período por defecto, titular, formatos y nombres) |
import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, ACCION_U, R_CONFIGURACION } from '../rbac';
import { SENTIDOS, SUBTIPOS, TIPOS_HECHO } from '../types';
import type { Clasificacion, Configuracion, ParametroEspecie, Sentido, Subtipo, TipoCierre, TipoHecho } from '../types';
import {
  EncabezadoVista, ErrorApi, FILTROS, Listado, PANEL, SECUNDARIO, Subtitulo, TABLA, TD, TH, aFraccion, aPorcentaje, useAsync, useListado,
} from '../components/comunes';

export function ConfiguracionContableView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_CONFIGURACION, ACCION_R);
  const puedeEditar = usePermissionPorNombre(R_CONFIGURACION, ACCION_U);
  const puedeCrear = usePermissionPorNombre(R_CONFIGURACION, ACCION_C);
  const config = useAsync(finanzasApi.configuracion);
  const { ejecutar: cargar } = config;
  useEffect(() => { if (puedeLeer) cargar(); }, [puedeLeer, cargar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.configuracion')} />;
  const c = config.data;
  return (
    <>
      <EncabezadoVista titulo={t('config.titulo')} descripcion={t('config.descripcion')} />
      <ErrorApi error={config.error} />
      {c && c.lineas_pendientes_cuenta > 0 && (
        <Alert variant="warning" title={t('config.pendientes_titulo', { count: c.lineas_pendientes_cuenta })}
          description={t('config.pendientes_detalle')} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {c && (
        <>
          <General config={c} puedeEditar={puedeEditar} onGuardado={cargar} />
          <Especies config={c} puedeEditar={puedeEditar} onGuardado={cargar} />
          <Matriz config={c} puedeCrear={puedeCrear} puedeEditar={puedeEditar} onGuardado={cargar} />
        </>
      )}
    </>
  );
}

interface SeccionProps { config: Configuracion; puedeEditar: boolean; onGuardado: () => void }

function General({ config, puedeEditar, onGuardado }: SeccionProps) {
  const { t } = useT('finanzas');
  const g = config.general;
  const [tipo, setTipo] = useState<TipoCierre>(g.tipo_cierre);
  const [umbral, setUmbral] = useState(String(Number(g.pct_umbral_desviacion_precio)));
  const [dias, setDias] = useState(String(g.dias_alerta_vencimiento_precio));
  const guardado = useAsync(finanzasApi.actualizarConfiguracion);
  const umbralValido = Number(umbral) > 0 && Number(umbral) <= 1000;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!umbralValido) return;
    const r = await guardado.ejecutar({ tipo_cierre: tipo, pct_umbral_desviacion_precio: umbral, dias_alerta_vencimiento_precio: Number(dias) as 7 | 15 | 30 });
    if (r) { pushToast('success', t('config.guardado')); onGuardado(); }
  };

  return (
    <section aria-labelledby="cfg-general" style={PANEL}>
      <h2 id="cfg-general" style={{ margin: '0 0 var(--s4)', fontSize: 'var(--fs-heading-sm)', fontWeight: 700 }}>{t('config.general')}</h2>
      <ErrorApi error={guardado.error} />
      <form onSubmit={guardar} style={FILTROS}>
        <Select id="cfg-tipo" label={t('config.tipo_cierre')} value={tipo} disabled={!puedeEditar} onChange={(e) => setTipo(e.target.value as TipoCierre)}>
          {(['MENSUAL', 'TRIMESTRAL', 'ANUAL'] as const).map((x) => <option key={x} value={x}>{t(`tipo_cierre.${x}`)}</option>)}
        </Select>
        <Input id="cfg-umbral" label={t('config.umbral')} type="number" min={0.01} max={1000} step="any" value={umbral} disabled={!puedeEditar}
          onChange={(e) => setUmbral(e.target.value)} hint={t('config.umbral_ayuda')} error={umbralValido ? undefined : t('config.umbral_invalido')} />
        <Select id="cfg-dias" label={t('config.dias_alerta')} value={dias} disabled={!puedeEditar} onChange={(e) => setDias(e.target.value)}>
          {[7, 15, 30].map((d) => <option key={d} value={d}>{t('config.dias', { count: d })}</option>)}
        </Select>
        {puedeEditar && (
          <div style={{ paddingBottom: 'var(--s1)' }}>
            <Button type="submit" variant="primary" size="md" loading={guardado.cargando}><Save size={16} aria-hidden />{t('comun.guardar')}</Button>
          </div>
        )}
      </form>
      <p style={{ ...SECUNDARIO, margin: 'var(--s3) 0 0' }}>{t('config.tipo_cierre_ayuda')}</p>
    </section>
  );
}

function Especies({ config, puedeEditar, onGuardado }: SeccionProps) {
  const { t } = useT('finanzas');
  return (
    <>
      <Subtitulo>{t('config.especies')}</Subtitulo>
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s3)' }}>{t('config.especies_ayuda')}</p>
      <ScrollRegion label={t('config.especies')}>
        <table style={TABLA}>
          <thead>
            <tr>
              <th style={TH}>{t('col.especie')}</th><th style={TH}>{t('col.clasificacion')}</th><th style={TH}>{t('col.categoria')}</th>
              <th style={TH}>{t('col.vida_util')}</th><th style={TH}>{t('col.pct_transporte')}</th><th style={TH}>{t('col.pct_comisiones')}</th>
              <th style={TH}>{t('col.pct_impuestos')}</th>{puedeEditar && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
            </tr>
          </thead>
          <tbody>
            {config.especies.map((e) => (
              <FilaEspecie key={e.id_especie} especie={e} costo={config.costos_venta.find((c) => c.id_especie === e.id_especie)}
                puedeEditar={puedeEditar} onGuardado={onGuardado} />
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </>
  );
}

function FilaEspecie({ especie, costo, puedeEditar, onGuardado }: {
  especie: ParametroEspecie; costo?: Configuracion['costos_venta'][number]; puedeEditar: boolean; onGuardado: () => void;
}) {
  const { t } = useT('finanzas');
  const [clasificacion, setClasificacion] = useState<Clasificacion | ''>(especie.clasificacion ?? '');
  const [categoria, setCategoria] = useState(especie.categoria_precio ?? 'PESO_KG');
  const [vida, setVida] = useState(especie.vida_util_meses ? String(especie.vida_util_meses) : '');
  const [pct, setPct] = useState({ t: aPorcentaje(costo?.pct_transporte), c: aPorcentaje(costo?.pct_comisiones), i: aPorcentaje(costo?.pct_impuestos) });
  const parametro = useAsync(finanzasApi.guardarEspecie);
  const costos = useAsync(finanzasApi.guardarCostosVenta);
  const [aviso, setAviso] = useState<string>();
  const error = parametro.error ?? costos.error;
  const id = `esp-${especie.id_especie}`;

  const guardar = async () => {
    if (!clasificacion) { setAviso(t('config.clasificacion_requerida')); return; }
    const fr = { t: aFraccion(pct.t || '0'), c: aFraccion(pct.c || '0'), i: aFraccion(pct.i || '0') };
    if (fr.t === null || fr.c === null || fr.i === null) { setAviso(t('config.pct_invalido')); return; }
    const vidaUtil = vida.trim() ? Number(vida) : null;
    if (vidaUtil !== null && (!Number.isInteger(vidaUtil) || vidaUtil <= 0)) { setAviso(t('config.vida_invalida')); return; }
    setAviso(undefined);
    const ok = await parametro.ejecutar(especie.id_especie, { clasificacion, categoria_precio: categoria, vida_util_meses: vidaUtil });
    if (!ok) return;
    // Los costos de venta son versionados: solo se escribe una versión nueva si cambiaron.
    const cambio = !costo || fr.t !== String(Number(costo.pct_transporte)) || fr.c !== String(Number(costo.pct_comisiones)) || fr.i !== String(Number(costo.pct_impuestos));
    if (cambio && !(await costos.ejecutar(especie.id_especie, { pct_transporte: fr.t, pct_comisiones: fr.c, pct_impuestos: fr.i }))) return;
    pushToast('success', t('config.especie_guardada', { especie: especie.especie }));
    onGuardado();
  };

  const celdaPct = (k: 't' | 'c' | 'i', etiqueta: string) => (
    <td style={TD}>
      <Input id={`${id}-${k}`} aria-label={`${etiqueta} · ${especie.especie}`} type="number" min={0} max={100} step="any" value={pct[k]}
        disabled={!puedeEditar} onChange={(e) => setPct({ ...pct, [k]: e.target.value })} style={{ width: 90 }} />
    </td>
  );

  return (
    <tr>
      <td style={TD}>
        <strong>{especie.especie}</strong>
        {(aviso || error) && <div role="alert" style={{ color: 'var(--sem-error)', fontSize: 'var(--fs-body-sm)', marginTop: 'var(--s1)' }}>{aviso ?? error?.message}</div>}
      </td>
      <td style={TD}>
        <Select id={`${id}-clas`} aria-label={`${t('col.clasificacion')} · ${especie.especie}`} value={clasificacion} disabled={!puedeEditar}
          onChange={(e) => setClasificacion(e.target.value as Clasificacion)}>
          <option value="">{t('comun.sin_definir')}</option>
          <option value="PRODUCCION">{t('clasificacion.PRODUCCION')}</option>
          <option value="CONSUMO">{t('clasificacion.CONSUMO')}</option>
        </Select>
      </td>
      <td style={TD}>
        <Select id={`${id}-cat`} aria-label={`${t('col.categoria')} · ${especie.especie}`} value={categoria} disabled={!puedeEditar}
          onChange={(e) => setCategoria(e.target.value as 'PESO_KG' | 'POR_CABEZA')}>
          <option value="PESO_KG">{t('categoria.PESO_KG')}</option>
          <option value="POR_CABEZA">{t('categoria.POR_CABEZA')}</option>
        </Select>
      </td>
      <td style={TD}>
        <Input id={`${id}-vida`} aria-label={`${t('col.vida_util')} · ${especie.especie}`} type="number" min={1} step={1} value={vida}
          disabled={!puedeEditar} onChange={(e) => setVida(e.target.value)} style={{ width: 90 }} />
      </td>
      {celdaPct('t', t('col.pct_transporte'))}
      {celdaPct('c', t('col.pct_comisiones'))}
      {celdaPct('i', t('col.pct_impuestos'))}
      {puedeEditar && (
        <td style={TD}>
          <Button variant="secondary" size="sm" loading={parametro.cargando || costos.cargando} onClick={guardar}
            aria-label={`${t('comun.guardar')} ${especie.especie}`}>
            <Save size={14} aria-hidden />{t('comun.guardar')}
          </Button>
        </td>
      )}
    </tr>
  );
}

function Matriz({ config, puedeCrear, puedeEditar, onGuardado }: SeccionProps & { puedeCrear: boolean }) {
  const { t } = useT('finanzas');
  const [tipo, setTipo] = useState<TipoHecho>('RECONOCIMIENTO_DIFERENCIA');
  const [sentido, setSentido] = useState<Sentido>('GANANCIA');
  const [especie, setEspecie] = useState('');
  const [subtipo, setSubtipo] = useState('');
  const [debito, setDebito] = useState('');
  const [credito, setCredito] = useState('');
  const [aviso, setAviso] = useState<string>();
  const alta = useAsync(finanzasApi.guardarAsignacion);
  const baja = useAsync(finanzasApi.desactivarAsignacion);
  const nombreEspecie = (id: number | null) => (id === null ? t('comun.todas') : config.especies.find((e) => e.id_especie === id)?.especie ?? t('config.especie_inactiva'));
  const l = useListado(config.matriz, (a) => `${t(`hecho.${a.tipo_hecho}`)} ${nombreEspecie(a.id_especie)} ${a.cuenta_debito} ${a.cuenta_credito}`, [
    { id: 'hecho', etiqueta: t('col.tipo_hecho'), valor: (a) => a.tipo_hecho, texto: (v) => t(`hecho.${v}`) },
    { id: 'sentido', etiqueta: t('col.sentido'), valor: (a) => a.sentido, texto: (v) => t(`sentido.${v}`) },
    { id: 'especie', etiqueta: t('col.especie'), valor: (a) => String(a.id_especie ?? 'TODAS'), texto: (v) => (v === 'TODAS' ? t('config.todas_especies') : nombreEspecie(Number(v))), femenino: true },
  ]);
  const aplicaSubtipo = tipo === 'CONSUMO_INSUMO' || tipo === 'MANO_OBRA_PROPIA';

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{1,20}$/.test(debito) || !/^\d{1,20}$/.test(credito)) { setAviso(t('config.cuenta_invalida')); return; }
    if (debito === credito) { setAviso(t('config.cuentas_iguales')); return; }
    setAviso(undefined);
    const r = await alta.ejecutar({
      tipo_hecho: tipo, sentido, id_especie: especie ? Number(especie) : null,
      subtipo_costo: aplicaSubtipo && subtipo ? (subtipo as Subtipo) : null, cuenta_debito: debito, cuenta_credito: credito,
    });
    if (r) {
      pushToast('success', t('config.asignacion_guardada'), r.lineas_resueltas ? t('config.lineas_resueltas', { count: r.lineas_resueltas }) : undefined);
      setDebito(''); setCredito('');
      onGuardado();
    }
  };

  const quitar = async (id: number) => { if (await baja.ejecutar(id)) onGuardado(); };

  return (
    <>
      <Subtitulo>{t('config.matriz')}</Subtitulo>
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s3)' }}>{t('config.matriz_ayuda')}</p>
      <ErrorApi error={alta.error ?? baja.error} />
      {puedeCrear && (
        <form onSubmit={agregar} style={{ ...FILTROS, ...PANEL, marginBottom: 'var(--s4)' }}>
          <Select id="mz-tipo" label={t('col.tipo_hecho')} value={tipo} onChange={(e) => setTipo(e.target.value as TipoHecho)}>
            {TIPOS_HECHO.map((x) => <option key={x} value={x}>{t(`hecho.${x}`)}</option>)}
          </Select>
          <Select id="mz-sentido" label={t('col.sentido')} value={sentido} onChange={(e) => setSentido(e.target.value as Sentido)}>
            {SENTIDOS.map((x) => <option key={x} value={x}>{t(`sentido.${x}`)}</option>)}
          </Select>
          <Select id="mz-especie" label={t('col.especie')} value={especie} onChange={(e) => setEspecie(e.target.value)}>
            <option value="">{t('comun.todas')}</option>
            {config.especies.map((x) => <option key={x.id_especie} value={x.id_especie}>{x.especie}</option>)}
          </Select>
          {aplicaSubtipo && (
            <Select id="mz-subtipo" label={t('col.subtipo')} value={subtipo} onChange={(e) => setSubtipo(e.target.value)}>
              <option value="">{t('comun.todos')}</option>
              {SUBTIPOS.map((x) => <option key={x} value={x}>{t(`subtipo.${x}`)}</option>)}
            </Select>
          )}
          <Input id="mz-debito" label={t('col.cuenta_debito')} inputMode="numeric" required value={debito} onChange={(e) => setDebito(e.target.value.trim())} error={aviso} />
          <Input id="mz-credito" label={t('col.cuenta_credito')} inputMode="numeric" required value={credito} onChange={(e) => setCredito(e.target.value.trim())} />
          <div style={{ paddingBottom: 'var(--s1)' }}>
            <Button type="submit" variant="primary" size="md" loading={alta.cargando}><Plus size={16} aria-hidden />{t('config.asignar')}</Button>
          </div>
        </form>
      )}
      <Listado l={l} idBase="matriz" sustantivo={t('config.sustantivo')} buscar={t('config.buscar')} cargando={false}
        vacio={{ icono: <Plus size={28} aria-hidden />, titulo: t('config.matriz_vacia'), detalle: t('config.matriz_ayuda') }}>
        {(visibles) => (
          <table style={TABLA}>
            <thead>
              <tr>
                <th style={TH}>{t('col.tipo_hecho')}</th><th style={TH}>{t('col.sentido')}</th><th style={TH}>{t('col.especie')}</th>
                <th style={TH}>{t('col.subtipo')}</th><th style={TH}>{t('col.cuenta_debito')}</th><th style={TH}>{t('col.cuenta_credito')}</th>
                {puedeEditar && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((a) => (
                <tr key={a.id_asignacion_cuenta_contable}>
                  <td style={TD}>{t(`hecho.${a.tipo_hecho}`)}</td>
                  <td style={TD}>{t(`sentido.${a.sentido}`)}</td>
                  <td style={TD}>{nombreEspecie(a.id_especie)}</td>
                  <td style={TD}>{a.subtipo_costo ? t(`subtipo.${a.subtipo_costo}`) : t('comun.todos')}</td>
                  <td style={TD}><span className="fin-mono">{a.cuenta_debito}</span></td>
                  <td style={TD}><span className="fin-mono">{a.cuenta_credito}</span></td>
                  {puedeEditar && (
                    <td style={TD}>
                      <Button variant="ghost" size="sm" onClick={() => quitar(a.id_asignacion_cuenta_contable)}
                        aria-label={t('config.quitar_asignacion_aria', { hecho: t(`hecho.${a.tipo_hecho}`), especie: nombreEspecie(a.id_especie) })}>
                        <Trash2 size={14} aria-hidden />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Listado>
    </>
  );
}
