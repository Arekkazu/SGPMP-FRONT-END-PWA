import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Button } from '../../shared/design-system/Button';
import type { FiltrosAuditoria } from '../types';

export const TIPOS_EVENTO = [
  { id: 1,  label: 'LOGIN_SUCCESS' },
  { id: 2,  label: 'LOGIN_FAILED' },
  { id: 3,  label: 'LOGOUT' },
  { id: 4,  label: 'USER_REGISTER' },
  { id: 5,  label: 'PASSWORD_CHANGE' },
  { id: 6,  label: 'PASSWORD_RECOVERY' },
  { id: 7,  label: 'PASSWORD_RESET' },
  { id: 8,  label: 'USER_UPDATE' },
  { id: 9,  label: 'USER_STATE_CHANGE' },
  { id: 10, label: 'ROLE_CREATE' },
  { id: 11, label: 'ROLE_UPDATE' },
  { id: 12, label: 'ROLE_DELETE' },
  { id: 13, label: 'PERMISSION_GRANT' },
  { id: 14, label: 'PERMISSION_REVOKE' },
  { id: 15, label: 'AUDIT_VIEW' },
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
