import { http } from '../../shared/api/http';
import type {
  PlantillaResponse, RegistrarPlantillaDTO,
  AplicarPlantillaDTO, AplicacionPlantillaResponse, VersionarPlantillaDTO,
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

  /**
   * Genera la versión siguiente de una plantilla. Es una operación distinta de
   * `registrar`: el backend rechaza con 409 crear una plantilla con un nombre
   * que ya existe, justo para que versionar sea explícito y no un efecto
   * secundario de repetir el nombre.
   */
  async versionar(id: number, dto: VersionarPlantillaDTO): Promise<PlantillaResponse> {
    const res = await http.post<PlantillaResponse>(`${BASE}/${id}/versiones`, dto);
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
