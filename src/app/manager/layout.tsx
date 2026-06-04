// Manager shell (server component). Renders shared nav from `navItems` and wraps
// children. Auth is enforced by middleware.ts, not here.

import type { ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import LogoutButton from '@/components/common/LogoutButton';
import ThemeToggle from '@/components/common/ThemeToggle';
import { navItems } from '@/config/routes';

export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between bg-nav-bg border-b border-nav-border px-6 py-3">
        <div className="flex items-center gap-8">
          <span className="font-semibold text-nav-text">{t('nav.appTitle')}</span>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className="text-sm text-nav-text hover:text-white transition-colors"
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton className="text-nav-muted hover:text-nav-text" />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
