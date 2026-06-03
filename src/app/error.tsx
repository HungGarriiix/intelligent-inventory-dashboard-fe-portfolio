'use client';

import { useEffect } from 'react';
import ErrorPage from '@/components/common/ErrorPage';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      title="Something went wrong"
      message="An unexpected error occurred. Please try again or return to the inventory."
      showRetry
      onRetry={reset}
      showHome
    />
  );
}
