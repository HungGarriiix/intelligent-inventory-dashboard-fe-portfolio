import { getTranslations } from 'next-intl/server';
import ErrorPage from '@/components/common/ErrorPage';

export default async function NotFound() {
  const t = await getTranslations('errors');
  return (
    <ErrorPage
      title={t('notFound')}
      message={t('notFoundMessage')}
      showHome
    />
  );
}
