// src/components/shipments/ApiInspectorTab.tsx
import React, { useState } from 'react';
import {
  Terminal,
  Clock,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Key,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ApiCallLogEntry } from '../../types/shipment';
import { getMemoryToken, setInMemoryToken } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

interface ApiInspectorTabProps {
  logs: ApiCallLogEntry[];
  onClearLogs: () => void;
}

export const ApiInspectorTab: React.FC<ApiInspectorTabProps> = ({ logs, onClearLogs }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customToken, setCustomToken] = useState<string>('');
  const { accessToken, setAccessToken, user } = useAuth();

  const handleCopy = (text: string, id: string, msg = 'Copied to clipboard') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(msg);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateCurl = (entry: ApiCallLogEntry) => {
    const token = getMemoryToken();
    const authHeader = token ? ` -H "Authorization: Bearer ${token}"` : '';
    const jsonHeader = ' -H "Content-Type: application/json"';
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const url = `${baseUrl}${entry.endpoint}`;

    let bodyFlag = '';
    if (entry.requestBody && ['POST', 'PATCH', 'PUT'].includes(entry.method)) {
      bodyFlag = ` -d '${JSON.stringify(entry.requestBody)}'`;
    }

    return `curl -X ${entry.method} "${url}"${authHeader}${jsonHeader}${bodyFlag}`;
  };

  const handleApplyCustomToken = () => {
    if (!customToken.trim()) {
      setAccessToken(null);
      setInMemoryToken(null);
      toast.success('Cleared access token');
    } else {
      const clean = customToken.trim().replace(/^Bearer\s+/i, '');
      setAccessToken(clean);
      setInMemoryToken(clean);
      toast.success('Applied custom bearer token');
    }
  };

  // Decode JWT payload for inspection
  const decodeJwt = (token: string | null) => {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1]));
    } catch {
      return null;
    }
  };

  const activeToken = accessToken || getMemoryToken();
  const decodedToken = decodeJwt(activeToken);

  return (
    <div className="space-y-6">
      {/* Auth Token Inspector Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-semibold text-white">
                Authorization Token Inspector
              </h3>
              <p className="text-xs text-slate-400">
                All shipment routes require a valid merchant Bearer access token.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {activeToken ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Token Active</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>No Token Attached (Calls will 401)</span>
              </span>
            )}
          </div>
        </div>

        {/* Token Claims & Token Input */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-white/5">
          <div className="lg:col-span-2 space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Manual Token Override / Dev Bearer Token:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={activeToken ? activeToken.substring(0, 30) + '...' : 'Paste JWT token here...'}
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleApplyCustomToken}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all shrink-0"
              >
                Set Token
              </button>
              {activeToken && (
                <button
                  onClick={() => {
                    setAccessToken(null);
                    setInMemoryToken(null);
                    setCustomToken('');
                    toast.success('Token cleared');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs space-y-1 font-mono">
            <span className="text-slate-500 block uppercase text-[10px]">Active Claims:</span>
            {decodedToken ? (
              <div className="space-y-0.5 text-[11px]">
                <div>
                  <span className="text-slate-400">Merchant ID:</span>{' '}
                  <span className="text-indigo-300 font-bold">{decodedToken.id || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Session ID:</span>{' '}
                  <span className="text-slate-300">{decodedToken.sessionId || 'N/A'}</span>
                </div>
                {decodedToken.exp && (
                  <div>
                    <span className="text-slate-400">Expires:</span>{' '}
                    <span className="text-slate-300">
                      {new Date(decodedToken.exp * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">
                {activeToken ? 'Token present (non-standard JWT payload)' : 'Login or set token above to authenticate.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* API Traffic Ledger Card */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl overflow-hidden backdrop-blur-sm space-y-4">
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Live API Traffic Ledger</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-white/5 text-slate-300 border border-white/10">
              {logs.length} calls recorded
            </span>
          </div>

          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono space-y-2">
            <Clock className="w-6 h-6 mx-auto text-slate-600" />
            <p>No API calls made in this session yet.</p>
            <p className="text-slate-600">
              Interact with the Parcels Ledger, Ingestion, or Mutation tabs to see real-time requests here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              const curl = generateCurl(log);

              const methodColors: Record<string, string> = {
                GET: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                POST: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                PATCH: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                DELETE: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
              };

              return (
                <div key={log.id} className="p-4 hover:bg-white/1 transition-colors space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Method */}
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${methodColors[log.method] || 'bg-slate-500/20 text-slate-300'
                          }`}
                      >
                        {log.method}
                      </span>

                      {/* Endpoint */}
                      <span className="font-mono text-xs text-slate-200 font-semibold">
                        {log.endpoint}
                      </span>

                      {/* Status */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${log.status < 300
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : log.status < 400
                              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                      >
                        HTTP {log.status}
                      </span>

                      {/* Duration */}
                      <span className="text-[11px] text-slate-400 font-mono">
                        {log.durationMs}ms
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {log.timestamp}
                      </span>

                      <button
                        onClick={() => handleCopy(curl, `curl-${log.id}`, 'Copied cURL command')}
                        className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1"
                        title="Copy as cURL"
                      >
                        {copiedId === `curl-${log.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>cURL</span>
                      </button>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Body / Details */}
                  {isExpanded && (
                    <div className="pt-2 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs font-mono animate-fade-in">
                      {/* Request Payload */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                          Request Payload:
                        </span>
                        <pre className="text-slate-300 overflow-x-auto max-h-48 text-[11px]">
                          {log.requestBody
                            ? JSON.stringify(log.requestBody, null, 2)
                            : '(empty body)'}
                        </pre>
                      </div>

                      {/* Response Payload */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                          Response Body:
                        </span>
                        <pre className="text-slate-300 overflow-x-auto max-h-48 text-[11px]">
                          {JSON.stringify(log.responseBody, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiInspectorTab;
