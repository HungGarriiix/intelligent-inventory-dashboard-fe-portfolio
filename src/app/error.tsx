'use client';

import { useEffect } from 'react';
import ErrorPage from '@/components/common/ErrorPage';
import { useI18n } from '@/hooks/useI18n';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      title={t('errors.serverError')}
      message={t('errors.serverErrorMessage')}
      showRetry
      onRetry={reset}
      showHome
    />
  );
}
