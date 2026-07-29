// Datos simulados RF-56 (Pipeline de inferencia).

export interface PaqueteMock {
  id: string;
  dispositivo: string;
  contexto: string;
  variables: number;
  registros: number;
  severidad: 'LEVE' | 'MODERADO' | 'CRITICO';
  origen: 'EDGE' | 'BACKEND' | 'IA';
  estado: 'ENVIADO' | 'PENDIENTE' | 'FALLIDO';
  reintentos: number;
  enviado: string;
}

export const PIPELINE_KPIS = { enviados: 312, pendientes: 7, fallidos: 3, contextoIncompleto: 5 };

export const PIPELINE_PAQUETES: PaqueteMock[] = [
  { id: 'PKG-0091', dispositivo: 'EDGE-GRANJA-002', contexto: 'Bovinos · Galpón Norte', variables: 3, registros: 42, severidad: 'MODERADO', origen: 'EDGE', estado: 'ENVIADO', reintentos: 0, enviado: '09:12:45' },
  { id: 'PKG-0092', dispositivo: 'EDGE-ESTANQUE-004', contexto: 'Tilapia · Estanque A', variables: 2, registros: 30, severidad: 'CRITICO', origen: 'EDGE', estado: 'PENDIENTE', reintentos: 1, enviado: '—' },
  { id: 'PKG-0093', dispositivo: 'EDGE-GALPON-007', contexto: 'Bovinos · Galpón Sur', variables: 4, registros: 55, severidad: 'MODERADO', origen: 'IA', estado: 'FALLIDO', reintentos: 3, enviado: '—' },
  { id: 'PKG-0090', dispositivo: 'EDGE-GRANJA-001', contexto: 'Contexto incompleto', variables: 1, registros: 12, severidad: 'LEVE', origen: 'BACKEND', estado: 'ENVIADO', reintentos: 0, enviado: '09:08:10' },
];
