// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107 RNF-03: el Administrador edita los mensajes de error sin tocar código |
import React, { useEffect, useState } from 'react';
import { MessageSquareWarning, Pencil, Trash2 } from 'lucide-react';
import { http } from '../../shared/api/http';
import type { ApiError } from '../../shared/api/errors';
import { cargarCatalogoErrores } from '../../shared/api/catalogoErrores';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Select } from '../../shared/design-system/Select';
import { avisarExito } from '../../shared/hooks/useToast';
import i18n from '../../shared/i18n';
import { useT } from '../../shared/i18n/useT';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';

interface MensajeError {
  clave: string;
  idioma: 'es-CO' | 'en-US';
  mensaje: string;
  texto_accion: string | null;
  ruta_accion: string | null;
  es_activo: boolean;
}

const VACIO: MensajeError = { clave: '', idioma: 'es-CO', mensaje: '', texto_accion: '', ruta_accion: '', es_activo: true };
const CLAVE = /^[A-Z0-9_]{2,80}$/;
const RUTA = /^[a-z0-9][a-z0-9/_-]{0,199}$/;

/**
 * RF-107 RNF-03: catálogo de mensajes de error. Cada clave (la del error que responde el sistema) tiene su texto en
 * lenguaje natural por idioma y, si aplica, un botón de acción que lleva a una pantalla del sistema. El front lo usa
 * en lugar del texto de la respuesta.
 */
export function MensajesErrorSection() {
  const { t } = useT('configuration');
  const puedeEditar = usePermissionPorNombre('catalogo_mensajes_error', 3);
  const puedeBorrar = usePermissionPorNombre('catalogo_mensajes_error', 4);
  const [mensajes, setMensajes] = useState<MensajeError[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [editando, setEditando] = useState<MensajeError | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const cargar = () => {
    http.get<MensajeError[]>('/configuracion/mensajes-error').then((r) => setMensajes(Array.isArray(r.data) ? r.data : []))
      .catch((e) => setError(e as ApiError));
  };
  useEffect(cargar, []);

  const validar = (m: MensajeError): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!CLAVE.test(m.clave)) e.clave = t('mensajeserror.clave_invalida');
    if (m.mensaje.trim().length < 5) e.mensaje = t('mensajeserror.mensaje_corto');
    if (Boolean(m.texto_accion?.trim()) !== Boolean(m.ruta_accion?.trim())) e.ruta_accion = t('mensajeserror.accion_incompleta');
    if (m.ruta_accion?.trim() && !RUTA.test(m.ruta_accion.trim().replace(/^\/+|\/+$/g, ''))) e.ruta_accion = t('mensajeserror.ruta_invalida');
    return e;
  };

  const guardar = async () => {
    if (!editando) return;
    const e = validar(editando);
    setErrores(e);
    if (Object.keys(e).length) return;
    setGuardando(true);
    try {
      await http.put(`/configuracion/mensajes-error/${editando.clave}`, {
        idioma: editando.idioma, mensaje: editando.mensaje.trim(), es_activo: editando.es_activo,
        texto_accion: editando.texto_accion?.trim() || null, ruta_accion: editando.ruta_accion?.trim() || null,
      });
      avisarExito('guardado', editando.clave);
      setEditando(null);
      cargar();
      void cargarCatalogoErrores(http, i18n.language);
    } catch (err) {
      const api = err as ApiError;
      setErrores({ [api.field ?? 'mensaje']: api.message });
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (m: MensajeError) => {
    try {
      await http.delete(`/configuracion/mensajes-error/${m.clave}`, { params: { idioma: m.idioma } });
      avisarExito('eliminado', m.clave);
      cargar();
      void cargarCatalogoErrores(http, i18n.language);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const set = (campo: keyof MensajeError, valor: string | boolean) => setEditando((m) => (m ? { ...m, [campo]: valor } : m));

  return (
    <section aria-labelledby="titulo-mensajes-error" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
      borderRadius: 'var(--r-lg)', padding: 'var(--s5)', marginTop: 'var(--s5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap' }}>
        <h2 id="titulo-mensajes-error" style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', margin: 0, fontSize: 16 }}>
          <MessageSquareWarning size={18} aria-hidden /> {t('mensajeserror.titulo')}
        </h2>
        {puedeEditar && <Button size="sm" onClick={() => { setErrores({}); setNuevo(true); setEditando({ ...VACIO }); }}>{t('mensajeserror.agregar')}</Button>}
      </div>
      <p style={{ color: 'var(--text-secondary)' }}>{t('mensajeserror.descripcion')}</p>
      {error && <Alert variant="error" title={t('mensajeserror.error')} description={error.message} onDismiss={() => setError(null)} />}
      {mensajes && (
        <div className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('mensajeserror.titulo')} style={{ overflowX: 'auto' }}>
          <table className="ds-tabla-tarjetas" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['clave', 'idioma', 'mensaje', 'boton', 'estado', 'acciones'].map((c) => (
                <th key={c} scope="col" style={{ textAlign: 'left', padding: 'var(--s2)' }}>{t(`mensajeserror.col.${c}`)}</th>))}</tr>
            </thead>
            <tbody>
              {mensajes.map((m) => (
                <tr key={`${m.clave}-${m.idioma}`} style={{ borderTop: '1px solid var(--surface-border)' }}>
                  <td data-label={t('mensajeserror.col.clave')} style={{ padding: 'var(--s2)', fontFamily: 'var(--font-mono)' }}>{m.clave}</td>
                  <td data-label={t('mensajeserror.col.idioma')} style={{ padding: 'var(--s2)' }}>{m.idioma}</td>
                  <td data-label={t('mensajeserror.col.mensaje')} style={{ padding: 'var(--s2)' }}>{m.mensaje}</td>
                  <td data-label={t('mensajeserror.col.boton')} style={{ padding: 'var(--s2)' }}>{m.texto_accion ? `${m.texto_accion} → /${m.ruta_accion}` : t('mensajeserror.sin_boton')}</td>
                  <td data-label={t('mensajeserror.col.estado')} style={{ padding: 'var(--s2)' }}>{m.es_activo ? t('mensajeserror.activo') : t('mensajeserror.inactivo')}</td>
                  <td data-label={t('mensajeserror.col.acciones')} style={{ padding: 'var(--s2)' }}>
                    {puedeEditar && <Button size="sm" variant="ghost" aria-label={t('mensajeserror.editar_aria', { clave: m.clave })}
                      onClick={() => { setErrores({}); setNuevo(false); setEditando({ ...m, texto_accion: m.texto_accion ?? '', ruta_accion: m.ruta_accion ?? '' }); }}>
                      <Pencil size={14} aria-hidden /></Button>}
                    {puedeBorrar && <Button size="sm" variant="ghost" aria-label={t('mensajeserror.borrar_aria', { clave: m.clave })}
                      onClick={() => void borrar(m)}><Trash2 size={14} aria-hidden /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editando && (
        <ModalShell title={nuevo ? t('mensajeserror.agregar') : t('mensajeserror.editar', { clave: editando.clave })}
                    onClose={() => setEditando(null)} maxWidth={560}
                    footer={<>
                      <Button variant="secondary" onClick={() => setEditando(null)} disabled={guardando}>{t('mensajeserror.cancelar')}</Button>
                      <Button onClick={() => void guardar()} loading={guardando}>{t('mensajeserror.guardar')}</Button>
                    </>}>
          <div style={{ display: 'grid', gap: 'var(--s3)' }}>
            <Input id="me-clave" label={t('mensajeserror.col.clave')} required value={editando.clave} disabled={!nuevo}
                   error={errores.clave} hint={t('mensajeserror.clave_ayuda')}
                   onChange={(e) => set('clave', e.target.value.toUpperCase())} />
            <Select id="me-idioma" label={t('mensajeserror.col.idioma')} value={editando.idioma} disabled={!nuevo}
                    onChange={(e) => set('idioma', e.target.value)}>
              <option value="es-CO">es-CO</option><option value="en-US">en-US</option>
            </Select>
            <div className="ds-field">
              <label className="ds-field__label" htmlFor="me-mensaje">{t('mensajeserror.col.mensaje')}<span aria-hidden> *</span></label>
              <textarea id="me-mensaje" className="ds-field__input" rows={3} maxLength={500} value={editando.mensaje}
                        aria-invalid={Boolean(errores.mensaje)} onChange={(e) => set('mensaje', e.target.value)} />
              {errores.mensaje && <p role="alert" className="ds-field__error">{errores.mensaje}</p>}
            </div>
            <Input id="me-texto" label={t('mensajeserror.texto_accion')} maxLength={80} value={editando.texto_accion ?? ''}
                   onChange={(e) => set('texto_accion', e.target.value)} />
            <Input id="me-ruta" label={t('mensajeserror.ruta_accion')} maxLength={200} value={editando.ruta_accion ?? ''}
                   error={errores.ruta_accion} hint={t('mensajeserror.ruta_ayuda')} onChange={(e) => set('ruta_accion', e.target.value)} />
            <label style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
              <input type="checkbox" checked={editando.es_activo} onChange={(e) => set('es_activo', e.target.checked)} />
              {t('mensajeserror.activo')}
            </label>
          </div>
        </ModalShell>
      )}
    </section>
  );
}
