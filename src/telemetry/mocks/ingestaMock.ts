// Datos simulados RF-53 (Monitor de ingesta) — flujo AIOT sin endpoint humano.
// Reemplazar por `api/` cuando el backend exponga la lectura de ingesta.

export interface LecturaIngestaMock {
  id: number;
  sensor: string;
  variable: string;
  valor: string;
  origen: 'TIEMPO_REAL' | 'BUFFER_LOCAL' | 'EDGE_AGREGADO';
  calidad: 'VALIDA' | 'FUERA_DE_RANGO' | 'ERROR';
  latenciaMs: number;
  capturado: string;
}

export const INGESTA_KPIS = { hoy: 247, validas: 198, fueraRango: 31, errores: 18 };

export const INGESTA_LECTURAS: LecturaIngestaMock[] = [
  { id: 1, sensor: 'Sensor Ambiental A-01', variable: 'TEMPERATURA_AMBIENTAL', valor: '28.4 °C', origen: 'TIEMPO_REAL', calidad: 'VALIDA', latenciaMs: 120, capturado: '09:41:02' },
  { id: 2, sensor: 'Sensor Ambiental A-01', variable: 'HUMEDAD_RELATIVA', valor: '63 %', origen: 'TIEMPO_REAL', calidad: 'VALIDA', latenciaMs: 118, capturado: '09:41:02' },
  { id: 3, sensor: 'Sensor Hídrico H-03', variable: 'PH_AGUA', valor: '8.9', origen: 'TIEMPO_REAL', calidad: 'FUERA_DE_RANGO', latenciaMs: 210, capturado: '09:40:55' },
  { id: 4, sensor: 'Sensor Biométrico B-07', variable: 'TEMPERATURA_CORPORAL', valor: '39.8 °C', origen: 'EDGE_AGREGADO', calidad: 'FUERA_DE_RANGO', latenciaMs: 95, capturado: '09:40:48' },
  { id: 5, sensor: 'Sensor Ambiental A-04', variable: 'CO2', valor: '1 240 ppm', origen: 'BUFFER_LOCAL', calidad: 'VALIDA', latenciaMs: 1400, capturado: '09:38:10' },
  { id: 6, sensor: 'Sensor Ambiental A-02', variable: 'NH3', valor: '— ', origen: 'TIEMPO_REAL', calidad: 'ERROR', latenciaMs: 0, capturado: '09:40:31' },
  { id: 7, sensor: 'Sensor Hídrico H-01', variable: 'OXIGENO_DISUELTO', valor: '6.2 mg/L', origen: 'TIEMPO_REAL', calidad: 'VALIDA', latenciaMs: 132, capturado: '09:41:00' },
];
