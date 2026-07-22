import { http } from '../../shared/api/http';
import type {
  DispositivoIotResponse, RegistrarDispositivoIotDTO,
  SensorResponse, RegistrarSensorDTO,
  ConfiguracionRemotaResponse, ConfigurarRemotamenteDTO,
  SensorAreaResponse, AsociarSensorAreaDTO,
  CalibracionResponse, RegistrarCalibracionDTO,
} from '../types';

const DISP = '/configuracion/dispositivos-iot';
const SENS = '/configuracion/sensores';

export const dispositivosApi = {
  async listar(soloActivos = false): Promise<DispositivoIotResponse[]> {
    const res = await http.get<DispositivoIotResponse[]>(`${DISP}/`, { params: { solo_activos: soloActivos } });
    return res.data;
  },

  async obtener(id: number): Promise<DispositivoIotResponse> {
    const res = await http.get<DispositivoIotResponse>(`${DISP}/${id}`);
    return res.data;
  },

  async registrar(dto: RegistrarDispositivoIotDTO): Promise<DispositivoIotResponse> {
    const res = await http.post<DispositivoIotResponse>(`${DISP}/`, dto);
    return res.data;
  },

  async desactivar(id: number): Promise<DispositivoIotResponse> {
    const res = await http.patch<DispositivoIotResponse>(`${DISP}/${id}/desactivar`);
    return res.data;
  },
};

export const sensoresDispositivoApi = {
  async listar(idDispositivo: number): Promise<SensorResponse[]> {
    const res = await http.get<SensorResponse[]>(`${DISP}/${idDispositivo}/sensores`);
    return res.data;
  },

  async registrar(idDispositivo: number, dto: RegistrarSensorDTO): Promise<SensorResponse> {
    const res = await http.post<SensorResponse>(`${DISP}/${idDispositivo}/sensores`, dto);
    return res.data;
  },
};

export const configuracionRemotaApi = {
  async configurar(idDispositivo: number, dto: ConfigurarRemotamenteDTO): Promise<ConfiguracionRemotaResponse> {
    const res = await http.post<ConfiguracionRemotaResponse>(`${DISP}/${idDispositivo}/configurar`, dto);
    return res.data;
  },

  async listarConfiguraciones(idDispositivo: number): Promise<ConfiguracionRemotaResponse[]> {
    const res = await http.get<ConfiguracionRemotaResponse[]>(`${DISP}/${idDispositivo}/configuraciones`);
    return res.data;
  },
};

export const sensorAreaApi = {
  async asociar(idSensor: number, dto: AsociarSensorAreaDTO): Promise<SensorAreaResponse> {
    const res = await http.post<SensorAreaResponse>(`${SENS}/${idSensor}/asociar`, dto);
    return res.data;
  },

  async listarAsociaciones(idSensor: number): Promise<SensorAreaResponse[]> {
    const res = await http.get<SensorAreaResponse[]>(`${SENS}/${idSensor}/asociaciones`);
    return res.data;
  },
};

export const calibracionApi = {
  async calibrar(idSensor: number, dto: RegistrarCalibracionDTO): Promise<CalibracionResponse> {
    const res = await http.post<CalibracionResponse>(`${SENS}/${idSensor}/calibrar`, dto);
    return res.data;
  },

  async listarCalibraciones(idSensor: number): Promise<CalibracionResponse[]> {
    const res = await http.get<CalibracionResponse[]>(`${SENS}/${idSensor}/calibraciones`);
    return res.data;
  },
};
