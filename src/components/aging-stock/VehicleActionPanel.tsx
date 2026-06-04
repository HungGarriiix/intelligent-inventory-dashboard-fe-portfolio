'use client';

// Panel for logging / updating a proposed action for an aging vehicle.
// Pre-populates from the most-recent action (Req 7.1). Validates on submit
// (Req 6.7, 7.4, 7.6). Displays action history descending (Req 6.6, 7.3).

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import type { CreateVehicleActionBody } from '@/types/api';
import type { VehicleActionWithAuthor } from '@/types/entities';
import { createVehicleActionSchema } from '@/schemas/vehicleAction';
import { MAX_ACTION_LENGTH, MAX_NOTES_LENGTH, DATE_TIME_FORMAT } from '@/lib/constants';
import { useI18n } from '@/hooks/useI18n';

const formSchema = createVehicleActionSchema.pick({ action: true, notes: true });

interface VehicleActionPanelProps {
  vehicleId: string;
  userId: string;
  history: VehicleActionWithAuthor[];
  isLoading: boolean;
  submitError: string | null;
  onSubmit: (body: CreateVehicleActionBody) => void;
  onClose: () => void;
}

export default function VehicleActionPanel({
  vehicleId,
  userId,
  history,
  isLoading,
  submitError,
  onSubmit,
  onClose,
}: VehicleActionPanelProps) {
  const t = useI18n();
  const latestAction = history[0] ?? null;

  const [actionLabel, setActionLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (latestAction) {
      setActionLabel(latestAction.action);
      setNotes(latestAction.notes ?? '');
    } else {
      setActionLabel('');
      setNotes('');
    }
  }, [latestAction?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- re-populate only on vehicle selection change, not on every content update

  function handleSubmit(): void {
    const parsed = formSchema.safeParse({ action: actionLabel.trim(), notes: notes.trim() });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0].message);
      return;
    }
    setValidationError(null);
    onSubmit({ vehicleId, userId, action: actionLabel.trim(), notes: notes.trim() });
  }

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField
        label={t('panel.actionLabel')}
        value={actionLabel}
        onChange={(e) => setActionLabel(e.target.value)}
        inputProps={{ maxLength: MAX_ACTION_LENGTH }}
        helperText={`${actionLabel.length}/${MAX_ACTION_LENGTH}`}
        size="small"
        fullWidth
      />
      <TextField
        label={t('panel.notesOptionalLabel')}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        inputProps={{ maxLength: MAX_NOTES_LENGTH }}
        helperText={`${notes.length}/${MAX_NOTES_LENGTH}`}
        multiline
        minRows={3}
        size="small"
        fullWidth
      />

      {validationError && <Alert severity="error">{validationError}</Alert>}
      {submitError && <Alert severity="error">{submitError}</Alert>}

      <div className="flex gap-2 justify-end">
        <Button variant="outlined" onClick={onClose}>
          {t('actions.cancel')}
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isLoading}>
          {t('actions.save')}
        </Button>
      </div>

      {history.length > 0 && (
        <>
          <Divider />
          <Typography variant="subtitle2">{t('panel.history')}</Typography>
          <Stack spacing={1}>
            {history.map((a) => (
              <div key={a.id} className="text-sm border rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-gray-400 text-xs">
                    {dayjs(a.createdAt).format(DATE_TIME_FORMAT)} {t('panel.loggedBy')}{' '}
                    {a.authorFullName}
                  </span>
                </div>
                {a.notes && (
                  <p className="text-gray-600 mt-0.5">{a.notes}</p>
                )}
              </div>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
