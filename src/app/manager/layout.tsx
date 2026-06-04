// Manager shell (server component). Renders shared nav and wraps children.
// Auth is enforced by middleware.ts, not here.

import type { ReactNode } from 'react';
import NavBar from '@/components/common/NavBar';

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
