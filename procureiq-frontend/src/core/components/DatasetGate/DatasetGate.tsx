/**
 * DatasetGate — wraps any module page.
 *
 * Behaviour:
 * - If has_dataset = true  → render children normally (live data)
 * - If has_dataset = false → render children WITH a DemoBanner overlay
 *   (generic demo data is shown, clearly labelled as illustrative)
 * - While loading → render children (avoids flash)
 *
 * This matches SAP Ariba / Coupa UX: the dashboard is never empty.
 * Demo data is shown before upload and real data replaces it after.
 */
import { ReactNode } from 'react';
import DemoBanner from '@/core/components/DemoBanner/DemoBanner';
import { useDatasetStatus } from '@/core/hooks/useDatasetStatus';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

export default function DatasetGate({ children }: Props) {
  const { data: status, isLoading } = useDatasetStatus();

  // Always render children — demo data shows before upload, real data after
  // Only difference: show DemoBanner when no real dataset is loaded
  const showDemoBanner = !isLoading && !status?.has_dataset;

  return (
    <>
      {showDemoBanner && (
        <DemoBanner filename={status?.last_filename} />
      )}
      {children}
    </>
  );
}
