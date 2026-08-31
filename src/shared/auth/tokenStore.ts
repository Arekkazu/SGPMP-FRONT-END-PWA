type TokenListener = (token: string | null) => void;

let accessToken: string | null = null;
const listeners = new Set<TokenListener>();

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string): void => {
    if (accessToken === token) return;
    accessToken = token;
    listeners.forEach((listener) => listener(accessToken));
  },
  clear: (): void => {
    if (accessToken === null) return;
    accessToken = null;
    listeners.forEach((listener) => listener(null));
  },
  // El interceptor renueva y limpia el JWT fuera de los hooks de login/logout;
  // sin esto `AuthContext` se queda con el token anterior.
  subscribe: (listener: TokenListener): (() => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
