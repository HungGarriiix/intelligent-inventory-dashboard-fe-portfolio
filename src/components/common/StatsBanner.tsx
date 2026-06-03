'use client';

// Purely prop-driven stats banner. Adding a new metric = adding one entry to the
// MetricDefinition array passed in; this component never changes (Req 13.5).

import { Paper, Typography } from '@mui/material';
import type { MetricDefinition } from '@/types/ui';

interface StatsBannerProps {
  metrics: MetricDefinition[];
}

export default function StatsBanner({ metrics }: StatsBannerProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {metrics.map((m) => (
        <Paper
          key={m.key}
          variant="outlined"
          className={`px-5 py-3 min-w-[120px] ${m.highlight ? 'border-orange-400' : ''}`}
        >
          <Typography variant="caption" color="text.secondary" display="block">
            {m.label}
          </Typography>
          <Typography
            variant="h5"
            fontWeight="bold"
            color={m.highlight ? 'warning.main' : 'text.primary'}
          >
            {m.value}
          </Typography>
        </Paper>
      ))}
    </div>
  );
}
