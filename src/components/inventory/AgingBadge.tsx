'use client';

// Renders only when isAging === true; returns null otherwise (Req 2.5, 2.6).

import Badge from '@/components/common/Badge';
import { useI18n } from '@/hooks/useI18n';

interface AgingBadgeProps {
  isAging: boolean;
}

export default function AgingBadge({ isAging }: AgingBadgeProps) {
  const t = useI18n();
  if (!isAging) return null;
  return <Badge label={t('filters.aging')} color="warning" size="small" />;
}
