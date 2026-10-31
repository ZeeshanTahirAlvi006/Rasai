// src/pages/dashboard/ShipmentsDirectoryPage.tsx
import React, { useState, useEffect } from 'react';
import { UploadCloud, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { listShipments } from '../../api/shipmentApi';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';
import type { IShipment, ListShipmentsFilter } from '../../types/shipment';
import ShipmentListTab from '../../components/shipments/ShipmentListTab';
import BulkIngestionTab from '../../components/shipments/BulkIngestionTab';

export const ShipmentsDirectoryPage: React.FC = () => {
  const { openInspection } = useShipmentInspection();

  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<ListShipmentsFilter>({ limit: 20 });
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState<boolean>(false);

  const fetchShipments = async (filter: ListShipmentsFilter = activeFilter) => {
    setLoading(true);
    try {
      const res = await listShipments(filter);
      setShipments(res.envelope.data.shipments);
      setNextCursor(res.envelope.data.nextCursor);
    } catch (err: any) {
      if (err.status !== 401) {
        toast.error(err.message || 'Failed to fetch shipments');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments(activeFilter);
  }, []);

  const handleApplyFilters = (newFilter: ListShipmentsFilter) => {
    setActiveFilter(newFilter);
    fetchShipments(newFilter);
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

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner Header */}
      <div className="p-4 border border-zinc-800 bg-zinc-950/80 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Shipments
            </h1>
            <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 border border-zinc-800">
              MASTER PARCEL DIRECTORY
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Query, inspect, and update parcel lifecycle projections across couriers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUploadDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-950 hover:bg-white font-bold uppercase tracking-wider text-xs border border-white transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Shipments</span>
          </button>

          <button
            onClick={() => fetchShipments(activeFilter)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* Shipment List Table View */}
      <div className="border border-zinc-800 bg-zinc-950 p-4">
        <ShipmentListTab
          shipments={shipments}
          nextCursor={nextCursor}
          loading={loading}
          onRefresh={() => fetchShipments(activeFilter)}
          onApplyFilters={handleApplyFilters}
          onLoadMore={handleLoadMore}
          onOpenDetails={(s) => openInspection(s._id)}
          onOpenEdit={(s) => openInspection(s._id)}
          onOpenCancel={(s) => openInspection(s._id)}
          onNavigateToBulk={() => setUploadDrawerOpen(true)}
        />
      </div>

      {/* Slide-Over Drawer for 'Upload Shipments' */}
      {uploadDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-3xl h-full bg-zinc-950 border-l border-zinc-800 flex flex-col text-zinc-100 shadow-2xl overflow-hidden font-sans">
            {/* Drawer Header */}
            <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-white uppercase tracking-wider">
                  Upload Shipments
                </span>
                <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 border border-zinc-700">
                  UP TO 500 ROWS
                </span>
              </div>
              <button
                onClick={() => setUploadDrawerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ingestion Workspace Body */}
            <div className="flex-1 overflow-y-auto p-5">
              <BulkIngestionTab
                onSuccess={() => {
                  fetchShipments(activeFilter);
                  setUploadDrawerOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentsDirectoryPage;
