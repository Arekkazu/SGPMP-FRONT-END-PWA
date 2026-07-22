import { http } from '../../shared/api/http';
import type {
  PlantillaResponse, RegistrarPlantillaDTO,
  AplicarPlantillaDTO, AplicacionPlantillaResponse,
} from '../types';

const BASE = '/configuracion/plantillas';

export const plantillasApi = {
  async listar(): Promise<PlantillaResponse[]> {
    const res = await http.get<PlantillaResponse[]>(`${BASE}/`);
    return res.data;
  },

  async obtener(id: number): Promise<PlantillaResponse> {
    const res = await http.get<PlantillaResponse>(`${BASE}/${id}`);
    return res.data;
  },

  async registrar(dto: RegistrarPlantillaDTO): Promise<PlantillaResponse> {
    const res = await http.post<PlantillaResponse>(`${BASE}/`, dto);
    return res.data;
  },

  async aplicar(id: number, dto: AplicarPlantillaDTO): Promise<AplicacionPlantillaResponse> {
    const res = await http.post<AplicacionPlantillaResponse>(`${BASE}/${id}/aplicar`, dto);
    return res.data;
  },

  async listarHistorial(): Promise<AplicacionPlantillaResponse[]> {
    const res = await http.get<AplicacionPlantillaResponse[]>(`${BASE}/historial`);
    return res.data;
  },
};
