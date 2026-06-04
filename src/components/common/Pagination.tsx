'use client';

import { Button, Typography } from '@mui/material';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-3 justify-end mt-2">
      <Button
        size="small"
        variant="outlined"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <Typography variant="body2">
        Page {page} of {totalPages}
      </Typography>
      <Button
        size="small"
        variant="outlined"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
