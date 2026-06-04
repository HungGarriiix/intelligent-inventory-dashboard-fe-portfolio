'use client';

import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { login } from '@/services/auth';
import { ApiError } from '@/types/api';
import { routes } from '@/config/routes';
import { loginSchema } from '@/schemas/auth';
import { useI18n } from '@/hooks/useI18n';

export default function LoginView() {
  const t = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      window.location.href = routes.inventory.path;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Paper variant="outlined" className="w-full max-w-sm p-8">
        <form onSubmit={(e) => { void handleSubmit(e); }}>
          <Stack spacing={3}>
            <Typography variant="h5" fontWeight="bold" textAlign="center">
              {t('login.title')}
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label={t('login.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
            />
            <TextField
              label={t('login.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
            >
              {loading ? t('login.signingIn') : t('login.submit')}
            </Button>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}
