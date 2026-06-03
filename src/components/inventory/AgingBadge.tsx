'use client';

// Renders only when isAging === true; returns null otherwise (Req 2.5, 2.6).

import Badge from '@/components/common/Badge';

interface AgingBadgeProps {
  isAging: boolean;
}

export default function AgingBadge({ isAging }: AgingBadgeProps) {
  if (!isAging) return null;
  return <Badge label="Aging" color="warning" size="small" />;
}
