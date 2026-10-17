// src/components/shipments/BulkIngestionTab.tsx
import React, { useState } from 'react';
import {
  UploadCloud,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  BulkCreateRowInput,
  BulkCreateResponse,
  Carrier,
} from '../../types/shipment';
import { CARRIERS } from '../../types/shipment';
import { bulkCreateShipments } from '../../api/shipmentApi';

interface BulkIngestionTabProps {
  onSuccess: () => void;
}

export const BulkIngestionTab: React.FC<BulkIngestionTabProps> = ({ onSuccess }) => {
  const [editorMode, setEditorMode] = useState<'form' | 'json'>('form');
  const [loading, setLoading] = useState(false);

  // Form rows state
  const [rows, setRows] = useState<BulkCreateRowInput[]>([
    {
      carrier: 'POSTEX',
      trackingNumber: `PST-${Math.floor(100000 + Math.random() * 900000)}`,
      customerPhone: '03001234567',
      orderValueCOD: 2500,
      destinationStationCode: 'LHE-01',
    },
    {
      carrier: 'TRAX',
      trackingNumber: `TRX-${Math.floor(100000 + Math.random() * 900000)}`,
      customerPhone: '03219876543',
      orderValueCOD: 3800,
      destinationStationCode: 'KHI-02',
    },
    {
      carrier: 'LEOPARDS',
      trackingNumber: `LEO-${Math.floor(100000 + Math.random() * 900000)}`,
      customerPhone: '03335551234',
      orderValueCOD: 1200,
      destinationStationCode: 'ISB-01',
    },
  ]);

  // JSON editor state
  const [jsonText, setJsonText] = useState<string>(() =>
    JSON.stringify(rows, null, 2),
  );

  // Result state
  const [lastResult, setLastResult] = useState<{
    status: number;
    data: BulkCreateResponse;
  } | null>(null);

  // Sync form to JSON when switching
  const handleSwitchToJson = () => {
    setJsonText(JSON.stringify(rows, null, 2));
    setEditorMode('json');
  };

  // Sync JSON to form when switching
  const handleSwitchToForm = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        setRows(parsed);
        setEditorMode('form');
      } else {
        toast.error('JSON must be an array of shipment objects');
      }
    } catch (e: any) {
      toast.error('Invalid JSON syntax: ' + e.message);
    }
  };

  const handleAddRow = () => {
    const newRow: BulkCreateRowInput = {
      carrier: 'TCS',
      trackingNumber: `TCS-${Math.floor(100000 + Math.random() * 900000)}`,
      customerPhone: '03007654321',
      orderValueCOD: 2000,
      destinationStationCode: 'FSD-01',
    };
    setRows([...rows, newRow]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length === 1) {
      toast.error('At least 1 row is required');
      return;
    }
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleUpdateRow = (idx: number, field: keyof BulkCreateRowInput, value: any) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: value };
    setRows(updated);
  };

  // Preset 1: 3 Valid Clean Shipments
  const loadPresetValid = () => {
    const sample: BulkCreateRowInput[] = [
      {
        carrier: 'POSTEX',
        trackingNumber: `PST-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
        customerPhone: '03001234567',
        orderValueCOD: 1850,
        destinationStationCode: 'LHE-01',
      },
      {
        carrier: 'TRAX',
        trackingNumber: `TRX-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
        customerPhone: '+923219876543',
        orderValueCOD: 4200,
        destinationStationCode: 'KHI-04',
      },
      {
        carrier: 'LEOPARDS',
        trackingNumber: `LEO-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
        customerPhone: '03335555555',
        orderValueCOD: 950,
        destinationStationCode: 'ISB-02',
      },
    ];
    setRows(sample);
    setJsonText(JSON.stringify(sample, null, 2));
    toast.success('Loaded 3 valid shipments preset');
  };

  // Preset 2: Contains intentional duplicate
  const loadPresetWithDuplicate = () => {
    const duplicateTrk = `DUP-${Math.floor(1000 + Math.random() * 9000)}`;
    const sample: BulkCreateRowInput[] = [
      {
        carrier: 'POSTEX',
        trackingNumber: duplicateTrk,
        customerPhone: '03001234567',
        orderValueCOD: 1500,
        destinationStationCode: 'LHE-01',
      },
      {
        carrier: 'POSTEX',
        trackingNumber: duplicateTrk, // Duplicate key within batch or database
        customerPhone: '03001234567',
        orderValueCOD: 1500,
        destinationStationCode: 'LHE-01',
      },
      {
        carrier: 'TCS',
        trackingNumber: `TCS-CLEAN-${Math.floor(1000 + Math.random() * 9000)}`,
        customerPhone: '03014444444',
        orderValueCOD: 2900,
        destinationStationCode: 'PEW-01',
      },
    ];
    setRows(sample);
    setJsonText(JSON.stringify(sample, null, 2));
    toast.success('Loaded duplicate batch preset (tests 207 Multi-Status)');
  };

  // Preset 3: Contains invalid phone
  const loadPresetWithInvalidPhone = () => {
    const sample: BulkCreateRowInput[] = [
      {
        carrier: 'POSTEX',
        trackingNumber: `PST-OK-${Math.floor(1000 + Math.random() * 9000)}`,
        customerPhone: '03001234567',
        orderValueCOD: 1600,
      },
      {
        carrier: 'TRAX',
        trackingNumber: `TRX-BAD-${Math.floor(1000 + Math.random() * 9000)}`,
        customerPhone: 'invalid-phone-xyz', // Invalid Pakistani format
        orderValueCOD: 3000,
      },
    ];
    setRows(sample);
    setJsonText(JSON.stringify(sample, null, 2));
    toast.success('Loaded invalid phone preset (tests row rejection)');
  };

  const handleSubmit = async () => {
    let payload: BulkCreateRowInput[] = [];

    if (editorMode === 'form') {
      payload = rows;
    } else {
      try {
        const parsed = JSON.parse(jsonText);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          toast.error('JSON must contain an array with at least 1 shipment');
          return;
        }
        payload = parsed;
      } catch (err: any) {
        toast.error('Invalid JSON format: ' + err.message);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await bulkCreateShipments(payload);
      setLastResult({
        status: res.status,
        data: res.envelope.data,
      });

      if (res.status === 201) {
        toast.success(`Created all ${res.envelope.data.created} shipments successfully (201 Created)`);
      } else if (res.status === 207) {
        toast('Batch processed with mixed results (207 Multi-Status)', {
          icon: '⚠️',
          style: {
            background: '#1e293b',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          },
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit bulk ingestion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Presets */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-white">
                Bulk Shipment Ingestion <span className="font-mono text-xs text-indigo-400 font-normal">POST /api/shipments/bulk</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ingest batches up to 500 parcels. Performs phone normalization (+92), AES-256 field encryption, and uniqueness verification.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/10">
            <button
              onClick={() => editorMode === 'json' && handleSwitchToForm()}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${editorMode === 'form'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              Form Builder
            </button>
            <button
              onClick={() => editorMode === 'form' && handleSwitchToJson()}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${editorMode === 'json'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              Raw JSON
            </button>
          </div>
        </div>

        {/* Quick Seeder Presets */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Quick Test Scenarios:</span>
            <button
              onClick={loadPresetValid}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 border border-emerald-500/20 font-mono transition-colors"
            >
              3 Valid Shipments
            </button>
            <button
              onClick={loadPresetWithDuplicate}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/20 font-mono transition-colors"
            >
              Duplicates (207 Multi-Status)
            </button>
            <button
              onClick={loadPresetWithInvalidPhone}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-rose-300 border border-rose-500/20 font-mono transition-colors"
            >
              Invalid Phone (Reject)
            </button>
          </div>

          {editorMode === 'form' && (
            <button
              onClick={handleAddRow}
              className="px-3 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Ingestion Input Area */}
      {editorMode === 'form' ? (
        <div className="rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 w-36">Carrier</th>
                  <th className="py-3 px-3">Tracking Number</th>
                  <th className="py-3 px-3">Customer Phone (PK)</th>
                  <th className="py-3 px-3 w-32">COD Amount (₨)</th>
                  <th className="py-3 px-3 w-32">Station Code</th>
                  <th className="py-3 px-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/2 transition-colors">
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center text-slate-500 text-xs">
                      {idx + 1}
                    </td>

                    {/* Carrier */}
                    <td className="py-2.5 px-3">
                      <select
                        value={row.carrier}
                        onChange={(e) =>
                          handleUpdateRow(idx, 'carrier', e.target.value as Carrier)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        {CARRIERS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Tracking Number */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.trackingNumber}
                        onChange={(e) =>
                          handleUpdateRow(idx, 'trackingNumber', e.target.value)
                        }
                        placeholder="TRK-10029"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </td>

                    {/* Customer Phone */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.customerPhone}
                        onChange={(e) =>
                          handleUpdateRow(idx, 'customerPhone', e.target.value)
                        }
                        placeholder="03001234567"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </td>

                    {/* COD Amount */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        value={row.orderValueCOD ?? 0}
                        onChange={(e) =>
                          handleUpdateRow(idx, 'orderValueCOD', Number(e.target.value))
                        }
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </td>

                    {/* Station Code */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.destinationStationCode ?? ''}
                        onChange={(e) =>
                          handleUpdateRow(idx, 'destinationStationCode', e.target.value)
                        }
                        placeholder="LHE-01"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 uppercase"
                      />
                    </td>

                    {/* Remove Action */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Form Action Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-white/10 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400 font-mono">
              Total rows: <span className="text-white font-semibold">{rows.length}</span> (Max 500)
            </span>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>{loading ? 'Processing Batch...' : 'Submit Ingestion Batch'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Raw JSON Editor */
        <div className="rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl overflow-hidden backdrop-blur-sm space-y-3 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">JSON Batch Payload (shipments: Array)</span>
            <button
              onClick={() => {
                try {
                  const formatted = JSON.stringify(JSON.parse(jsonText), null, 2);
                  setJsonText(formatted);
                  toast.success('Formatted JSON');
                } catch {
                  toast.error('Invalid JSON');
                }
              }}
              className="text-indigo-400 hover:text-indigo-300 font-mono"
            >
              Format JSON
            </button>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={12}
            className="w-full p-4 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="[ { carrier: 'POSTEX', trackingNumber: '...', customerPhone: '...' } ]"
          />

          <div className="flex items-center justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>{loading ? 'Processing Batch...' : 'Submit JSON Ingestion'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Batch Processing Results Section */}
      {lastResult && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl space-y-5 animate-fade-in">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${lastResult.status === 201
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
              >
                HTTP {lastResult.status} {lastResult.status === 201 ? 'Created' : 'Multi-Status'}
              </span>
              <h4 className="text-sm font-semibold text-white">Batch Ingestion Execution Report</h4>
            </div>

            <button
              onClick={onSuccess}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all"
            >
              <span>View in Parcels Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3.5">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                  Created Parcels
                </p>
                <p className="text-xl font-bold font-mono text-emerald-200">
                  {lastResult.data.created}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
                  Duplicate Items
                </p>
                <p className="text-xl font-bold font-mono text-amber-200">
                  {lastResult.data.duplicates}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3.5">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-rose-400 font-semibold">
                  Rejected Rows
                </p>
                <p className="text-xl font-bold font-mono text-rose-200">
                  {lastResult.data.rejected}
                </p>
              </div>
            </div>
          </div>

          {/* Granular Row Breakdown Table */}
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="py-2.5 px-3 w-14">Row #</th>
                  <th className="py-2.5 px-3">Tracking #</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Details / Failure Reason</th>
                  <th className="py-2.5 px-3">MongoDB _id</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {lastResult.data.results.map((r) => (
                  <tr key={r.row} className="hover:bg-white/2">
                    <td className="py-2 px-3 text-slate-500">{r.row}</td>
                    <td className="py-2 px-3 font-semibold text-slate-200">
                      {r.trackingNumber}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'CREATED'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : r.status === 'DUPLICATE'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-xs">
                      {r.reason || (r.status === 'CREATED' ? 'Successfully ingested as BOOKED' : '—')}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                      {r.id || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkIngestionTab;
