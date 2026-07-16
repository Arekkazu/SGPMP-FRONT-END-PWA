const KEY = 'sgpmp_token';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(KEY),
  set: (token: string): void => { localStorage.setItem(KEY, token); },
  clear: (): void => { localStorage.removeItem(KEY); },
};
