'use client';

import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';

interface BadgeProps {
  label: string;
  color?: ChipProps['color'];
  size?: ChipProps['size'];
  variant?: ChipProps['variant'];
  className?: string;
}

export default function Badge({
  label,
  color = 'default',
  size = 'small',
  variant = 'filled',
  className,
}: BadgeProps) {
  return (
    <Chip
      label={label}
      color={color}
      size={size}
      variant={variant}
      className={className}
    />
  );
}
