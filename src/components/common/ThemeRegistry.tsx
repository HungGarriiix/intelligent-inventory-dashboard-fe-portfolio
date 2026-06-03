'use client';

// MUI + Emotion setup for Next.js App Router. Injects styles server-side to
// prevent flash of unstyled content.

import { useState } from 'react';
import createCache, { type EmotionCache } from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import type { ReactNode } from 'react';

const theme = createTheme();

export default function ThemeRegistry({ children }: { children: ReactNode }) {
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
    <CacheProvider value={registry.cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
