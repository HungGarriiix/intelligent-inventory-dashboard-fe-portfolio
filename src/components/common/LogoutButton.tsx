'use client';

import { useTranslations } from 'next-intl';
import { logout } from '@/services/auth';

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className = 'text-gray-600 hover:text-gray-900' }: LogoutButtonProps) {
  const t = useTranslations('nav');

  async function handleLogout(): Promise<void> {
    await logout();
    window.location.href = '/login';
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleLogout();
      }}
      className={`text-sm transition-colors ${className}`}
    >
      {t('logout')}
    </button>
  );
}
