import { http } from '../../shared/api/http';
import type {
  DispositivoIotResponse, RegistrarDispositivoIotDTO,
  SensorResponse, RegistrarSensorDTO,
  ConfiguracionRemotaResponse, ConfigurarRemotamenteDTO,
  SensorAreaResponse, AsociarSensorAreaDTO, AsociarSensorAreaResponse,
  CalibracionResponse, RegistrarCalibracionDTO, TipoDispositivoIotResponse,
  CredencialMqttResponse, EstadoCredencialMqttResponse,
} from '../types';

const DISP = '/configuracion/dispositivos-iot';
const SENS = '/configuracion/sensores';

export const dispositivosApi = {
  async listar(soloActivos = false): Promise<DispositivoIotResponse[]> {
    const res = await http.get<DispositivoIotResponse[]>(DISP, { params: { solo_activos: soloActivos } });
    return res.data;
  },

  async obtener(id: number): Promise<DispositivoIotResponse> {
    const res = await http.get<DispositivoIotResponse>(`${DISP}/${id}`);
    return res.data;
  },

  async registrar(dto: RegistrarDispositivoIotDTO): Promise<DispositivoIotResponse> {
    const res = await http.post<DispositivoIotResponse>(DISP, dto);
    return res.data;
  },

  async desactivar(id: number): Promise<DispositivoIotResponse> {
    const res = await http.patch<DispositivoIotResponse>(`${DISP}/${id}/desactivar`);
    return res.data;
  },

  /** RF-21: asigna, cambia o quita (null) el Gateway Edge del dispositivo. */
  async asignarGateway(id: number, idGateway: number | null): Promise<DispositivoIotResponse> {
    const res = await http.patch<DispositivoIotResponse>(`${DISP}/${id}/gateway`, {
      id_dispositivo_gateway: idGateway,
    });
    return res.data;
  },
};

export const tiposDispositivoApi = {
  async listar(): Promise<TipoDispositivoIotResponse[]> {
    const res = await http.get<{ items: TipoDispositivoIotResponse[] }>('/configuracion/tipos-dispositivo-iot');
    return res.data.items;
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
    // El backend espera de forma sincrona el ACK del dispositivo (hasta ~35s,
    // ver MqttHttpAdapter) antes de responder -- el timeout global de 15s de
    // `http` corta la conexion antes de que el backend termine.
    const res = await http.post<ConfiguracionRemotaResponse>(`${DISP}/${idDispositivo}/configurar`, dto, {
      timeout: 40000,
    });
    return res.data;
  },

  async listarConfiguraciones(idDispositivo: number): Promise<ConfiguracionRemotaResponse[]> {
    const res = await http.get<{ items: ConfiguracionRemotaResponse[] }>(`${DISP}/${idDispositivo}/configuraciones`);
    return res.data.items;
  },

  /** Reenvía una configuración PENDIENTE o NO_CONF; espera el ACK igual que `configurar`. */
  async reintentar(idDispositivo: number, idConfiguracion: number): Promise<ConfiguracionRemotaResponse> {
    const res = await http.post<ConfiguracionRemotaResponse>(
      `${DISP}/${idDispositivo}/configuraciones/${idConfiguracion}/reintentar`,
      undefined,
      { timeout: 40000 },
    );
    return res.data;
  },

  async cancelar(idDispositivo: number, idConfiguracion: number): Promise<ConfiguracionRemotaResponse> {
    const res = await http.patch<ConfiguracionRemotaResponse>(
      `${DISP}/${idDispositivo}/configuraciones/${idConfiguracion}/cancelar`,
    );
    return res.data;
  },
};

// RF-23 / TC-M09-250/251. Sin caché ni syncQueue a propósito: la respuesta del
// POST trae la contraseña una sola vez y sin conexión la operación debe fallar,
// no quedar en cola.
export const credencialMqttApi = {
  async consultar(idDispositivo: number): Promise<EstadoCredencialMqttResponse> {
    const res = await http.get<EstadoCredencialMqttResponse>(`${DISP}/${idDispositivo}/credencial-mqtt`);
    return res.data;
  },

  async emitir(idDispositivo: number): Promise<CredencialMqttResponse> {
    const res = await http.post<CredencialMqttResponse>(`${DISP}/${idDispositivo}/credencial-mqtt`);
    return res.data;
  },

  async revocar(idDispositivo: number): Promise<void> {
    await http.delete(`${DISP}/${idDispositivo}/credencial-mqtt`);
  },
};

export const sensorAreaApi = {
  async asociar(idSensor: number, dto: AsociarSensorAreaDTO): Promise<AsociarSensorAreaResponse> {
    const res = await http.post<AsociarSensorAreaResponse>(`${SENS}/${idSensor}/asociar`, dto);
    return res.data;
  },

  async listarAsociaciones(idSensor: number): Promise<SensorAreaResponse[]> {
    const res = await http.get<{ items: SensorAreaResponse[] }>(`${SENS}/${idSensor}/asociaciones`);
    return res.data.items;
  },
};

// #251: el backend serializa los Decimal como texto ("12.5000"); el tipo de
// dominio es numero y la vista hacia aritmetica sobre el, asi que se convierte
// aqui, en el borde, y la pantalla de calibracion ya no queda en blanco.
function aCalibracion(c: CalibracionResponse): CalibracionResponse {
  return { ...c, valor_referencia: Number(c.valor_referencia) };
}

export const calibracionApi = {
  async calibrar(idSensor: number, dto: RegistrarCalibracionDTO): Promise<CalibracionResponse> {
    const res = await http.post<CalibracionResponse>(`${SENS}/${idSensor}/calibrar`, dto);
    return aCalibracion(res.data);
  },

  async listarCalibraciones(idSensor: number): Promise<CalibracionResponse[]> {
    const res = await http.get<{ items: CalibracionResponse[] }>(`${SENS}/${idSensor}/calibraciones`);
    return res.data.items.map(aCalibracion);
  },
};
