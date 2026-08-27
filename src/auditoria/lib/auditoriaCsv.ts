import type { AuditoriaItemResponse } from '../types';

interface TipoEventoOption {
  id: number;
  label: string;
}

function escaparCsv(valor: unknown): string {
  const texto = valor == null ? '' : String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function generarCsv(
  eventos: AuditoriaItemResponse[],
  tiposEvento: readonly TipoEventoOption[]
): string {
  const etiquetasPorTipo = new Map(tiposEvento.map((tipo) => [tipo.id, tipo.label]));
  const cabecera = [
    'ID',
    'Usuario',
    'Tipo evento',
    'Módulo',
    'Descripción',
    'Resultado',
    'IP',
    'Fecha/Hora',
    'Hash',
  ];
  const filas = eventos.map((evento) => [
    evento.id_evento,
    evento.nombre_usuario ?? evento.id_usuario,
    etiquetasPorTipo.get(evento.tipo_evento) ?? evento.tipo_evento,
    evento.modulo,
    evento.descripcion ?? '',
    evento.resultado,
    evento.ip ?? '',
    evento.fecha_evento,
    evento.hash ?? '',
  ]);

  // BOM + CRLF mejoran la apertura directa del archivo en Excel.
  return `\uFEFF${[cabecera, ...filas]
    .map((fila) => fila.map(escaparCsv).join(','))
    .join('\r\n')}`;
}
