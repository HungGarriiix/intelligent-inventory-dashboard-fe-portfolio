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

const MAX_ACTION = 500;
const MAX_NOTES = 2000;

interface VehicleActionPanelProps {
  vehicleId: string;
  userId: string;
  history: VehicleActionWithAuthor[];      // ordered descending by caller
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
  const latestAction = history[0] ?? null;

  const [actionLabel, setActionLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-populate from most-recent action (Req 7.1)
  useEffect(() => {
    if (latestAction) {
      setActionLabel(latestAction.action);
      setNotes(latestAction.notes ?? '');
    } else {
      setActionLabel('');
      setNotes('');
    }
  }, [latestAction?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(): void {
    const formSchema = createVehicleActionSchema.pick({ action: true, notes: true });
    const parsed = formSchema.safeParse({ action: actionLabel.trim(), notes });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0].message);
      return;
    }
    setValidationError(null);
    onSubmit({ vehicleId, userId, action: actionLabel.trim(), notes });
  }

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      {/* Form */}
      <TextField
        label="Action"
        value={actionLabel}
        onChange={(e) => setActionLabel(e.target.value)}
        inputProps={{ maxLength: MAX_ACTION }}
        helperText={`${actionLabel.length}/${MAX_ACTION}`}
        size="small"
        fullWidth
      />
      <TextField
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        inputProps={{ maxLength: MAX_NOTES }}
        helperText={`${notes.length}/${MAX_NOTES}`}
        multiline
        minRows={3}
        size="small"
        fullWidth
      />

      {validationError && <Alert severity="error">{validationError}</Alert>}
      {submitError && <Alert severity="error">{submitError}</Alert>}

      <div className="flex gap-2 justify-end">
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isLoading}>
          Save
        </Button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <>
          <Divider />
          <Typography variant="subtitle2">History</Typography>
          <Stack spacing={1}>
            {history.map((a) => (
              <div key={a.id} className="text-sm border rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-gray-400 text-xs">
                    {dayjs(a.createdAt).format('YYYY-MM-DD HH:mm')} by{' '}
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
