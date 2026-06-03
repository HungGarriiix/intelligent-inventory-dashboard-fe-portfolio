import type { Metadata } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import IntlProvider from '@/components/common/IntlProvider';
import ThemeRegistry from '@/components/common/ThemeRegistry';
import './globals.css';

export const metadata: Metadata = {
  title: 'Intelligent Inventory Dashboard',
  description: 'Dealership inventory management dashboard',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <ThemeRegistry>
          <IntlProvider locale={locale} messages={messages}>
            {children}
          </IntlProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
