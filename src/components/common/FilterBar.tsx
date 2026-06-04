'use client';

// Purely prop-driven filter UI — zero knowledge of vehicles, routes, or screens.
// Renders each FilterDefinition as a MUI Select (type='select') or
// ToggleButtonGroup (type='toggle'). Emits onFilterChange on every change.

import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { FilterDefinition, FilterState } from '@/types/ui';
import { useI18n } from '@/hooks/useI18n';

interface FilterBarProps {
  filterDefs: FilterDefinition[];
  value: FilterState;
  onChange: (next: FilterState) => void;
}

export default function FilterBar({ filterDefs, value, onChange }: FilterBarProps) {
  const t = useI18n();

  function handleSelect(key: string, next: string): void {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {filterDefs.map((def) => {
        if (def.type === 'select') {
          return (
            <FormControl key={def.key} size="small" sx={{ minWidth: 140 }}>
              <InputLabel id={`filter-${def.key}-label`}>{def.label}</InputLabel>
              <Select
                labelId={`filter-${def.key}-label`}
                value={value[def.key] ?? def.defaultValue}
                label={def.label}
                onChange={(e: SelectChangeEvent) =>
                  handleSelect(def.key, e.target.value)
                }
              >
                <MenuItem value="">
                  <em>{t('filters.all')}</em>
                </MenuItem>
                {def.options?.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }

        if (def.type === 'toggle' && def.toggleOptions) {
          const [falseLabel, trueLabel] = def.toggleOptions;
          return (
            <div key={def.key} className="flex flex-col gap-0.5">
              <Typography variant="caption" color="text.secondary">
                {def.label}
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={value[def.key] ?? def.defaultValue}
                onChange={(_, next: string | null) =>
                  handleSelect(def.key, next ?? '')
                }
              >
                <ToggleButton value="">&mdash;</ToggleButton>
                <ToggleButton value="non-aging">{falseLabel}</ToggleButton>
                <ToggleButton value="aging">{trueLabel}</ToggleButton>
              </ToggleButtonGroup>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
