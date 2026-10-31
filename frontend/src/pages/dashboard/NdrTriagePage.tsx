// src/pages/dashboard/NdrTriagePage.tsx
import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Sliders,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { listShipments } from '../../api/shipmentApi';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';
import type { IShipment, Carrier } from '../../types/shipment';
import CarrierBadge from '../../components/shipments/CarrierBadge';
import ShipmentStatusBadge from '../../components/shipments/ShipmentStatusBadge';

type TriageTab = 'All' | '1st Attempt' | '2+ Attempts' | 'RTO Pending' | 'Rescheduled';

export const NdrTriagePage: React.FC = () => {
  const navigate = useNavigate();
  const { openInspection } = useShipmentInspection();

  const [activeTab, setActiveTab] = useState<TriageTab>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [carrierFilter, setCarrierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTriageParcels = async () => {
    setLoading(true);
    try {
      // Fetch parcels with actionable exceptions
      const res = await listShipments({ limit: 100 });
      setShipments(res.envelope.data.shipments || []);
    } catch (err: any) {
      if (err.status !== 401) {
        toast.error('Failed to load triage exceptions: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTriageParcels();
  }, []);

  // Filter according to user-approved tab segments
  const filteredParcels = shipments.filter((parcel) => {
    // Carrier check
    if (carrierFilter !== 'ALL' && parcel.carrier !== carrierFilter) {
      return false;
    }

    // Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTrack = parcel.trackingNumber.toLowerCase().includes(q);
      const matchStation = (parcel.destinationStationCode || '').toLowerCase().includes(q);
      if (!matchTrack && !matchStation) return false;
    }

    // Tab segment logic
    switch (activeTab) {
      case '1st Attempt':
        return parcel.status === 'NDR_ACTIVE' && parcel.ndrAttempt === 1;
      case '2+ Attempts':
        return parcel.status === 'NDR_ACTIVE' && parcel.ndrAttempt >= 2;
      case 'RTO Pending':
        return parcel.status === 'RTO_INITIATED';
      case 'Rescheduled':
        return parcel.status === 'RESOLVED_RESCHEDULED';
      case 'All':
      default:
        return (
          parcel.status === 'NDR_ACTIVE' ||
          parcel.status === 'RTO_INITIATED' ||
          parcel.status === 'RESOLVED_RESCHEDULED'
        );
    }
  });

  // Tab counters
  const counts = {
    All: shipments.filter((s) => ['NDR_ACTIVE', 'RTO_INITIATED', 'RESOLVED_RESCHEDULED'].includes(s.status)).length,
    '1st Attempt': shipments.filter((s) => s.status === 'NDR_ACTIVE' && s.ndrAttempt === 1).length,
    '2+ Attempts': shipments.filter((s) => s.status === 'NDR_ACTIVE' && s.ndrAttempt >= 2).length,
    'RTO Pending': shipments.filter((s) => s.status === 'RTO_INITIATED').length,
    Rescheduled: shipments.filter((s) => s.status === 'RESOLVED_RESCHEDULED').length,
  };

  const totalCodInView = filteredParcels.reduce((sum, p) => sum + (p.orderValueCOD || 0), 0);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Header Bar */}
      <div className="p-4 border border-zinc-800 bg-zinc-950/80 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Triage
            </h1>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 border border-amber-500/30 font-bold">
              {filteredParcels.length} ACTIONABLE EXCEPTIONS
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Rapid-fire exception desk for active NDRs, customer reschedules, and RTO prevention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 border border-zinc-800 bg-zinc-900 text-right">
            <span className="text-[9px] text-zinc-500 uppercase block">COD IN VIEW</span>
            <span className="text-sm font-bold text-amber-400 tabular-nums">
              PKR {totalCodInView.toLocaleString()}
            </span>
          </div>

          <button
            onClick={fetchTriageParcels}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* Filter Segment Tabs (Exact User-Approved Names) */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['All', '1st Attempt', '2+ Attempts', 'RTO Pending', 'Rescheduled'] as TriageTab[]).map(
            (tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 font-bold uppercase transition-colors flex items-center gap-2 border ${
                    active
                      ? 'bg-zinc-100 text-zinc-950 border-white'
                      : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] ${
                      active ? 'bg-zinc-900 text-zinc-100' : 'bg-black text-zinc-400'
                    }`}
                  >
                    {counts[tab]}
                  </span>
                </button>
              );
            },
          )}
        </div>

        {/* Carrier filter dropdown & Search */}
        <div className="flex items-center gap-2">
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 px-2 py-1 text-zinc-300 text-xs focus:outline-hidden"
          >
            <option value="ALL">ALL COURIERS</option>
            <option value="POSTEX">POSTEX</option>
            <option value="TRAX">TRAX</option>
            <option value="LEOPARDS">LEOPARDS</option>
            <option value="TCS">TCS</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 pl-8 pr-3 py-1 text-zinc-200 text-xs focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* High-Density Action Table */}
      <div className="border border-zinc-800 bg-zinc-950 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] text-zinc-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Tracking # & Courier</th>
              <th className="py-2.5 px-3">Status & Attempt</th>
              <th className="py-2.5 px-3 text-right">COD (PKR)</th>
              <th className="py-2.5 px-3">Station</th>
              <th className="py-2.5 px-3">Customer Phone</th>
              <th className="py-2.5 px-3">Manifest</th>
              <th className="py-2.5 px-3">Updated</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80 text-xs">
            {filteredParcels.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  {loading ? 'Loading triage exceptions...' : 'No actionable parcels matching filter criteria.'}
                </td>
              </tr>
            ) : (
              filteredParcels.map((parcel) => (
                <tr
                  key={parcel._id}
                  className="hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                  onClick={() => openInspection(parcel._id)}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <CarrierBadge carrier={parcel.carrier} size="sm" />
                      <span className="font-bold text-white tracking-tight">{parcel.trackingNumber}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <ShipmentStatusBadge status={parcel.status} size="sm" />
                      <span className="text-[10px] text-amber-400 font-bold">
                        #{parcel.ndrAttempt}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-white tabular-nums">
                    PKR {parcel.orderValueCOD?.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-300">
                    {parcel.destinationStationCode || 'UNASSIGNED'}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                    {parcel.customerPhoneMasked || 'N/A'}
                  </td>
                  <td className="py-2.5 px-3">
                    {parcel.needsManifest ? (
                      <span className="px-1.5 py-0.2 bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[9px] uppercase font-bold">
                        YES
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-[10px]">NO</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[10px] text-zinc-500">
                    {parcel.updatedAt ? new Date(parcel.updatedAt).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openInspection(parcel._id)}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-[10px] uppercase font-bold transition-colors"
                    >
                      Inspect ↗
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NdrTriagePage;
