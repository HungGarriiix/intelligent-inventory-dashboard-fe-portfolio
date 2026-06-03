// /src/i18n/request.ts
// next-intl request config (single default locale `en`). A missing key falls
// back to the key string (Req 9.3); locale-load errors are swallowed so the
// page never crashes (Req 9.4).

import { getRequestConfig } from 'next-intl/server';
import en from '../../messages/en.json';

export default getRequestConfig(() => {
  return {
    locale: 'en',
    messages: en,
    getMessageFallback: ({ key }) => key,
    onError: () => {
      /* swallow missing-message / load errors; fall back to the key */
    },
  };
});
