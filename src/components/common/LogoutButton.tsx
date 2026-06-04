'use client';

import { Button } from '@mui/material';
import type { ButtonProps, SxProps, Theme } from '@mui/material';
import { useTranslations } from 'next-intl';
import { logout } from '@/services/auth';

interface LogoutButtonProps {
  variant?: ButtonProps['variant'];
  sx?: SxProps<Theme>;
}

export default function LogoutButton({ variant = 'text', sx }: LogoutButtonProps) {
  const t = useTranslations('nav');

  async function handleLogout(): Promise<void> {
    await logout();
    window.location.href = '/login';
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="small"
      onClick={() => {
        void handleLogout();
      }}
      sx={{ textTransform: 'none', ...sx }}
    >
      {t('logout')}
    </Button>
  );
}
