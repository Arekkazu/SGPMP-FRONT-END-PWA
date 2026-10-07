import {
  Beef, Bird, Building2, ChartColumn, ChartLine, Cloud, Cpu, Droplets, Fence, Fish, FlaskConical, Hourglass, House,
  OctagonAlert, Package, Radio, Sprout, Sun, Thermometer, Trees, TriangleAlert, Warehouse, Waves, Wind, Wrench,
  type LucideIcon,
} from 'lucide-react';

// Mapeo best-effort: una categoria o un tipo de area agregado desde el catalogo
// (RF-20) no tiene icono propio y cae al generico.
const POR_CATEGORIA: Record<string, LucideIcon> = {
  TEMPERATURA: Thermometer,
  HUMEDAD: Droplets,
  OXIGENO: Wind,
  PH: FlaskConical,
  AMONIACO: Cloud,
  SALINIDAD: Waves,
  LUMINOSIDAD: Sun,
};

const POR_TIPO_AREA: Record<string, LucideIcon> = {
  'Galpón': Warehouse,
  'Corral': Fence,
  'Potrero': Trees,
  'Estanque': Fish,
  'Invernadero': Sprout,
};

export function iconoCategoriaSensor(categoria: string | null | undefined): LucideIcon {
  return (categoria && POR_CATEGORIA[categoria]) || Radio;
}

export function iconoTipoArea(tipo: string): LucideIcon {
  return POR_TIPO_AREA[tipo] ?? Building2;
}

// Iconos de los widgets del dashboard (RF-28). El catalogo lo define el backend;
// el icono es presentacion pura y una clave nueva cae al generico.
const POR_WIDGET: Record<string, LucideIcon> = {
  temp_galpon: Thermometer,
  hum_galpon: Droplets,
  ph_estanque: FlaskConical,
  co2_galpon: Wind,
  temp_corral: Thermometer,
  estado_iot: Cpu,
  cal_sensores: Wrench,
  alertas: TriangleAlert,
  alertas_crit: OctagonAlert,
  hist_temp: ChartLine,
  hist_hum: ChartColumn,
  prod_aves: Bird,
  prod_bovinos: Beef,
  fincas_estado: House,
  cfg_pendiente: Hourglass,
};

export function iconoWidget(clave: string): LucideIcon {
  return POR_WIDGET[clave] ?? Package;
}
