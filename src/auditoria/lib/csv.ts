import type { AuditoriaItemResponse, TipoEvento } from '../types';

// Debe coincidir con `CABECERA_CSV` del backend
// (`exportar_auditoria_use_case.py`) para que el CSV offline sea indistinguible
// del generado en línea.
const CABECERA = [
  'ID',
  'Usuario',
  'Tipo evento',
  'Módulo',
  'Descripción',
  'Resultado',
  'IP',
  'Fecha/Hora',
  'Integridad',
];

function escapar(valor: unknown): string {
  const texto = valor == null ? '' : String(valor);
  if (/[",\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function filaCsv(valores: unknown[]): string {
  return `${valores.map(escapar).join(',')}\r\n`;
}

function nombreTipoEvento(tipoEvento: number, catalogo: TipoEvento[]): string {
  return catalogo.find((t) => t.id_tipo_evento === tipoEvento)?.nombre ?? String(tipoEvento);
}

export function construirCsvAuditoria(
  eventos: AuditoriaItemResponse[],
  catalogo: TipoEvento[],
): string {
  // BOM para que Excel abra el UTF-8 con los acentos correctos (igual que el
  // backend). CRLF por defecto, como espera Excel.
  let csv = `\ufeff${filaCsv(CABECERA)}`;
  for (const e of eventos) {
    csv += filaCsv([
      e.id_evento,
      e.nombre_usuario || e.id_usuario,
      nombreTipoEvento(e.tipo_evento, catalogo),
      e.modulo,
      e.descripcion || '',
      e.resultado,
      e.direccion_ip || '',
      e.fecha_evento || '',
      e.integridad,
    ]);
  }
  return csv;
}
