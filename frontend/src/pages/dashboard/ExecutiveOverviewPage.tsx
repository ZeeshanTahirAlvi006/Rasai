// src/pages/dashboard/ExecutiveOverviewPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Clock,
  ShieldAlert,
  Send,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listShipments } from '../../api/shipmentApi';
import { carrierHealthApi } from '../../api/carrierHealthApi';
import { listOutboxMessages, getGovernorStatus } from '../../api/outboxApi';
import { getLedgerMetrics } from '../../api/shipmentEventApi';
import { disputeApi } from '../../api/disputeApi';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';
import type { IShipment } from '../../types/shipment';
import type { CarrierHealthSummary } from '../../types/carrierHealth';
import CarrierBadge from '../../components/shipments/CarrierBadge';
import ShipmentStatusBadge from '../../components/shipments/ShipmentStatusBadge';
import { StatCard } from '../../components/dashboard/StatCard';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';

export const ExecutiveOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { openInspection } = useShipmentInspection();

  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [carrierHealth, setCarrierHealth] = useState<CarrierHealthSummary[]>([]);
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [governorState, setGovernorState] = useState<string>('ACTIVE');
  const [ledgerSummary, setLedgerSummary] = useState<{ applied: number; duplicate: number; stale: number }>({
    applied: 0,
    duplicate: 0,
    stale: 0,
  });
  const [disputesList, setDisputesList] = useState<any[]>([]);

  // 07:30 PKT countdown
  const [manifestCountdown, setManifestCountdown] = useState<string>('--:--:--');

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Shipments (limit 100 for telemetry calculation)
      const shipRes = await listShipments({ limit: 100 });
      const ships = shipRes.envelope.data.shipments || [];
      setShipments(ships);

      // 2. Fetch Carrier Health
      try {
        const healthRes = await carrierHealthApi.getSummary();
        setCarrierHealth(healthRes.data || []);
      } catch (e) {
        // Fallback demo health if unseeded
        setCarrierHealth([]);
      }

      // 3. Fetch Outbox status
      try {
        const outboxRes = await listOutboxMessages({ limit: 5 });
        setOutboxCount(outboxRes.data.total || 0);
        try {
          const govRes = await getGovernorStatus();
          setGovernorState(govRes.data.isPaused ? 'PAUSED_131048' : 'ACTIVE');
        } catch {
          setGovernorState('ACTIVE');
        }
      } catch (e) {
        setOutboxCount(0);
      }

      // 4. Fetch Ledger metrics
      try {
        const metricsRes = await getLedgerMetrics();
        const dispositionCounts = metricsRes.envelope.data.byDisposition || {};
        setLedgerSummary({
          applied: dispositionCounts['APPLIED'] || 0,
          duplicate: dispositionCounts['DUPLICATE'] || 0,
          stale: (dispositionCounts['STALE_REJECTED'] || 0) + (dispositionCounts['STALE_OUT_OF_ORDER'] || 0),
        });
      } catch (e) {
        setLedgerSummary({ applied: 0, duplicate: 0, stale: 0 });
      }

      // 5. Fetch Disputes
      try {
        const dispRes = await disputeApi.listDisputes();
        setDisputesList(dispRes.data?.disputes || []);
      } catch (e) {
        setDisputesList([]);
      }
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

  // Expiring Action Queue: Disputes sorted by cutoff or active disputes
  const expiringQueue = [...disputedParcels].slice(0, 6);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Page Header Bar */}
      <div className="p-4 border border-border bg-white dark:bg-zinc-950/80 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Dashboard
            </h1>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time COD exposure, exception triage queues, and carrier pulse.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverviewData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-muted/60 text-zinc-800 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-muted transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
            <span>SYNC NOW</span>
          </button>
        </div>
      </div>

      {/* Top 5 KPI Cards (Exact User-Approved Names with Animated StatCard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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
        />
      </div>

      {/* Two Action Queue Segments (Exact User-Approved Names with Adaptive Table) */}
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
              <span>View Triage Desk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider">Parcel / Tracking</TableHead>
                <TableHead className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider">Attempt</TableHead>
                <TableHead className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider">Station</TableHead>
                <TableHead className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-right">COD (PKR)</TableHead>
                <TableHead className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criticalQueue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground text-xs font-mono">
                    No high-COD critical parcels active.
                  </TableCell>
                </TableRow>
              ) : (
                criticalQueue.map((parcel) => (
                  <TableRow
                    key={parcel._id}
                    onClick={() => openInspection(parcel._id)}
                    className="cursor-pointer font-mono text-xs"
                  >
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CarrierBadge carrier={parcel.carrier} size="sm" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                          {parcel.trackingNumber}
                        </span>
                        <ShipmentStatusBadge status={parcel.status} size="sm" />
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-amber-600 dark:text-amber-400 font-bold">
                      #{parcel.ndrAttempt}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-zinc-600 dark:text-zinc-400">
                      {parcel.destinationStationCode || 'UNASSIGNED'}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      PKR {parcel.orderValueCOD?.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openInspection(parcel._id)}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase border border-border bg-muted/60 hover:bg-muted text-zinc-800 dark:text-zinc-200 transition-colors"
                      >
                        Inspect ↗
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
              <span>View Disputes</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider">Parcel / Tracking</TableHead>
                <TableHead className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider">Dispute Status</TableHead>
                <TableHead className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider">Cutoff</TableHead>
                <TableHead className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-right">COD (PKR)</TableHead>
                <TableHead className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiringQueue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground text-xs font-mono">
                    No approaching dispute settlement deadlines.
                  </TableCell>
                </TableRow>
              ) : (
                expiringQueue.map((parcel) => (
                  <TableRow
                    key={parcel._id}
                    onClick={() => openInspection(parcel._id)}
                    className="cursor-pointer font-mono text-xs"
                  >
                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CarrierBadge carrier={parcel.carrier} size="sm" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                          {parcel.trackingNumber}
                        </span>
                        {parcel.disputeRetractionRequested && (
                          <span className="text-[9px] text-amber-500 font-bold">[RETRACT REQ]</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        {parcel.disputeStatus}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-zinc-600 dark:text-zinc-400 text-[11px]">
                      {parcel.settlementCutoff ? new Date(parcel.settlementCutoff).toLocaleDateString() : 'Pending'}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      PKR {parcel.orderValueCOD?.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openInspection(parcel._id)}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase border border-border bg-muted/60 hover:bg-muted text-zinc-800 dark:text-zinc-200 transition-colors"
                      >
                        Dossier ↗
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Bottom Monitoring Cards (Exact User-Approved Names) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Carrier Health */}
        <div className="p-3.5 border border-border bg-white dark:bg-zinc-950 space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              <span className="font-bold text-zinc-900 dark:text-zinc-200 uppercase">Carrier Health</span>
            </div>
            <button
              onClick={() => navigate('/system/carrier-health')}
              className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Full Grid ↗
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            {['POSTEX', 'TRAX', 'LEOPARDS', 'TCS'].map((c) => {
              const summary = carrierHealth.find((h) => h.carrier === c);
              const state = summary?.state || 'CLOSED';
              const isClosed = state === 'CLOSED';
              return (
                <div key={c} className="p-2 border border-border bg-muted/40 flex items-center justify-between">
                  <span className="font-bold text-zinc-800 dark:text-zinc-300">{c}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[9px] uppercase font-bold border ${
                      isClosed
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {state}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Outbox */}
        <div className="p-3.5 border border-border bg-white dark:bg-zinc-950 space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-zinc-900 dark:text-zinc-200 uppercase">Outbox</span>
            </div>
            <button
              onClick={() => navigate('/outbox')}
              className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Queue ↗
            </button>
          </div>

          <div className="space-y-2 pt-1 text-[11px]">
            <div className="flex items-center justify-between p-2 border border-border bg-muted/40">
              <span className="text-zinc-500 dark:text-zinc-400">Meta Governor</span>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-bold border ${
                  governorState === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                {governorState}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 border border-border bg-muted/40">
              <span className="text-zinc-500 dark:text-zinc-400">Pending Messages</span>
              <span className="font-bold text-zinc-900 dark:text-white tabular-nums">{outboxCount} in queue</span>
            </div>
          </div>
        </div>

        {/* Card 3: Event Ingestion */}
        <div className="p-3.5 border border-border bg-white dark:bg-zinc-950 space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              <span className="font-bold text-zinc-900 dark:text-zinc-200 uppercase">Event Ingestion</span>
            </div>
            <button
              onClick={() => navigate('/system/ledger')}
              className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline"
            >
              Ledger ↗
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
            <div className="p-2 border border-border bg-muted/40 text-center">
              <span className="text-[10px] text-zinc-500 block uppercase">Applied</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{ledgerSummary.applied}</span>
            </div>
            <div className="p-2 border border-border bg-muted/40 text-center">
              <span className="text-[10px] text-zinc-500 block uppercase">Duplicate</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{ledgerSummary.duplicate}</span>
            </div>
            <div className="p-2 border border-border bg-muted/40 text-center">
              <span className="text-[10px] text-zinc-500 block uppercase">Stale</span>
              <span className="font-bold text-zinc-600 dark:text-zinc-400 tabular-nums">{ledgerSummary.stale}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveOverviewPage;
