import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Button } from '../../shared/design-system/Button';
import type { FiltrosAuditoria } from '../types';

// Espejo de `modulo1.tipos_eventos` (backend: `_NOMBRE_POR_TIPO_EVENTO` en
// identity_access/domain/value_objects/evento_categoria.py). Los IDs son los que
// viaja `tipo_evento`, tanto al filtrar como al etiquetar el CSV exportado.
export const TIPOS_EVENTO = [
  { id: 1,  label: 'REGISTRO_USUARIO' },
  { id: 2,  label: 'ACTIVACION_CUENTA' },
  { id: 3,  label: 'LOGIN_EXITOSO' },
  { id: 4,  label: 'LOGIN_FALLIDO' },
  { id: 5,  label: 'CIERRE_SESION' },
  { id: 6,  label: 'CAMBIO_CONTRASENA' },
  { id: 7,  label: 'SOLICITUD_RECUPERACION' },
  { id: 8,  label: 'RESTABLECIMIENTO_CONTRASENA' },
  { id: 9,  label: 'ACTUALIZACION_PERFIL' },
  { id: 10, label: 'CAMBIO_ESTADO_CUENTA' },
  { id: 11, label: 'CREACION_ROL' },
  { id: 12, label: 'MODIFICACION_ROL' },
  { id: 13, label: 'ELIMINACION_ROL' },
  { id: 14, label: 'ASIGNACION_PERMISO' },
  { id: 15, label: 'REVOCACION_PERMISO' },
  { id: 16, label: 'CONSULTA_AUDITORIA' },
  { id: 17, label: 'CONSULTA_LISTA_USUARIOS' },
  { id: 18, label: 'CONSULTA_DETALLE_USUARIO' },
  { id: 19, label: 'CONSULTA_PERFIL_PROPIO' },
  { id: 20, label: 'LOGIN_SSO_EXITOSO' },
  { id: 21, label: 'PROVISION_SSO_MINIMA' },
  { id: 22, label: 'PROVISION_AGROFUSION_SYNC' },
  { id: 23, label: 'REFRESH_TOKEN_ROTADO' },
  { id: 24, label: 'REUSO_TOKEN_REFRESCO_DETECTADO' },
  { id: 25, label: 'FALLO_ARCHIVADO_AUDITORIA' },
];

interface Props {
  onBuscar: (filtros: Partial<FiltrosAuditoria>) => void;
  onReset: () => void;
}

export function AuditoriaFiltros({ onBuscar, onReset }: Props) {
  const [idUsuario, setIdUsuario] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const buscar = () => {
    onBuscar({
      id_usuario: idUsuario ? parseInt(idUsuario, 10) : undefined,
      tipo_evento: tipoEvento ? parseInt(tipoEvento, 10) : undefined,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
    });
  };

  const limpiar = () => {
    setIdUsuario('');
    setTipoEvento('');
    setFechaDesde('');
    setFechaHasta('');
    onReset();
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); buscar(); }}
      style={{ display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap', marginBottom: 'var(--s5)', alignItems: 'flex-end' }}
    >
      <div style={{ flex: '1 1 130px' }}>
        <Input
          label="ID de usuario"
          type="number"
          placeholder="Ej. 42"
          value={idUsuario}
          onChange={(e) => setIdUsuario(e.target.value)}
        />
      </div>
      <div style={{ flex: '1 1 180px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}>
          Tipo de evento
        </label>
        <select
          value={tipoEvento}
          onChange={(e) => setTipoEvento(e.target.value)}
          style={{
            width: '100%',
            height: 40,
            padding: '0 var(--s3)',
            borderRadius: 'var(--r-md)',
            border: '1.5px solid var(--surface-border)',
            background: 'var(--surface-card)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <option value="">Todos los tipos</option>
          {TIPOS_EVENTO.map((t) => (
            <option key={t.id} value={String(t.id)}>{t.label}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: '1 1 160px' }}>
        <Input
          label="Fecha desde"
          type="datetime-local"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
        />
      </div>
      <div style={{ flex: '1 1 160px' }}>
        <Input
          label="Fecha hasta"
          type="datetime-local"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
        <Button type="submit" variant="primary" size="md">
          <Search size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />
          Buscar
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={limpiar}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}
