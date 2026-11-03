// src/pages/dashboard/ExecutiveOverviewPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listShipments } from '../../api/shipmentApi';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';
import type { IShipment } from '../../types/shipment';
import { StatCard } from '../../components/dashboard/StatCard';
import { DashboardQueueTable } from '../../components/dashboard/DashboardQueueTable';

export const ExecutiveOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { openInspection } = useShipmentInspection();

  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<IShipment[]>([]);

  // 07:30 PKT countdown
  const [manifestCountdown, setManifestCountdown] = useState<string>('--:--:--');

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const shipRes = await listShipments({ limit: 100 });
      const ships = shipRes.envelope.data.shipments || [];
      setShipments(ships);
    } catch (err: any) {
      if (err.status !== 401) {
        toast.error('Failed to load dashboard telemetry');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  // Update 07:30 PKT countdown
  useEffect(() => {
    const calcCountdown = () => {
      const now = new Date();
      // Target 07:30 PKT (UTC+5) -> 02:30 UTC
      const nextRun = new Date();
      nextRun.setUTCHours(2, 30, 0, 0);
      if (nextRun.getTime() <= now.getTime()) {
        nextRun.setUTCDate(nextRun.getUTCDate() + 1);
      }
      const diffMs = nextRun.getTime() - now.getTime();
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      setManifestCountdown(
        `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      );
    };
    calcCountdown();
    const interval = setInterval(calcCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculations
  const atRiskParcels = shipments.filter(
    (s) => s.status === 'NDR_ACTIVE' || s.status === 'RTO_INITIATED',
  );
  const totalCodAtRisk = atRiskParcels.reduce((sum, s) => sum + (s.orderValueCOD || 0), 0);

  const activeNdrCount = shipments.filter((s) => s.status === 'NDR_ACTIVE').length;
  const rescuedCount = shipments.filter(
    (s) => s.status === 'RESOLVED_RESCHEDULED' || s.status === 'DELIVERED',
  ).length;
  const rescueRate = shipments.length > 0 ? Math.round((rescuedCount / shipments.length) * 100) : 0;

  const manifestQueueCount = shipments.filter((s) => s.needsManifest).length;

  const disputedParcels = shipments.filter((s) => s.disputeStatus && s.disputeStatus !== 'NONE');
  const defenseMargin = disputedParcels.reduce((sum, s) => sum + (s.orderValueCOD || 0), 0);

  // Critical Action Queue: Top 6 NDR_ACTIVE sorted by orderValueCOD DESC
  const criticalQueue = [...atRiskParcels]
    .sort((a, b) => (b.orderValueCOD || 0) - (a.orderValueCOD || 0))
    .slice(0, 6);

  // Expiring Action Queue: Top 6 disputes sorted by cutoff or active disputes
  const expiringQueue = [...disputedParcels].slice(0, 6);

  return (
    <div className="space-y-4 text-xs">
      {/* Top 5 KPI Cards (Exact User-Approved Names with Responsive StatCard) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3.5">
        {/* Card 1: At Risk */}
        <StatCard
          label="At Risk"
          value={`PKR ${totalCodAtRisk.toLocaleString()}`}
          subtext={`${atRiskParcels.length} parcels at risk`}
        />

        {/* Card 2: Active */}
        <StatCard
          label="Active"
          value={String(activeNdrCount)}
          subtext="Unresolved exceptions"
        />

        {/* Card 3: Rescue Rate */}
        <StatCard
          label="Rescue Rate"
          value={`${rescueRate}%`}
          subtext={`${rescuedCount} parcels rescued`}
        />

        {/* Card 4: Manifest Queue */}
        <StatCard
          label="Manifest Queue"
          value={String(manifestQueueCount)}
          subtext={`Next run in ${manifestCountdown}`}
        />

        {/* Card 5: Defense */}
        <StatCard
          label="Defense"
          value={`PKR ${defenseMargin.toLocaleString()}`}
          subtext={`${disputedParcels.length} disputed parcels`}
          className="col-span-2 sm:col-span-1 lg:col-span-1"
        />
      </div>

      {/* Two Action Queue Segments (Unified Reusable Table Component) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Segment 1: Critical */}
        <div className="border border-border bg-white dark:bg-zinc-950 shadow-xs">
          <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Critical</span>
            </div>
            <button
              onClick={() => navigate('/triage')}
              className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Triage Desk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <DashboardQueueTable
            shipments={criticalQueue}
            onInspect={openInspection}
            emptyMessage="No high-COD critical parcels active."
          />
        </div>

        {/* Segment 2: Expiring */}
        <div className="border border-border bg-white dark:bg-zinc-950 shadow-xs">
          <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500" />
              <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Expiring</span>
            </div>
            <button
              onClick={() => navigate('/disputes')}
              className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Disputes</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <DashboardQueueTable
            shipments={expiringQueue}
            onInspect={openInspection}
            isDisputeQueue
            emptyMessage="No approaching dispute settlement deadlines."
          />
        </div>
      </div>
    </div>
  );
};

export default ExecutiveOverviewPage;
