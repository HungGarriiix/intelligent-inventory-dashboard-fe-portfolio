'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { createVehicle } from '@/services/vehicles';
import { useI18n } from '@/hooks/useI18n';
import { ApiError } from '@/types/api';
import type { Dealership } from '@/types/entities';

interface Props {
  open: boolean;
  dealerships: Dealership[];
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  dealershipId: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  trim: string;
  color: string;
  mileage: string;
  price: string;
  condition: string;
  status: string;
  dateAddedToInventory: string;
}

const today = () => new Date().toISOString().split('T')[0];

const empty = (): FormState => ({
  dealershipId: '',
  make: '',
  model: '',
  year: '',
  vin: '',
  trim: '',
  color: '',
  mileage: '',
  price: '',
  condition: '',
  status: 'Available',
  dateAddedToInventory: today(),
});

export default function CreateVehicleDialog({ open, dealerships, onClose, onSuccess }: Props) {
  const t = useI18n();
  const [form, setForm] = useState<FormState>(empty);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setForm(empty());
    setFieldErrors({});
    setSubmitError('');
    onClose();
  }

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    const year = Number(form.year);
    const mileage = Number(form.mileage);
    const price = Number(form.price);

    try {
      await createVehicle({
        dealershipId: form.dealershipId,
        make: form.make.trim(),
        model: form.model.trim(),
        year,
        vin: form.vin.trim(),
        trim: form.trim.trim(),
        color: form.color.trim(),
        mileage,
        price,
        condition: form.condition as 'New' | 'Used' | 'CPO',
        status: form.status as 'Available' | 'Sold' | 'Reserved',
        dateAddedToInventory: form.dateAddedToInventory || null,
      });
      setSubmitting(false);
      handleClose();
      onSuccess();
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        if (err.field) {
          setFieldErrors({ [err.field]: err.message });
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError(t('errors.submitFailed'));
      }
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('createVehicle.title')}</DialogTitle>
      <form onSubmit={(e) => { setSubmitting(true); void handleSubmit(e); }}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

          <FormControl fullWidth error={!!fieldErrors.dealershipId} required>
            <InputLabel>{t('createVehicle.dealership')}</InputLabel>
            <Select
              value={form.dealershipId}
              label={t('createVehicle.dealership')}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, dealershipId: e.target.value }));
                setFieldErrors((prev) => ({ ...prev, dealershipId: undefined }));
              }}
            >
              {dealerships.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </Select>
            {fieldErrors.dealershipId && <FormHelperText>{fieldErrors.dealershipId}</FormHelperText>}
          </FormControl>

          <TextField
            label={t('createVehicle.make')}
            value={form.make}
            onChange={set('make')}
            error={!!fieldErrors.make}
            helperText={fieldErrors.make}
            required
            fullWidth
          />
          <TextField
            label={t('createVehicle.model')}
            value={form.model}
            onChange={set('model')}
            error={!!fieldErrors.model}
            helperText={fieldErrors.model}
            required
            fullWidth
          />
          <TextField
            label={t('createVehicle.year')}
            type="number"
            value={form.year}
            onChange={set('year')}
            error={!!fieldErrors.year}
            helperText={fieldErrors.year}
            required
            fullWidth
            inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
          />
          <TextField
            label={t('createVehicle.vin')}
            value={form.vin}
            onChange={set('vin')}
            error={!!fieldErrors.vin}
            helperText={fieldErrors.vin}
            required
            fullWidth
            inputProps={{ maxLength: 17 }}
          />
          <TextField
            label={t('createVehicle.trim')}
            value={form.trim}
            onChange={set('trim')}
            error={!!fieldErrors.trim}
            helperText={fieldErrors.trim}
            required
            fullWidth
          />
          <TextField
            label={t('createVehicle.color')}
            value={form.color}
            onChange={set('color')}
            error={!!fieldErrors.color}
            helperText={fieldErrors.color}
            required
            fullWidth
          />
          <TextField
            label={t('createVehicle.mileage')}
            type="number"
            value={form.mileage}
            onChange={set('mileage')}
            error={!!fieldErrors.mileage}
            helperText={fieldErrors.mileage}
            required
            fullWidth
            inputProps={{ min: 0 }}
          />
          <TextField
            label={t('createVehicle.price')}
            type="number"
            value={form.price}
            onChange={set('price')}
            error={!!fieldErrors.price}
            helperText={fieldErrors.price}
            required
            fullWidth
            inputProps={{ min: 1 }}
          />

          <FormControl fullWidth error={!!fieldErrors.condition} required>
            <InputLabel>{t('createVehicle.condition')}</InputLabel>
            <Select
              value={form.condition}
              label={t('createVehicle.condition')}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, condition: e.target.value }));
                setFieldErrors((prev) => ({ ...prev, condition: undefined }));
              }}
            >
              <MenuItem value="New">New</MenuItem>
              <MenuItem value="Used">Used</MenuItem>
              <MenuItem value="CPO">CPO</MenuItem>
            </Select>
            {fieldErrors.condition && <FormHelperText>{fieldErrors.condition}</FormHelperText>}
          </FormControl>

          <FormControl fullWidth error={!!fieldErrors.status} required>
            <InputLabel>{t('createVehicle.status')}</InputLabel>
            <Select
              value={form.status}
              label={t('createVehicle.status')}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, status: e.target.value }));
                setFieldErrors((prev) => ({ ...prev, status: undefined }));
              }}
            >
              <MenuItem value="Available">Available</MenuItem>
              <MenuItem value="Sold">Sold</MenuItem>
              <MenuItem value="Reserved">Reserved</MenuItem>
            </Select>
            {fieldErrors.status && <FormHelperText>{fieldErrors.status}</FormHelperText>}
          </FormControl>

          <TextField
            label={t('createVehicle.dateAdded')}
            type="date"
            value={form.dateAddedToInventory}
            onChange={set('dateAddedToInventory')}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          {submitError && (
            <Typography color="error" variant="body2">{submitError}</Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? t('createVehicle.submitting') : t('createVehicle.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
