// src/components/layout/GlobalOmnisearchModal.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  LayoutDashboard,
  AlertTriangle,
  Package,
  MessageSquare,
  Send,
  FileSpreadsheet,
  ShieldAlert,
  Activity,
  Zap,
  Sliders,
  Layers,
  Compass,
  Settings,
  ArrowRight,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listShipments } from '../../api/shipmentApi';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';

interface GlobalOmnisearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMAND_ROUTES = [
  { group: 'Operations', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { group: 'Operations', label: 'Triage', path: '/triage', icon: AlertTriangle },
  { group: 'Operations', label: 'Shipments', path: '/shipments', icon: Package },
  { group: 'Customer Comms', label: 'Conversations', path: '/conversations', icon: MessageSquare },
  { group: 'Customer Comms', label: 'Outbox', path: '/outbox', icon: Send },
  { group: 'Logistics', label: 'Dispatch', path: '/manifests', icon: FileSpreadsheet },
  { group: 'Finance & Disputes', label: 'Disputes', path: '/disputes', icon: ShieldAlert },
  { group: 'Diagnostics', label: 'Health', path: '/system/carrier-health', icon: Activity },
  { group: 'Diagnostics', label: 'Poller', path: '/system/poller', icon: Zap },
  { group: 'Diagnostics', label: 'Simulator', path: '/system/simulator', icon: Sliders },
  { group: 'Diagnostics', label: 'Ledger', path: '/system/ledger', icon: Layers },
  { group: 'Diagnostics', label: 'Tracking', path: '/system/tracking', icon: Compass },
  { group: 'Settings', label: 'Configuration', path: '/settings', icon: Settings },
];

export const GlobalOmnisearchModal: React.FC<GlobalOmnisearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [searchingParcel, setSearchingParcel] = useState(false);
  const navigate = useNavigate();
  const { openInspection } = useShipmentInspection();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredRoutes = COMMAND_ROUTES.filter(
    (r) =>
      r.label.toLowerCase().includes(query.toLowerCase()) ||
      r.group.toLowerCase().includes(query.toLowerCase()) ||
      r.path.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelectRoute = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSearchTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;

    setSearchingParcel(true);
    try {
      const res = await listShipments({ trackingNumber: clean, limit: 1 });
      const found = res.envelope.data.shipments[0];
      if (found) {
        toast.success(`Found parcel: ${found.trackingNumber}`);
        openInspection(found._id);
        onClose();
      } else {
        toast.error(`No parcel found matching tracking #${clean}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error searching parcel');
    } finally {
      setSearchingParcel(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl overflow-hidden font-mono text-xs">
        {/* Search Input Bar */}
        <form onSubmit={handleSearchTracking} className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
          <Search className="w-4 h-4 text-zinc-400 mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Type page name or paste tracking # and press Enter..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-zinc-100 text-xs focus:outline-hidden placeholder:text-zinc-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 border border-zinc-700 bg-zinc-800 ml-2">
            ESC
          </span>
        </form>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {query.trim().length > 3 && (
            <div
              onClick={handleSearchTracking}
              className="p-2.5 bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 cursor-pointer flex items-center justify-between text-zinc-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lookup Tracking #{query.trim()} in Shipment Inspection</span>
              </div>
              <span className="text-[10px] text-zinc-500">
                {searchingParcel ? 'Searching...' : 'ENTER ↵'}
              </span>
            </div>
          )}

          {filteredRoutes.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">No matching command or view</div>
          ) : (
            filteredRoutes.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  onClick={() => handleSelectRoute(item.path)}
                  className="px-3 py-2 flex items-center justify-between hover:bg-zinc-900 cursor-pointer border border-transparent hover:border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-zinc-400" />
                    <span className="font-bold">{item.label}</span>
                    <span className="text-[10px] text-zinc-500">[{item.group}]</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <span>{item.path}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalOmnisearchModal;
