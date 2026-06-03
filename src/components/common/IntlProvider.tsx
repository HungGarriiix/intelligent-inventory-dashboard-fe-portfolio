'use client';

// Client wrapper for NextIntlClientProvider so missing keys fall back to the key
// (Req 9.3) and errors don't crash the client tree (Req 9.4). Function props must
// live in a client component, hence this wrapper.

import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import type { ReactNode } from 'react';

export default function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      getMessageFallback={({ key }) => key}
      onError={() => {
        /* swallow missing-message errors; the fallback returns the key */
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
