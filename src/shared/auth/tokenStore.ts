interface TokenSnapshot {
  token: string | null;
  expiresAt: number | null;
}

type TokenListener = (snapshot: TokenSnapshot) => void;

let accessToken: string | null = null;
let accessTokenExpiresAt: number | null = null;
const listeners = new Set<TokenListener>();

function notifyListeners(): void {
  const snapshot = { token: accessToken, expiresAt: accessTokenExpiresAt };
  listeners.forEach((listener) => listener(snapshot));
}

export const tokenStore = {
  get: (): string | null => accessToken,
  getExpiresAt: (): number | null => accessTokenExpiresAt,
  set: (token: string, expiresInSeconds?: number): void => {
    const nextExpiresAt = expiresInSeconds != null
      && Number.isFinite(expiresInSeconds)
      && expiresInSeconds > 0
      ? Date.now() + expiresInSeconds * 1000
      : null;
    if (accessToken === token && accessTokenExpiresAt === nextExpiresAt) return;

    accessToken = token;
    accessTokenExpiresAt = nextExpiresAt;
    notifyListeners();
  },
  clear: (): void => {
    if (accessToken === null && accessTokenExpiresAt === null) return;
    accessToken = null;
    accessTokenExpiresAt = null;
    notifyListeners();
  },
  subscribe: (listener: TokenListener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
