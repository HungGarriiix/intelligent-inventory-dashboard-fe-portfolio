'use client';

// Shows the most-recent action label, or "No Action Recorded" when none (Req 5.3/5.4).

import Badge from '@/components/common/Badge';
import { useI18n } from '@/hooks/useI18n';
import type { VehicleAction } from '@/types/entities';

interface ActionStatusBadgeProps {
  latestAction: VehicleAction | null;
}

export default function ActionStatusBadge({ latestAction }: ActionStatusBadgeProps) {
  const t = useI18n();
  if (!latestAction) {
    return (
      <span className="text-sm text-gray-400 italic">{t('panel.noActionRecorded')}</span>
    );
  }
  return <Badge label={latestAction.action} color="info" size="small" />;
}
