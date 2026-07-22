import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { useEspecies } from '../hooks/useEspecies';
import type { RegistrarPlantillaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

// ── Param groups ───────────────────────────────────────────────────────────────
const PARAM_GROUPS = [
  {
    grupo: 'Ciclos Biológicos',
    icon: '🔄',
    items: [
      { key: 'ciclos', label: 'Ciclos biológicos', hint: 'Nombre, descripción y duración en días' },
    ],
  },
  {
    grupo: 'Patologías',
    icon: '🦠',
    items: [
      { key: 'patologias', label: 'Catálogo de patologías', hint: 'Nombre y descripción de cada patología' },
    ],
  },
  {
    grupo: 'Métricas de Producción',
    icon: '📊',
    items: [
      { key: 'metricas', label: 'Métricas de producción', hint: 'Unidad de medida y tipo de activo' },
    ],
  },
  {
    grupo: 'Umbrales Ambientales',
    icon: '🌡️',
    items: [
      { key: 'umbrales', label: 'Umbrales ambientales', hint: 'Rangos normal / precaución / crítico' },
    ],
  },
  {
    grupo: 'Parámetros del Sistema',
    icon: '⚙️',
    items: [
      { key: 'parametros', label: 'Parámetros operativos', hint: 'Frecuencia de muestreo y heartbeat' },
    ],
  },
] as const;

type ParamKey = 'ciclos' | 'patologias' | 'metricas' | 'umbrales' | 'parametros';

interface Props {
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: RegistrarPlantillaDTO) => Promise<boolean>;
}

export function PlantillaModal({ saving, saveError, onClose, onRegistrar }: Props) {
  const { especies, cargar } = useEspecies();
  useEffect(() => { cargar(); }, [cargar]);
  const activas = especies.filter((e) => e.es_activo);

  const [nombre, setNombre] = useState('');
  const [nombreErr, setNombreErr] = useState('');
  const [idEspecie, setIdEspecie] = useState<number | ''>('');
  const [especieErr, setEspecieErr] = useState('');
  const [selectedParams, setSelectedParams] = useState<Set<ParamKey>>(new Set(['ciclos', 'patologias']));

  const toggleParam = (key: ParamKey) => {
    setSelectedParams((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildSnapshot = (): Record<string, unknown> => {
    const snap: Record<string, unknown> = {};
    for (const key of selectedParams) snap[key] = true;
    return snap;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!nombre.trim()) { setNombreErr('El nombre es requerido.'); valid = false; }
    else setNombreErr('');
    if (!idEspecie) { setEspecieErr('Selecciona una especie.'); valid = false; }
    else setEspecieErr('');
    if (selectedParams.size === 0) return; // button disabled in this case
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
          <h2 id="plantilla-modal-title" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Nueva Plantilla de Configuración
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: 'var(--r-full)', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }} aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 'var(--s6)', display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
            {saveError && (
              <Alert variant="error" title="Error al crear" description={saveError.message} />
            )}

            {/* Nombre */}
            <div>
              <label htmlFor="tpl-nombre" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>
                Nombre de la plantilla <span aria-hidden>*</span>
              </label>
              <Input
                id="tpl-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onBlur={() => { if (!nombre.trim()) setNombreErr('El nombre es requerido.'); else setNombreErr(''); }}
                placeholder="Ej. Config estándar pollos de engorde"
                maxLength={100}
                aria-required="true"
                error={nombreErr}
              />
            </div>

            {/* Especie */}
            <div>
              <label htmlFor="tpl-especie" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>
                Especie base <span aria-hidden>*</span>
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
                <option value="">Selecciona una especie…</option>
                {activas.map((e) => (
                  <option key={e.id_especie} value={e.id_especie}>{e.nombre}</option>
                ))}
              </select>
              {especieErr && <p role="alert" style={{ fontSize: '11px', color: 'var(--sem-error)', marginTop: 'var(--s1)', fontWeight: 500 }}>{especieErr}</p>}
            </div>

            {/* Params snapshot */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s3)' }}>
                Parámetros a incluir en la plantilla <span aria-hidden>*</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                {PARAM_GROUPS.map(({ grupo, icon, items }) => (
                  <div key={grupo} style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                    <div style={{ padding: 'var(--s2) var(--s4)', background: 'var(--surface-hover)', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                      <span role="img" aria-label={grupo}>{icon}</span>
                      {grupo}
                    </div>
                    <div style={{ padding: 'var(--s2)' }}>
                      {items.map(({ key, label, hint }) => {
                        const checked = selectedParams.has(key as ParamKey);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleParam(key as ParamKey)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 'var(--s3)',
                              width: '100%', padding: 'var(--s2) var(--s3)',
                              borderRadius: 'var(--r-md)', cursor: 'pointer',
                              background: checked ? 'var(--sem-success-bg, #f0f7ee)' : 'transparent',
                              border: 'none', textAlign: 'left', transition: 'background 0.1s',
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
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hint}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {selectedParams.size === 0 && (
                <p style={{ fontSize: '11px', color: 'var(--sem-error)', marginTop: 'var(--s2)', fontWeight: 500 }}>
                  Selecciona al menos un parámetro.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: 'var(--s4) var(--s6)', borderTop: '1px solid var(--surface-border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
            <Button variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="primary" size="md" loading={saving} disabled={saving || selectedParams.size === 0}>
              Crear plantilla
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
