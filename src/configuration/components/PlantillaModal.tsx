import React, { useState, useEffect } from 'react';
import { useT } from '../../shared/i18n/useT';
import { X, Check } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { useEspecies } from '../hooks/useEspecies';
import { capturarConfiguracionEspecie } from '../api/especiesConfigApi';
import { CATEGORIAS_PLANTILLA } from '../types';
import type { CategoriaPlantilla, RegistrarPlantillaDTO, SnapshotEspecie } from '../types';
import type { ApiError } from '../../shared/api/errors';

// ── Categorías del RF-30 ──────────────────────────────────────────────────────
// Las claves son las que espera `params_snapshot` en el backend; no se traducen
// (son datos, no rótulos). Dispositivos IoT, infraestructura, dashboard e
// identidad visual quedan fuera del alcance del RF a propósito.
const ICONOS: Record<CategoriaPlantilla, string> = {
  ciclos_biologicos: '🔄',
  patologias: '🦠',
  metricas_produccion: '📊',
  umbrales_ambientales: '🌡️',
};

interface Props {
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: RegistrarPlantillaDTO) => Promise<boolean>;
}

export function PlantillaModal({ saving, saveError, onClose, onRegistrar }: Props) {
  const { t } = useT('configuration');
  const { especies, cargar } = useEspecies();
  useEffect(() => { cargar(); }, [cargar]);
  const activas = especies.filter((e) => e.es_activo);

  const [nombre, setNombre] = useState('');
  const [nombreErr, setNombreErr] = useState('');
  const [idEspecie, setIdEspecie] = useState<number | ''>('');
  const [especieErr, setEspecieErr] = useState('');
  const [seleccionadas, setSeleccionadas] = useState<Set<CategoriaPlantilla>>(
    () => new Set(CATEGORIAS_PLANTILLA)
  );

  // Configuración real de la especie elegida. Es lo que se guarda en la
  // plantilla: sin ella el snapshot serían banderas booleanas que el backend
  // rechaza y que RF-32 no podría diferenciar en el antes/después.
  const [config, setConfig] = useState<SnapshotEspecie | null>(null);
  const [cargandoConfig, setCargandoConfig] = useState(false);
  const [configErr, setConfigErr] = useState('');

  useEffect(() => {
    if (!idEspecie) { setConfig(null); setConfigErr(''); return; }
    let vigente = true;
    setCargandoConfig(true);
    setConfigErr('');
    capturarConfiguracionEspecie(idEspecie as number)
      .then((snapshot) => { if (vigente) setConfig(snapshot); })
      .catch(() => {
        if (!vigente) return;
        setConfig(null);
        setConfigErr(t('plantillamodal.no_se_pudo_leer_la_configuracion'));
      })
      .finally(() => { if (vigente) setCargandoConfig(false); });
    // La especie puede cambiar antes de que responda la petición anterior:
    // `vigente` descarta la respuesta que ya no corresponde a la selección.
    return () => { vigente = false; };
  }, [idEspecie, t]);

  const conteo = (categoria: CategoriaPlantilla) => config?.[categoria].length ?? 0;

  const toggleCategoria = (categoria: CategoriaPlantilla) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(categoria)) next.delete(categoria);
      else next.add(categoria);
      return next;
    });
  };

  /** Copia los parámetros reales de las categorías marcadas que tienen datos. */
  const buildSnapshot = (): Record<string, unknown> => {
    if (!config) return {};
    const snapshot: Record<string, unknown> = {};
    for (const categoria of CATEGORIAS_PLANTILLA) {
      if (seleccionadas.has(categoria) && config[categoria].length > 0) {
        snapshot[categoria] = config[categoria];
      }
    }
    return snapshot;
  };

  // El RF-31 rechaza la plantilla vacía con 400; el botón no llega a enviarla.
  const totalParametros = CATEGORIAS_PLANTILLA.filter((c) => seleccionadas.has(c))
    .reduce((suma, c) => suma + conteo(c), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!nombre.trim()) { setNombreErr(t('plantillamodal.el_nombre_es_requerido')); valid = false; }
    else setNombreErr('');
    if (!idEspecie) { setEspecieErr(t('plantillamodal.selecciona_una_especie_error')); valid = false; }
    else setEspecieErr('');
    if (totalParametros === 0) return; // el botón ya está deshabilitado
    if (!valid) return;

    const ok = await onRegistrar({
      template_name: nombre.trim(),
      id_especie: idEspecie as number,
      params_snapshot: buildSnapshot(),
    });
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plantilla-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)', padding: 'var(--s4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface-card)', borderRadius: 'var(--r-xl)',
        border: '1px solid var(--surface-border)', width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, background: 'var(--surface-card)', zIndex: 1,
          padding: 'var(--s5) var(--s6)', borderBottom: '1px solid var(--surface-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 id="plantilla-modal-title" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('plantillamodal.nueva_plantilla_de_configuracion')}</h2>
          <button type="button" onClick={onClose} style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: 'var(--r-full)', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }} aria-label={t('plantillamodal.cerrar')}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 'var(--s6)', display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
            {saveError && (
              <Alert variant="error" title={t('plantillamodal.error_al_crear')} description={saveError.message} />
            )}

            {/* Nombre */}
            <div>
              <label htmlFor="tpl-nombre" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>{t('plantillamodal.nombre_de_la_plantilla')}<span aria-hidden>*</span>
              </label>
              <Input
                id="tpl-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onBlur={() => { if (!nombre.trim()) setNombreErr(t('plantillamodal.el_nombre_es_requerido')); else setNombreErr(''); }}
                placeholder={t('plantillamodal.ej_config_estandar_pollos_de_engorde')}
                maxLength={100}
                aria-required="true"
                error={nombreErr}
              />
            </div>

            {/* Especie */}
            <div>
              <label htmlFor="tpl-especie" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>{t('plantillamodal.especie_base')}<span aria-hidden>*</span>
              </label>
              <select
                id="tpl-especie"
                value={idEspecie}
                onChange={(e) => { setIdEspecie(e.target.value ? Number(e.target.value) : ''); setEspecieErr(''); }}
                aria-required="true"
                style={{
                  width: '100%', padding: 'var(--s3) var(--s4)',
                  border: `1.5px solid ${especieErr ? 'var(--sem-error)' : 'var(--surface-border)'}`,
                  borderRadius: 'var(--r-md)', background: 'var(--surface-card)',
                  color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-sans)',
                  outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="">{t('plantillamodal.selecciona_una_especie')}</option>
                {activas.map((e) => (
                  <option key={e.id_especie} value={e.id_especie}>{e.nombre}</option>
                ))}
              </select>
              {especieErr && <p role="alert" style={{ fontSize: '11px', color: 'var(--sem-error)', marginTop: 'var(--s1)', fontWeight: 500 }}>{especieErr}</p>}
            </div>

            {/* Parámetros reales de la especie seleccionada */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s3)' }}>{t('plantillamodal.parametros_a_incluir_en_la_plantilla')}<span aria-hidden>*</span>
              </div>

              {!idEspecie && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('plantillamodal.selecciona_una_especie_para_ver_sus_parametros')}</p>
              )}
              {idEspecie && cargandoConfig && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('plantillamodal.leyendo_la_configuracion_de_la_especie')}</p>
              )}
              {configErr && (
                <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', fontWeight: 500 }}>{configErr}</p>
              )}

              {idEspecie && !cargandoConfig && config && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                  {CATEGORIAS_PLANTILLA.map((categoria) => {
                    const total = conteo(categoria);
                    const vacia = total === 0;
                    const checked = seleccionadas.has(categoria) && !vacia;
                    const etiqueta = t(`plantillamodal.categorias.${categoria}.label`);
                    return (
                      <button
                        key={categoria}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        aria-label={etiqueta}
                        disabled={vacia}
                        onClick={() => toggleCategoria(categoria)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--s3)',
                          width: '100%', padding: 'var(--s3) var(--s4)',
                          border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)',
                          background: checked ? 'var(--sem-success-bg, #f0f7ee)' : 'transparent',
                          textAlign: 'left', transition: 'background 0.1s',
                          cursor: vacia ? 'not-allowed' : 'pointer', opacity: vacia ? 0.55 : 1,
                        }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                          border: `2px solid ${checked ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                          background: checked ? 'var(--brand-500)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {checked && <Check size={10} color="#fff" />}
                        </div>
                        <span role="img" aria-hidden>{ICONOS[categoria]}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }} title={etiqueta}>{etiqueta}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {vacia
                              ? t('plantillamodal.sin_parametros_configurados')
                              : t('plantillamodal.parametros_disponibles', { count: total })}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {idEspecie && !cargandoConfig && config && totalParametros === 0 && (
                <p role="alert" style={{ fontSize: '11px', color: 'var(--sem-error)', marginTop: 'var(--s2)', fontWeight: 500 }}>{t('plantillamodal.selecciona_al_menos_un_parametro')}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: 'var(--s4) var(--s6)', borderTop: '1px solid var(--surface-border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
            <Button variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('plantillamodal.cancelar')}</Button>
            <Button type="submit" variant="primary" size="md" loading={saving} disabled={saving || cargandoConfig || totalParametros === 0}>{t('plantillamodal.crear_plantilla')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
