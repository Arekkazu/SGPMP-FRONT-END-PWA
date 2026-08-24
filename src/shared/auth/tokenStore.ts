let accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string): void => { accessToken = token; },
  clear: (): void => { accessToken = null; },
};
