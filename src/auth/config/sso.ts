// Punto de entrada al SSO de AgroFusion. El proveedor autentica y devuelve al
// usuario a /sso/callback?sso_token=..., que es lo que canjea `useSsoCallback`.
//
// La URL es por ambiente, asi que si no esta definida el boton se muestra
// deshabilitado en vez de desaparecer: un boton ausente se lee como "esta app
// no tiene SSO", y uno deshabilitado con su motivo se lee como lo que es, una
// configuracion pendiente del despliegue. El login normal no depende de esto.
export const agrofusionLoginUrl = import.meta.env.VITE_AGROFUSION_LOGIN_URL?.trim() ?? '';

export const ssoConfigurado = agrofusionLoginUrl.length > 0;
