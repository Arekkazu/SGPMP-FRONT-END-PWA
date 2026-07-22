import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { useIdentidadVisual } from '../hooks/useIdentidadVisual';
import { useFincas } from '../hooks/useFincas';
import type { FincaResponse } from '../types';

// ── Finca selector ────────────────────────────────────────────────────────────
function FincaSelectorIdent({ onSelect }: { onSelect: (f: FincaResponse) => void }) {
  const { fincas, loading, cargar } = useFincas();
  useEffect(() => { cargar(); }, [cargar]);
  const activas = fincas.filter((f) => f.es_activo);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--s4)' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 80, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s infinite' }} />
        ))}
      </div>
    );
  }

  if (activas.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay fincas activas disponibles.</p>;
  }

  return (
    <div>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>
        Selecciona la finca para configurar su identidad visual:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--s4)' }}>
        {activas.map((f) => (
          <button
            key={f.id_finca}
            type="button"
            onClick={() => onSelect(f)}
            style={{
              padding: 'var(--s4)',
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--r-lg)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand-500)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--surface-border)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}>
              {f.nombre}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {f.ubicacion.municipio}, {f.ubicacion.departamento}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Color field ───────────────────────────────────────────────────────────────
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(value);

  useEffect(() => { setHex(value); }, [value]);

  const handleHexChange = (v: string) => {
    setHex(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
        <input
          type="color"
          value={value}
          onChange={(e) => { onChange(e.target.value); setHex(e.target.value); }}
          style={{ width: 40, height: 40, border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', cursor: 'pointer', padding: 2 }}
          aria-label={label}
        />
        <input
          type="text"
          value={hex}
          maxLength={7}
          onChange={(e) => handleHexChange(e.target.value)}
          style={{
            flex: 1,
            padding: 'var(--s2) var(--s3)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--r-md)',
            background: 'var(--surface-card)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
          }}
          aria-label={`Hex ${label}`}
        />
      </div>
    </div>
  );
}

// ── Live preview ──────────────────────────────────────────────────────────────
function LivePreview({ primary, secondary, orgName }: { primary: string; secondary: string; orgName: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        background: '#f8f9fa',
      }}
    >
      <div style={{ padding: 'var(--s2)', background: '#eee', fontSize: '11px', color: '#888', textAlign: 'center' }}>
        Vista previa
      </div>
      <div style={{ display: 'flex', height: 140 }}>
        {/* Mini sidebar */}
        <div style={{ width: 80, background: primary, padding: 'var(--s2)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#fff', opacity: 0.95, lineHeight: 1.2 }}>
            {orgName || 'Organización'}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
          ))}
          <div style={{ height: 8, borderRadius: 2, background: secondary, opacity: 0.8 }} />
        </div>
        {/* Content area */}
        <div style={{ flex: 1, padding: 'var(--s3)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
          <div style={{ height: 10, borderRadius: 2, background: primary, width: '60%' }} />
          <div style={{ height: 6, borderRadius: 2, background: '#ddd', width: '80%' }} />
          <div style={{ height: 6, borderRadius: 2, background: '#ddd', width: '50%' }} />
          <div style={{ marginTop: 'var(--s2)', display: 'flex', gap: 'var(--s2)' }}>
            <div style={{ height: 24, flex: 1, borderRadius: 4, background: primary }} />
            <div style={{ height: 24, flex: 1, borderRadius: 4, background: secondary, opacity: 0.7 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Form section ──────────────────────────────────────────────────────────────
interface FormSectionProps {
  finca: FincaResponse;
  onBack: () => void;
}

function IdentidadForm({ finca, onBack }: FormSectionProps) {
  const online = useOnlineStatus();
  const puedeEditar = usePermission(23, 3);
  const puedeCrear = usePermission(23, 1);

  const { identidad, loading, saving, error, saveError, conflicto412, cargar, guardar, actualizar } = useIdentidadVisual();

  const [primaryColor, setPrimaryColor] = useState('#1e6b4a');
  const [secondaryColor, setSecondaryColor] = useState('#4caf50');
  const [orgName, setOrgName] = useState('');
  const [orgNameErr, setOrgNameErr] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cargar(finca.id_finca); }, [cargar, finca.id_finca]);

  useEffect(() => {
    if (identidad) {
      setPrimaryColor(identidad.primary_color);
      setSecondaryColor(identidad.secondary_color);
      setOrgName(identidad.org_display_name);
      if (identidad.logo_path) {
        setLogoPreview(identidad.logo_path);
      }
    }
  }, [identidad]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    if (!orgName.trim()) { setOrgNameErr('El nombre es requerido.'); return; }
    setOrgNameErr('');

    let ok: boolean;
    if (identidad) {
      const version = identidad.version ?? 0;
      ok = await actualizar(
        finca.id_finca,
        { primary_color: primaryColor, secondary_color: secondaryColor, org_display_name: orgName.trim(), version },
        logoFile ?? undefined,
      );
    } else {
      ok = await guardar(
        { id_finca: finca.id_finca, primary_color: primaryColor, secondary_color: secondaryColor, org_display_name: orgName.trim() },
        logoFile ?? undefined,
      );
    }
    if (ok) setSaved(true);
  };

  const canSave = online && (identidad ? puedeEditar : puedeCrear);

  if (loading) {
    return (
      <div>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 48, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', marginBottom: 'var(--s4)', animation: 'pulse 1.4s infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--brand-600)', cursor: 'pointer', fontSize: '14px', padding: 0 }}
        >
          Fincas
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>›</span>
        <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{finca.nombre}</span>
      </div>

      {!online && (
        <Alert variant="warning" title="Sin conexión" description="Las acciones de escritura están deshabilitadas." style={{ marginBottom: 'var(--s4)' }} />
      )}
      {conflicto412 && (
        <Alert variant="error" title="Conflicto de concurrencia" description="Otro usuario modificó este registro. Recarga para ver los datos actuales antes de guardar." style={{ marginBottom: 'var(--s4)' }} />
      )}
      {error && (
        <Alert variant="error" title="Error al cargar" description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {saveError && (
        <Alert variant="error" title="Error al guardar" description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {saved && (
        <Alert variant="success" title="Guardado" description="Identidad visual actualizada correctamente." style={{ marginBottom: 'var(--s4)' }} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s7)', alignItems: 'start' }}>
        {/* Left: inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          {/* Logo upload zone */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>
              Logo de la organización
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                borderRadius: 'var(--r-lg)',
                padding: 'var(--s5)',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'var(--surface-hover)' : 'var(--surface-card)',
                transition: 'border-color 0.15s, background 0.15s',
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--s2)',
              }}
            >
              {logoPreview ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    style={{ maxHeight: 80, maxWidth: 160, objectFit: 'contain', borderRadius: 'var(--r-sm)' }}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); }}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      background: 'var(--sem-error)',
                      border: 'none',
                      borderRadius: 'var(--r-full)',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                    }}
                    aria-label="Quitar logo"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={24} style={{ color: 'var(--text-muted)' }} aria-hidden />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Arrastra un logo o haz clic para seleccionar
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PNG, JPG, SVG — máx. 2 MB</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              aria-label="Seleccionar logo"
            />
          </div>

          {/* Colors */}
          <ColorField label="Color primario" value={primaryColor} onChange={setPrimaryColor} />
          <ColorField label="Color secundario" value={secondaryColor} onChange={setSecondaryColor} />

          {/* Org name */}
          <div>
            <label htmlFor="org-name" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>
              Nombre de la organización <span aria-hidden>*</span>
            </label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onBlur={() => { if (!orgName.trim()) setOrgNameErr('El nombre es requerido.'); else setOrgNameErr(''); }}
              placeholder="Ej. Agropecuaria San José"
              maxLength={100}
              aria-required="true"
              error={orgNameErr}
            />
          </div>
        </div>

        {/* Right: live preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Vista previa en vivo</div>
          <LivePreview primary={primaryColor} secondary={secondaryColor} orgName={orgName} />
        </div>
      </div>

      <div style={{ marginTop: 'var(--s6)', display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="primary" size="md" loading={saving} disabled={!canSave || saving}>
          {identidad ? 'Actualizar identidad' : 'Guardar identidad'}
        </Button>
      </div>
    </form>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function IdentidadVisualSection() {
  const [finca, setFinca] = useState<FincaResponse | null>(null);

  return (
    <div>
      <div style={{ marginBottom: 'var(--s5)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Identidad Visual
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
          Logo, colores de marca y nombre de la organización por finca
        </p>
      </div>

      {finca ? (
        <IdentidadForm finca={finca} onBack={() => setFinca(null)} />
      ) : (
        <FincaSelectorIdent onSelect={setFinca} />
      )}
    </div>
  );
}
