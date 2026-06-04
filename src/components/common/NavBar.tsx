'use client';

import NextLink from 'next/link';
import { AppBar, Button, Toolbar, Typography } from '@mui/material';
import { navItems } from '@/config/routes';
import { useI18n } from '@/hooks/useI18n';
import ThemeToggle from './ThemeToggle';
import LogoutButton from './LogoutButton';

export default function NavBar() {
  const t = useI18n();

  return (
    <AppBar
      position="static"
      sx={{
        bgcolor: 'var(--color-nav-bg)',
        borderBottom: '1px solid var(--color-nav-border)',
        boxShadow: 'none',
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, color: 'var(--color-nav-text)', flexShrink: 0 }}
        >
          {t('nav.appTitle')}
        </Typography>

        <nav style={{ display: 'flex', flex: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={NextLink}
              href={item.path}
              sx={{
                color: 'var(--color-nav-text)',
                textTransform: 'none',
                fontWeight: 400,
                '&:hover': {
                  color: '#ffffff',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              {t(item.label)}
            </Button>
          ))}
        </nav>

        <ThemeToggle />
        <LogoutButton
          variant="outlined"
          sx={{
            color: 'var(--color-nav-text)',
            borderColor: 'var(--color-nav-muted)',
            '&:hover': {
              borderColor: 'var(--color-nav-text)',
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
          }}
        />
      </Toolbar>
    </AppBar>
  );
}
