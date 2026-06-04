'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Typography } from '@mui/material';
import Modal from '@/components/common/Modal';
import AgingVehicleCard from '@/components/aging-stock/AgingVehicleCard';
import VehicleActionPanel from '@/components/aging-stock/VehicleActionPanel';
import { applySort } from '@/lib/sortUtils';
import { fetchAgingVehicles, vehicleKeys } from '@/services/vehicles';
import {
  fetchAllVehicleActions,
  fetchVehicleActions,
  createVehicleAction,
  vehicleActionKeys,
} from '@/services/vehicleActions';
import { ApiError } from '@/types/api';
import { useI18n } from '@/hooks/useI18n';
import type { VehicleActionWithAuthor } from '@/types/entities';

interface AgingStockViewProps {
  userId: string;
}

export default function AgingStockView({ userId }: AgingStockViewProps) {
  const t = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    vehicleKeys.aging(),
    fetchAgingVehicles,
    { shouldRetryOnError: false },
  );

  const { data: allActionsData, mutate: mutateAllActions } = useSWR(
    vehicleActionKeys.all,
    fetchAllVehicleActions,
    { shouldRetryOnError: false },
  );

  const { data: actionsData } = useSWR(
    selectedId ? vehicleActionKeys.byVehicle(selectedId) : null,
    selectedId ? () => fetchVehicleActions(selectedId) : null,
  );

  const vehicles = applySort(
    data?.data ?? [],
    { column: 'daysInInventory', direction: 'desc' },
  );

  const latestActionMap = (allActionsData?.data ?? []).reduce(
    (map, a) => (map.has(a.vehicleId) ? map : map.set(a.vehicleId, a)),
    new Map<string, VehicleActionWithAuthor>(),
  );

  function handleSelect(vehicleId: string): void {
    setSelectedId(vehicleId);
    setPanelOpen(true);
    setSubmitError(null);
  }

  async function handleSubmit(body: Parameters<typeof createVehicleAction>[0]): Promise<void> {
    try {
      await createVehicleAction(body);
      setPanelOpen(false);
      await Promise.all([mutate(), mutateAllActions()]);
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : t('errors.submitFailed'));
    }
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedId) ?? null;
  const panelHistory = selectedId
    ? (actionsData?.data ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Typography variant="h6" fontWeight="bold">
        {t('nav.agingStock')}
      </Typography>

      {isLoading && (
        <Typography color="text.secondary">{t('common.loading')}</Typography>
      )}

      {error && (
        <div className="flex flex-col gap-2">
          <Alert severity="error">{t('errors.loadAgingVehiclesFailed')}</Alert>
          <Button variant="outlined" onClick={() => void mutate()}>
            {t('actions.retry')}
          </Button>
        </div>
      )}

      {!isLoading && !error && vehicles.length === 0 && (
        <Typography color="text.secondary">{t('errors.noAgingVehicles')}</Typography>
      )}

      <div className="flex flex-col gap-3">
        {vehicles.map((v) => (
          <AgingVehicleCard
            key={v.id}
            vehicle={v}
            latestAction={latestActionMap.get(v.id) ?? null}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <Modal
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={
          selectedVehicle
            ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
            : t('panel.logAction')
        }
        maxWidth="md"
      >
        {selectedId && (
          <VehicleActionPanel
            vehicleId={selectedId}
            userId={userId}
            history={panelHistory}
            isLoading={false}
            submitError={submitError}
            onSubmit={(body) => { void handleSubmit(body); }}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
