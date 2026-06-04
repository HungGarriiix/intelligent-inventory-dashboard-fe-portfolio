'use client';

// MUI + Emotion setup for Next.js App Router. Injects styles server-side to
// prevent flash of unstyled content.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import createCache, { type EmotionCache } from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import type { ReactNode } from 'react';

type ColorMode = 'light' | 'dark';

interface ColorModeContextValue {
  mode: ColorMode;
  toggle: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggle: () => {},
});

export function useColorMode(): ColorModeContextValue {
  return useContext(ColorModeContext);
}

const palettes = {
  light: {
    primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrastText: '#ffffff' },
    background: { default: '#f1f5f9', paper: '#ffffff' },
  },
  dark: {
    primary: { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1', contrastText: '#ffffff' },
    background: { default: '#0f172a', paper: '#1e293b' },
  },
};

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ColorMode>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('color-mode') as ColorMode | null) ?? 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('color-mode', next);
      return next;
    });
  }, []);

  const theme = useMemo(
    () => createTheme({ palette: { mode, ...palettes[mode] } }),
    [mode],
  );

  const [registry] = useState<{
    cache: EmotionCache;
    flush: () => string[];
  }>(() => {
    const cache = createCache({ key: 'mui' });
    cache.compat = true;
    const prevInsert = cache.insert.bind(cache);
    const inserted: string[] = [];
    cache.insert = (...args: Parameters<typeof prevInsert>) => {
      const result = prevInsert(...args);
      const name = args[1]?.name;
      if (name && cache.inserted[name] !== undefined) inserted.push(name);
      return result;
    };
    return {
      cache,
      flush() {
        const prev = [...inserted];
        inserted.length = 0;
        return prev;
      },
    };
  });

  useServerInsertedHTML(() => {
    const names = registry.flush();
    if (!names.length) return null;
    const styles = names
      .map((n) => (registry.cache.inserted[n] as string) ?? '')
      .join('');
    return (
      <style
        key={registry.cache.key}
        data-emotion={`${registry.cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <ColorModeContext.Provider value={{ mode, toggle }}>
      <CacheProvider value={registry.cache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </CacheProvider>
    </ColorModeContext.Provider>
  );
}
