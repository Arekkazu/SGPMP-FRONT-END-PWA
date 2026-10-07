import {
  Building2, Cloud, Droplets, Fence, Fish, FlaskConical, Radio, Sprout, Sun, Thermometer, Trees, Warehouse, Waves, Wind,
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
