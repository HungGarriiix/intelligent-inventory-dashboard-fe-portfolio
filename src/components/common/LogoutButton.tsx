'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function LogoutButton() {
  const router = useRouter();
  const t = useTranslations('nav');

  async function handleLogout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleLogout();
      }}
      className="text-sm text-gray-600 hover:underline"
    >
      {t('logout')}
    </button>
  );
}
