// src/components/shipments/ShipmentConsole.tsx
import React, { useState, useEffect } from 'react';
import {
  Layers,
  UploadCloud,
  Sliders,
  Terminal,
  Key,
  Truck,
  RefreshCw,
  Activity,
  Send,
  MessageSquare,
  FileSpreadsheet,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  IShipment,
  IShipmentEvent,
  ListShipmentsFilter,
  ApiCallLogEntry,
} from '../../types/shipment';
import { listShipments, getShipment, onApiCallLogged } from '../../api/shipmentApi';
import { useAuth } from '../../context/AuthContext';
import ShipmentListTab from './ShipmentListTab';
import BulkIngestionTab from './BulkIngestionTab';
import MutationTab from './MutationTab';
import ApiInspectorTab from './ApiInspectorTab';
import EventLedgerTab from './EventLedgerTab';
import OutboxTab from './OutboxTab';
import ConversationsTab from './ConversationsTab';
import ManifestsTab from './ManifestsTab';
import CarriersPollerTab from './CarriersPollerTab';
import DisputesTab from './DisputesTab';
import ShipmentDetailModal from './ShipmentDetailModal';
import QuickAuthModal from './QuickAuthModal';

export const ShipmentConsole: React.FC = () => {
  const { accessToken, user } = useAuth();

  // Navigation State
  const [subTab, setSubTab] = useState<'list' | 'events' | 'bulk' | 'mutations' | 'outbox' | 'conversations' | 'manifests' | 'carriers' | 'disputes' | 'inspector'>('list');

  // Shipment Data State
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<ListShipmentsFilter>({ limit: 20 });

  // Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<IShipment | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<IShipmentEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [targetShipmentIdForMutation, setTargetShipmentIdForMutation] = useState<string>('');

  // API Call Traffic Logs
  const [apiLogs, setApiLogs] = useState<ApiCallLogEntry[]>([]);

  // Register logger listener
  useEffect(() => {
    const unsubscribe = onApiCallLogged((entry) => {
      setApiLogs((prev) => [entry, ...prev].slice(0, 50)); // keep last 50
    });
    return unsubscribe;
  }, []);

  // Fetch shipments on mount or filter change
  const fetchShipmentsList = async (filter: ListShipmentsFilter = activeFilter) => {
    setLoading(true);
    try {
      const res = await listShipments(filter);
      setShipments(res.envelope.data.shipments);
      setNextCursor(res.envelope.data.nextCursor);
    } catch (err: any) {
      if (err.status === 401) {
        toast('Authentication required: Click "Auth Setup" to login or provide token', {
          icon: '🔑',
          style: {
            background: '#1e293b',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          },
        });
      } else {
        toast.error(err.message || 'Failed to fetch shipments');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipmentsList(activeFilter);
  }, []);

  const handleApplyFilters = (newFilter: ListShipmentsFilter) => {
    setActiveFilter(newFilter);
    fetchShipmentsList(newFilter);
  };

  const handleLoadMore = async (cursor: string) => {
    setLoading(true);
    try {
      const filterWithCursor = { ...activeFilter, cursor };
      const res = await listShipments(filterWithCursor);
      setShipments((prev) => [...prev, ...res.envelope.data.shipments]);
      setNextCursor(res.envelope.data.nextCursor);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load next page');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (shipment: IShipment) => {
    setSelectedShipment(shipment);
    setDetailModalOpen(true);
    setLoadingTimeline(true);

    try {
      const res = await getShipment(shipment._id);
      setSelectedShipment(res.envelope.data.shipment);
      setSelectedTimeline(res.envelope.data.timeline);
    } catch (err: any) {
      toast.error('Failed to load shipment timeline: ' + (err.message || 'Unknown error'));
      setSelectedTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleOpenEditFromList = (shipment: IShipment) => {
    setTargetShipmentIdForMutation(shipment._id);
    setSubTab('mutations');
  };

  const handleOpenCancelFromList = (shipment: IShipment) => {
    setTargetShipmentIdForMutation(shipment._id);
    setSubTab('mutations');
  };

  // Status counters for summary header
  const statusCounts = shipments.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Shipment Management & Routes Test Suite
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    10 REST Endpoints (Parcels + Event Ledger)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Interactive test environment for Parcels & Ingestion, Event Ledger Telemetry, Concurrency Updates, and State Engine Transitions.
                </p>
              </div>
            </div>
          </div>

          {/* Auth Status & Quick Config */}
          <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
            <button
              onClick={() => setAuthModalOpen(true)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${accessToken
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>
                {accessToken
                  ? user
                    ? `Merchant: ${user.username || user.email}`
                    : 'Bearer Token Active'
                  : 'Auth Setup (401 Disconnected)'}
              </span>
            </button>

            <button
              onClick={() => fetchShipmentsList()}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick KPI Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-5 mt-5 border-t border-white/5 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400 text-[10px] block">TOTAL LOADED</span>
            <span className="text-base font-bold text-white">{shipments.length}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-cyan-400 text-[10px] block">BOOKED</span>
            <span className="text-base font-bold text-cyan-200">
              {statusCounts['BOOKED'] || 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-indigo-400 text-[10px] block">IN TRANSIT</span>
            <span className="text-base font-bold text-indigo-200">
              {(statusCounts['IN_TRANSIT'] || 0) + (statusCounts['OUT_FOR_DELIVERY'] || 0)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-amber-400 text-[10px] block">NDR ACTIVE</span>
            <span className="text-base font-bold text-amber-200">
              {statusCounts['NDR_ACTIVE'] || 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-emerald-400 text-[10px] block">DELIVERED</span>
            <span className="text-base font-bold text-emerald-200">
              {statusCounts['DELIVERED'] || 0}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-slate-400 text-[10px] block">CANCELLED</span>
            <span className="text-base font-bold text-slate-300">
              {statusCounts['CANCELLED'] || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Subtab Navigation Pill Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg overflow-x-auto">
        <button
          onClick={() => setSubTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${subTab === 'list'
              ? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <Layers className="w-4 h-4" />
          <span>Parcels Ledger</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/30">
            GET /shipments
          </span>
        </button>

        <button
          onClick={() => setSubTab('events')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${subTab === 'events'
              ? 'bg-linear-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Events & Ledger</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            5 ENDPOINTS
          </span>
        </button>

        <button
          onClick={() => setSubTab('bulk')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${subTab === 'bulk'
              ? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Bulk Ingestion</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/30">
            POST /bulk
          </span>
        </button>

        <button
          onClick={() => setSubTab('mutations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${subTab === 'mutations'
              ? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <Sliders className="w-4 h-4" />
          <span>State Engine & Mutations</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/30">
            PATCH & CANCEL
          </span>
        </button>

        <button
          onClick={() => setSubTab('outbox')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${subTab === 'outbox'
              ? 'bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <Send className="w-4 h-4 text-emerald-400" />
          <span>Outbox & WhatsApp</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            RELAY & GOVERNOR
          </span>
        </button>

        <button
          onClick={() => setSubTab('conversations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${subTab === 'conversations'
              ? 'bg-linear-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>Conversations</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ENGINE & SIMULATOR
          </span>
        </button>

        <button
          onClick={() => setSubTab('manifests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${subTab === 'manifests'
              ? 'bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-purple-400" />
          <span>07:30 PKT Manifests</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
            RUN-SHEETS & TIER 3
          </span>
        </button>

        <button
          onClick={() => setSubTab('carriers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            subTab === 'carriers'
              ? 'bg-linear-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>Carriers & Poller</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            ADAPTIVE & BREAKER
          </span>
        </button>

        <button
          onClick={() => setSubTab('disputes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            subTab === 'disputes'
              ? 'bg-linear-to-r from-rose-600 via-amber-600 to-emerald-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Disputes & CPR</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
            MARGIN DEFENSE
          </span>
        </button>

        <button
          onClick={() => setSubTab('inspector')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${subTab === 'inspector'
              ? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
        >
          <Terminal className="w-4 h-4" />
          <span>API Inspector</span>
          {apiLogs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500 text-white">
              {apiLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Render */}
      <main>
        {subTab === 'list' && (
          <ShipmentListTab
            shipments={shipments}
            nextCursor={nextCursor}
            loading={loading}
            onRefresh={() => fetchShipmentsList()}
            onApplyFilters={handleApplyFilters}
            onLoadMore={handleLoadMore}
            onOpenDetails={handleOpenDetails}
            onOpenEdit={handleOpenEditFromList}
            onOpenCancel={handleOpenCancelFromList}
            onNavigateToBulk={() => setSubTab('bulk')}
          />
        )}

        {subTab === 'events' && (
          <EventLedgerTab onRefreshParent={() => fetchShipmentsList()} />
        )}

        {subTab === 'bulk' && (
          <BulkIngestionTab
            onSuccess={() => {
              fetchShipmentsList();
              setSubTab('list');
            }}
          />
        )}

        {subTab === 'mutations' && (
          <MutationTab
            shipments={shipments}
            selectedShipmentId={targetShipmentIdForMutation}
            onRefreshList={() => fetchShipmentsList()}
          />
        )}

        {subTab === 'outbox' && (
          <OutboxTab />
        )}

        {subTab === 'conversations' && (
          <ConversationsTab />
        )}

        {subTab === 'manifests' && (
          <ManifestsTab />
        )}

        {subTab === 'carriers' && (
          <CarriersPollerTab />
        )}

        {subTab === 'disputes' && (
          <DisputesTab />
        )}

        {subTab === 'inspector' && (
          <ApiInspectorTab
            logs={apiLogs}
            onClearLogs={() => setApiLogs([])}
          />
        )}
      </main>

      {/* Modals */}
      <ShipmentDetailModal
        shipment={selectedShipment}
        timeline={selectedTimeline}
        loadingTimeline={loadingTimeline}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onOpenEdit={(s) => {
          setTargetShipmentIdForMutation(s._id);
          setSubTab('mutations');
        }}
        onOpenCancel={(s) => {
          setTargetShipmentIdForMutation(s._id);
          setSubTab('mutations');
        }}
      />

      <QuickAuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          fetchShipmentsList();
        }}
      />
    </div>
  );
};

export default ShipmentConsole;
