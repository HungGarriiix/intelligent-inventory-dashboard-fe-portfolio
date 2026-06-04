'use client';

// Shared error UI used by both error.tsx boundaries and not-found.tsx.

import { Button, Typography } from '@mui/material';
import Link from 'next/link';
import { routes } from '@/config/routes';
import { useI18n } from '@/hooks/useI18n';

interface ErrorPageProps {
  title: string;
  message: string;
  showRetry?: boolean;
  showHome?: boolean;
  onRetry?: () => void;
}

export default function ErrorPage({
  title,
  message,
  showRetry,
  showHome,
  onRetry,
}: ErrorPageProps) {
  const t = useI18n();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <Typography variant="h4" fontWeight="bold">
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" maxWidth={480}>
        {message}
      </Typography>
      <div className="flex gap-3 mt-2">
        {showRetry && onRetry && (
          <Button variant="contained" onClick={onRetry}>
            {t('actions.tryAgain')}
          </Button>
        )}
        {showHome && (
          <Button variant="outlined" component={Link} href={routes.inventory.path}>
            {t('actions.goToInventory')}
          </Button>
        )}
      </div>
    </div>
  );
}
