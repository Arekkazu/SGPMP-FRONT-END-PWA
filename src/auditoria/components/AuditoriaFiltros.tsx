import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Button } from '../../shared/design-system/Button';
import type { FiltrosAuditoria, TipoEvento } from '../types';


interface Props {
  onBuscar: (filtros: Partial<FiltrosAuditoria>) => void;
  onReset: () => void;
  // Viene de `GET /auditoria/catalogo/tipos-evento`. Mantener esta lista a mano
  // ya provocó que las 25 etiquetas apuntaran al evento equivocado.
  tiposEvento: TipoEvento[];
}

export function AuditoriaFiltros({ onBuscar, onReset, tiposEvento }: Props) {
  const { t } = useT('auditoria');
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
          label={t('auditoriafiltros.id_de_usuario')}
          type="number"
          placeholder="Ej. 42"
          value={idUsuario}
          onChange={(e) => setIdUsuario(e.target.value)}
        />
      </div>
      <div style={{ flex: '1 1 180px' }}>
        <Select
          label={t('auditoriafiltros.tipo_de_evento')}
          value={tipoEvento}
          onChange={(e) => setTipoEvento(e.target.value)}
          // QA TC-DIS-29: Enter sobre el selector dispara la búsqueda, igual
          // que en el resto del formulario.
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } }}
        >
          <option value="">{t('auditoriafiltros.todos_los_tipos')}</option>
          {tiposEvento.map((t) => (
            <option key={t.id_tipo_evento} value={String(t.id_tipo_evento)}>{t.nombre}</option>
          ))}
        </Select>
      </div>
      <div style={{ flex: '1 1 160px' }}>
        <Input
          label={t('auditoriafiltros.fecha_desde')}
          type="datetime-local"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
        />
      </div>
      <div style={{ flex: '1 1 160px' }}>
        <Input
          label={t('auditoriafiltros.fecha_hasta')}
          type="datetime-local"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
        <Button type="submit" variant="primary" size="md">
          <Search size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('auditoriafiltros.buscar')}</Button>
        <Button type="button" variant="secondary" size="md" onClick={limpiar}>{t('auditoriafiltros.limpiar')}</Button>
      </div>
    </form>
  );
}
