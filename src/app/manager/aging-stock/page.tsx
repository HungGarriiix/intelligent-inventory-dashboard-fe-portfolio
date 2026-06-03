import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import AgingStockView from '@/views/manager/aging-stock/AgingStockView';
import { sessionOptions, type SessionPayload } from '@/lib/session';

export default async function AgingStockPage() {
  const session = await getIronSession<SessionPayload>(
    await cookies(),
    sessionOptions,
  );
  return <AgingStockView userId={session.userId ?? ''} />;
}
