'use client';

// Shows the most-recent action label, or "No Action Recorded" when none (Req 5.3/5.4).

import Badge from '@/components/common/Badge';
import type { VehicleAction } from '@/types/entities';

interface ActionStatusBadgeProps {
  latestAction: VehicleAction | null;
}

export default function ActionStatusBadge({ latestAction }: ActionStatusBadgeProps) {
  if (!latestAction) {
    return (
      <span className="text-sm text-gray-400 italic">No Action Recorded</span>
    );
  }
  return <Badge label={latestAction.action} color="info" size="small" />;
}
