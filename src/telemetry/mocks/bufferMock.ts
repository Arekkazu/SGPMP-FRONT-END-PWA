// Datos simulados RF-54 (Buffer y sincronización) — flujo AIOT sin endpoint humano.

export interface DispositivoBufferMock {
  id: string;
  conexion: 'ONLINE' | 'BUFFER';
  politica: string;
  pendientes: number;
  ultimoDato: string;
}

export interface RegistroBufferMock {
  seq: number;
  variable: string;
  valor: string;
  tipo: string;
  severidad: 'LEVE' | 'MODERADO' | 'CRITICO' | '—';
  capturado: string;
  origen: string;
  estado: 'EN_COLA' | 'SINCRONIZADO' | 'REINTENTO';
  reintentos: number;
}

export const BUFFER_KPIS = { activos: 4, enBuffer: 2, pendientes: 312, sincronizadosHoy: 1847 };

export const BUFFER_DISPOSITIVOS: DispositivoBufferMock[] = [
  { id: 'EDGE-GRANJA-001', conexion: 'ONLINE', politica: 'Descartar más antiguos', pendientes: 0, ultimoDato: '09:41:02' },
  { id: 'EDGE-GRANJA-002', conexion: 'BUFFER', politica: 'Sobrescribir circular', pendientes: 187, ultimoDato: '09:12:44' },
  { id: 'EDGE-ESTANQUE-004', conexion: 'BUFFER', politica: 'Bloquear captura', pendientes: 125, ultimoDato: '08:58:19' },
  { id: 'EDGE-GALPON-007', conexion: 'ONLINE', politica: 'Descartar más antiguos', pendientes: 0, ultimoDato: '09:40:51' },
];

export const BUFFER_REGISTROS: RegistroBufferMock[] = [
  { seq: 4821, variable: 'TEMPERATURA_AMBIENTAL', valor: '29.1 °C', tipo: 'Numérico', severidad: '—', capturado: '09:12:40', origen: 'BUFFER_LOCAL', estado: 'EN_COLA', reintentos: 0 },
  { seq: 4822, variable: 'CO2', valor: '1 510 ppm', tipo: 'Numérico', severidad: 'MODERADO', capturado: '09:12:41', origen: 'BUFFER_LOCAL', estado: 'EN_COLA', reintentos: 2 },
  { seq: 4823, variable: 'PH_AGUA', valor: '9.1', tipo: 'Numérico', severidad: 'CRITICO', capturado: '09:12:42', origen: 'BUFFER_LOCAL', estado: 'REINTENTO', reintentos: 3 },
  { seq: 4810, variable: 'HUMEDAD_RELATIVA', valor: '58 %', tipo: 'Numérico', severidad: '—', capturado: '09:10:03', origen: 'BUFFER_LOCAL', estado: 'SINCRONIZADO', reintentos: 1 },
];
