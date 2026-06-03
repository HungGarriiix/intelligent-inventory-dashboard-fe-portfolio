'use client';

import { useEffect, useRef, useState } from 'react';
import { TextField } from '@mui/material';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  label?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder,
  debounceMs = 300,
  label,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes (e.g. filter clear)
  useEffect(() => {
    setLocal(value);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const next = e.target.value;
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), debounceMs);
  }

  return (
    <TextField
      size="small"
      label={label}
      placeholder={placeholder}
      value={local}
      onChange={handleChange}
    />
  );
}
