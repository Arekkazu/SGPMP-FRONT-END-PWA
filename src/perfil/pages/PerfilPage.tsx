import React, { useEffect, useState } from 'react';
import { formatearFecha, formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { User, Lock, Edit2 } from 'lucide-react';
import { usePerfil } from '../hooks/usePerfil';
import { PerfilForm } from '../components/PerfilForm';
import { CambiarContrasenaForm } from '../components/CambiarContrasenaForm';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { Button } from '../../shared/design-system/Button';
import { mascararId } from '../../shared/lib/mascararId';
import { varianteRol, varianteEstado } from '../../shared/lib/varianteBadge';

function formatFecha(fecha: string | undefined): string {
  if (!fecha) return '—';
  try {
    return formatearFecha(fecha, { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return fecha;
  }
}

function formatFechaHora(fecha: string | undefined): string {
  if (!fecha) return '—';
  try {
    return formatearFechaHora(fecha, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return fecha;
  }
}

export function PerfilPage() {
  const { t } = useT('perfil');
  const { perfil, loading, error, saving, saveError, saveSuccess, pwError, pwSuccess, cargar, editar, cambiarContrasena } = usePerfil();
  const [seccionAbierta, setSeccionAbierta] = useState<'ninguna' | 'editar' | 'contrasena'>('ninguna');

  useEffect(() => {
    cargar();
  }, [cargar]);

  const toggleSeccion = (seccion: 'editar' | 'contrasena') => {
    setSeccionAbierta((prev) => prev === seccion ? 'ninguna' : seccion);
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--s6)', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 80, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--s6)' }}>
        <Alert variant="error" title={t('perfilpage.error_al_cargar_perfil')} description={error.message} />
      </div>
    );
  }

  if (!perfil) return null;

  const iniciales = (perfil.nombre[0] ?? '') + (perfil.apellidos[0] ?? '');

  return (
    <div style={{ padding: 'var(--s6)', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--s5)' }}>
        <h1 style={{ fontSize: 'var(--fs-heading-md)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{t('perfilpage.mi_perfil')}</h1>
        <p style={{ fontSize: 'var(--fs-body-lg)', color: 'var(--text-secondary)' }}>{t('perfilpage.consulta_y_gestion_de_tu_informacion')}</p>
      </div>

      {/* Hero card */}
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--r-xl)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 'var(--s5)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: 7,
          background: 'linear-gradient(90deg, var(--brand-600) 0%, var(--brand-400) 50%, var(--brand-300) 100%)',
        }} />
        <div style={{ padding: 'var(--s5)', display: 'flex', alignItems: 'center', gap: 'var(--s5)', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brand-100) 0%, var(--brand-300) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-700)',
              border: '3px solid var(--surface-card)',
              boxShadow: '0 0 0 1px var(--surface-border), var(--shadow-sm)',
            }} aria-hidden>
              {iniciales}
            </div>
            <div style={{
              position: 'absolute', bottom: 3, right: 3, width: 13, height: 13,
              borderRadius: '50%',
              background: perfil.estado_cuenta.toUpperCase() === 'ACTIVO' ? 'var(--sem-success)' : 'var(--sem-warning)',
              border: '2px solid var(--surface-card)',
            }} aria-hidden />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 'var(--fs-heading-sm)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
              {perfil.nombre} {perfil.apellidos}
            </p>
            <p style={{ fontSize: 'var(--fs-mono-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--s2)' }}>
              {perfil.correo_electronico}
            </p>
            <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
              <Badge variant={varianteRol(perfil.nombre_rol)}>{perfil.nombre_rol}</Badge>
              <Badge variant={varianteEstado(perfil.estado_cuenta)}>{perfil.estado_cuenta}</Badge>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => toggleSeccion('editar')}
              aria-pressed={seccionAbierta === 'editar'}
            >
              <Edit2 size={14} aria-hidden />{t('perfilpage.editar_perfil')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => toggleSeccion('contrasena')}
              aria-pressed={seccionAbierta === 'contrasena'}
            >
              <Lock size={14} aria-hidden />{t('perfilpage.cambiar_contrasena')}
            </Button>
          </div>
        </div>
      </div>

      {/* Info cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s4)', marginBottom: 'var(--s5)' }}>

        {/* Información personal */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--s3) var(--s4)', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <div style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--brand-50)', border: '1px solid var(--brand-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)' }}>
              <User size={13} aria-hidden />
            </div>
            <span style={{ fontSize: 'var(--fs-label-md)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('perfilpage.informacion_personal')}</span>
          </div>
          <div style={{ padding: 'var(--s4)' }}>
            <InfoGrid items={[
              ['perfilpage.nombres', perfil.nombre],
              ['perfilpage.apellidos', perfil.apellidos],
              ['perfilpage.tipo_de_id', perfil.tipo_identificacion],
              ['perfilpage.numero_identificacion', mascararId(perfil.numero_identificacion), true],
              ['perfilpage.fecha_de_nacimiento', formatFecha(perfil.fecha_nacimiento), true],
              ['perfilpage.fecha_de_registro', formatFecha(perfil.fecha_registro), true],
              ['perfilpage.telefono', perfil.telefono ?? '—', true],
              ['perfilpage.direccion', perfil.direccion ?? '—'],
            ]} />
          </div>
        </div>

        {/* Datos de cuenta */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--s3) var(--s4)', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <div style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--brand-50)', border: '1px solid var(--brand-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)' }}>
              <Lock size={13} aria-hidden />
            </div>
            <span style={{ fontSize: 'var(--fs-label-md)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('perfilpage.datos_de_cuenta')}</span>
          </div>
          <div style={{ padding: 'var(--s4)' }}>
            <div style={{ paddingBottom: 'var(--s3)', borderBottom: '1px solid var(--surface-border)', marginBottom: 'var(--s3)' }}>
              <p style={{ fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>{t('perfilpage.correo_electronico')}</p>
              <p style={{ fontSize: 'var(--fs-body-md)', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{perfil.correo_electronico}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
              <div>
                <p style={{ fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)', marginBottom: 6 }}>{t('perfilpage.estado_de_cuenta')}</p>
                <Badge variant={varianteEstado(perfil.estado_cuenta)}>{perfil.estado_cuenta}</Badge>
              </div>
              <div>
                <p style={{ fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)', marginBottom: 6 }}>{t('perfilpage.rol_asignado')}</p>
                <Badge variant={varianteRol(perfil.nombre_rol)}>{perfil.nombre_rol}</Badge>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <p style={{ fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>{t('perfilpage.ultimo_acceso')}</p>
                <p style={{ fontSize: 'var(--fs-body-md)', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatFechaHora(perfil.ultimo_acceso)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel editar datos personales */}
      {seccionAbierta === 'editar' && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s5)', marginBottom: 'var(--s5)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s4)' }}>
            <Edit2 size={16} color="var(--brand-600)" aria-hidden />
            <h2 style={{ fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('perfilpage.editar_datos_personales')}</h2>
          </div>
          <PerfilForm
            perfil={perfil}
            saving={saving}
            saveError={saveError}
            saveSuccess={saveSuccess}
            onSave={editar}
          />
        </div>
      )}

      {/* Panel cambiar contraseña */}
      {seccionAbierta === 'contrasena' && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s5)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s4)' }}>
            <Lock size={16} color="var(--brand-600)" aria-hidden />
            <h2 style={{ fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('perfilpage.cambiar_contrasena')}</h2>
          </div>
          <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>{t('perfilpage.al_cambiar_tu_contrasena_se_cerraran_todas')}</p>
          <CambiarContrasenaForm
            saving={saving}
            pwError={pwError}
            pwSuccess={pwSuccess}
            onSave={cambiarContrasena}
          />
        </div>
      )}
    </div>
  );
}

function InfoGrid({ items }: { items: [string, string, boolean?][] }) {
  const { t } = useT('perfil');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
      {items.map(([claveLabel, value, mono], i) => (
        <div
          key={claveLabel}
          style={{
            padding: 'var(--s3) 0',
            borderBottom: i < items.length - 2 ? '1px solid var(--surface-border)' : 'none',
            paddingRight: i % 2 === 0 ? 'var(--s4)' : 0,
            paddingLeft: i % 2 === 1 ? 'var(--s4)' : 0,
            borderLeft: i % 2 === 1 ? '1px solid var(--surface-border)' : 'none',
          }}
        >
          <p style={{ fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)', marginBottom: 3 }}>
            {t(claveLabel)}
          </p>
          <p style={{
            fontSize: 'var(--fs-body-md)', fontWeight: 500, color: 'var(--text-primary)',
            fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
