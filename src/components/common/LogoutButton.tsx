'use client';

import { useTranslations } from 'next-intl';
import { logout } from '@/services/auth';

export default function LogoutButton() {
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
      className="text-sm text-nav-muted hover:text-nav-text transition-colors"
    >
      {t('logout')}
    </button>
  );
}
