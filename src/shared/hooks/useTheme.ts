import { useState, useEffect } from 'react';

const STORAGE_KEY = 'sgpmp-theme';

export function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = () => setDark((d) => !d);

  return { dark, toggle };
}
