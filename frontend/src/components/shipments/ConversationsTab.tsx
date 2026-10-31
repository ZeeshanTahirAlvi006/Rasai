// src/components/shipments/ConversationsTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  MapPin,
  Calendar,
  XCircle,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
  Bot,
  User,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  IConversationSessionItem,
  ConversationState,
  ConversationSummary,
  ListConversationsFilter,
  SimulateInboundInput,
} from '../../types/conversation';
import {
  listConversations,
  getConversationDetail,
  simulateInboundTurn,
  expireConversation,
} from '../../api/conversationApi';
import CarrierBadge from './CarrierBadge';

const STATE_CONFIG: Record<
  ConversationState,
  { label: string; bg: string; text: string; border: string }
> = {
  AWAITING_CHOICE: {
    label: 'Awaiting Choice',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  AWAITING_DATE: {
    label: 'Awaiting Date',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  AWAITING_LOCATION: {
    label: 'Awaiting Location',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
  },
  CONFIRMING: {
    label: 'Confirming',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  DONE: {
    label: 'Completed',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  EXPIRED: {
    label: 'Expired',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
  },
};

/**
 * Generate next 3 delivery dates skipping Sundays (matching backend utility)
 */
function getAvailableSimDates(): { key: string; label: string }[] {
  const dates: { key: string; label: string }[] = [];
  const now = new Date();
  let dayOffset = 1;

  while (dates.length < 3 && dayOffset <= 7) {
    const d = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getUTCDay();
    if (dayOfWeek !== 0) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString('en-PK', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      dates.push({ key, label });
    }
    dayOffset++;
  }
  return dates;
}

export const ConversationsTab: React.FC = () => {
  const [sessions, setSessions] = useState<IConversationSessionItem[]>([]);
  const [summary, setSummary] = useState<ConversationSummary>({
    AWAITING_CHOICE: 0,
    AWAITING_DATE: 0,
    AWAITING_LOCATION: 0,
    CONFIRMING: 0,
    DONE: 0,
    EXPIRED: 0,
  });
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSession, setSelectedSession] = useState<IConversationSessionItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'simulator'>('chat');

  // Filters
  const [stateFilter, setStateFilter] = useState<string>('');

  // Simulator State
  const [simShipmentId, setSimShipmentId] = useState<string>('');
  const [simActionType, setSimActionType] = useState<
    'ACTION_RESCHEDULE' | 'ACTION_CORRECTION' | 'ACTION_CANCEL' | 'SELECT_DATE' | 'SHARE_LOCATION' | 'SKIP_LOCATION' | 'CONFIRM_RESCHEDULE' | 'CUSTOM_TEXT'
  >('ACTION_RESCHEDULE');
  const [simSelectedDate, setSimSelectedDate] = useState<string>('');
  const [simCoordinates, setSimCoordinates] = useState<{ lat: number; lng: number }>({
    lat: 24.8607,
    lng: 67.0011,
  });
  const [simCustomText, setSimCustomText] = useState<string>('Yes, please deliver on Saturday afternoon');

  const availableDates = getAvailableSimDates();

  useEffect(() => {
    if (availableDates.length > 0 && !simSelectedDate) {
      setSimSelectedDate(availableDates[0].key);
    }
  }, [availableDates, simSelectedDate]);

  // Fetch Conversation Sessions
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const filter: ListConversationsFilter = { limit: 50 };
      if (stateFilter) filter.state = stateFilter as ConversationState;

      const res = await listConversations(filter);
      setSessions(res.data.sessions);
      setSummary(res.data.summary);
      setTotalCount(res.data.total);

      // Auto-select first session if none selected
      if (res.data.sessions.length > 0) {
        if (!selectedSession || !res.data.sessions.some((s) => s._id === selectedSession._id)) {
          loadSessionDetail(res.data.sessions[0]._id);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load conversation sessions');
    } finally {
      setLoading(false);
    }
  }, [stateFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const loadSessionDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await getConversationDetail(id);
      setSelectedSession(res.data);
      if (res.data.shipmentId) {
        const sId = typeof res.data.shipmentId === 'object' ? res.data.shipmentId._id : res.data.shipmentId;
        setSimShipmentId(sId || '');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load conversation detail');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExpireCurrentSession = async () => {
    if (!selectedSession) return;
    setActionLoading(true);
    try {
      await expireConversation(selectedSession._id);
      toast.success('Session marked as EXPIRED');
      await fetchSessions();
      await loadSessionDetail(selectedSession._id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to expire session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunSimulator = async () => {
    if (!simShipmentId.trim()) {
      toast.error('Shipment ID is required to route simulation turn');
      return;
    }

    setActionLoading(true);
    try {
      const payload: SimulateInboundInput = {
        shipmentId: simShipmentId.trim(),
        action: simActionType,
      };

      if (simActionType === 'SELECT_DATE') {
        payload.selectedDate = simSelectedDate;
      } else if (simActionType === 'SHARE_LOCATION') {
        payload.coordinates = simCoordinates;
      } else if (simActionType === 'CUSTOM_TEXT') {
        payload.customText = simCustomText.trim();
      }

      const res = await simulateInboundTurn(payload);
      toast.success(res.message || 'Inbound turn simulated successfully');

      // Refresh list and reload current session transcript
      await fetchSessions();
      if (selectedSession?._id) {
        await loadSessionDetail(selectedSession._id);
      }
      setActiveRightTab('chat');
    } catch (err: any) {
      toast.error(err.message || 'Simulation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Format countdown for 24h window
  const getWindowTimeRemaining = (windowExpiresAt?: string) => {
    if (!windowExpiresAt) return null;
    const diff = new Date(windowExpiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  const activeCount =
    (summary.AWAITING_CHOICE || 0) +
    (summary.AWAITING_DATE || 0) +
    (summary.AWAITING_LOCATION || 0) +
    (summary.CONFIRMING || 0);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Page Header Bar */}
      <div className="p-4 border border-zinc-800 bg-zinc-950/80 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Conversations
            </h1>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/30 font-bold">
              META 24H RESOLUTION ENGINE
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Two-way WhatsApp customer resolution sessions, draft state machine, and webhook simulation.
          </p>
        </div>

        <button
          onClick={() => fetchSessions()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>ACTIVE</span>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">{activeCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">In 24h Window</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
            <span>CHOICE</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">{summary.AWAITING_CHOICE || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Quick Reply</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-cyan-400 text-xs mb-1">
            <span>DATE</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">{summary.AWAITING_DATE || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">List Picker</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-indigo-400 text-xs mb-1">
            <span>LOCATION</span>
            <MapPin className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300">{summary.AWAITING_LOCATION || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">GPS Coordinates</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-purple-400 text-xs mb-1">
            <span>CONFIRMING</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-300">{summary.CONFIRMING || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Final Verification</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
            <span>DONE</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300">{summary.DONE || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Rescheduled</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>EXPIRED</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-400">{summary.EXPIRED || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Meta 24h Passed</div>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All States</option>
            <option value="AWAITING_CHOICE">Awaiting Choice</option>
            <option value="AWAITING_DATE">Awaiting Date</option>
            <option value="AWAITING_LOCATION">Awaiting Location</option>
            <option value="CONFIRMING">Confirming</option>
            <option value="DONE">Done</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <button
            onClick={() => fetchSessions()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {selectedSession && selectedSession.state !== 'EXPIRED' && selectedSession.state !== 'DONE' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExpireCurrentSession}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expire Active Session</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sessions (5 / 12) */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Sessions ({totalCount})
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">Meta 24h Window</span>
          </div>

          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {loading && sessions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 rounded-2xl bg-slate-900/50 border border-white/5">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                <span className="text-xs">Loading customer conversations...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 rounded-2xl bg-slate-900/50 border border-white/5">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <div className="text-sm font-medium text-slate-400">No conversations found</div>
                <div className="text-xs mt-1 text-slate-600">
                  Customer sessions are initiated when an NDR WhatsApp template is dispatched.
                </div>
              </div>
            ) : (
              sessions.map((sess) => {
                const isSelected = selectedSession?._id === sess._id;
                const stateMeta = STATE_CONFIG[sess.state] || STATE_CONFIG.EXPIRED;
                const shipmentObj = typeof sess.shipmentId === 'object' ? sess.shipmentId : null;
                const windowRemaining = getWindowTimeRemaining(sess.windowExpiresAt);

                return (
                  <div
                    key={sess._id}
                    onClick={() => loadSessionDetail(sess._id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/50'
                        : 'bg-slate-900/70 border-white/5 hover:border-white/20 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white font-mono">
                            {sess.customerPhoneHash ? `Phone Hash: ${sess.customerPhoneHash.substring(0, 12)}...` : 'Unknown Phone'}
                          </div>
                          {shipmentObj && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Tracking: {shipmentObj.trackingNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stateMeta.bg} ${stateMeta.text} ${stateMeta.border}`}
                      >
                        {stateMeta.label}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        {shipmentObj && (
                          <>
                            <CarrierBadge carrier={shipmentObj.carrier} />
                          </>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono text-slate-400">
                          {sess.messages?.length || 0} turns
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        {windowRemaining && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono ${
                              windowRemaining === 'Expired'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {windowRemaining}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Inspector & Simulator (7 / 12) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Subtab Toggle */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10">
            <button
              onClick={() => setActiveRightTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeRightTab === 'chat'
                  ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live WhatsApp Chat</span>
            </button>

            <button
              onClick={() => setActiveRightTab('simulator')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeRightTab === 'simulator'
                  ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Interactive Customer Simulator</span>
            </button>
          </div>

          {activeRightTab === 'chat' ? (
            /* Live WhatsApp Chat Viewer */
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col h-[650px]">
              {/* WhatsApp Chat Header */}
              <div className="p-3.5 bg-slate-950 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    WA
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">
                        {selectedSession ? `Session: ${selectedSession._id.substring(0, 10)}...` : 'No Session Selected'}
                      </span>
                      {selectedSession && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                            STATE_CONFIG[selectedSession.state]?.bg
                          } ${STATE_CONFIG[selectedSession.state]?.text} ${
                            STATE_CONFIG[selectedSession.state]?.border
                          }`}
                        >
                          {selectedSession.state}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Meta Verified 24h Window</span>
                      {selectedSession?.windowExpiresAt && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          • {getWindowTimeRemaining(selectedSession.windowExpiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedSession?.draft?.date && (
                  <div className="px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>Slot: {String(selectedSession.draft.date).substring(0, 10)}</span>
                  </div>
                )}
              </div>

              {/* Chat Message Transcript */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                {loadingDetail ? (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  </div>
                ) : !selectedSession ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                    <MessageSquare className="w-10 h-10 opacity-30 mb-2" />
                    <span>Select a session on the left to view transcript</span>
                  </div>
                ) : !selectedSession.messages || selectedSession.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                    <Clock className="w-8 h-8 opacity-40 mb-2" />
                    <span>No messages exchanged yet. Session awaiting initial inbound trigger.</span>
                  </div>
                ) : (
                  selectedSession.messages.map((msg, idx) => {
                    const isOutbound = msg.direction === 'OUTBOUND';

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-mono">
                          {isOutbound ? (
                            <>
                              <Bot className="w-3 h-3 text-emerald-400" />
                              <span>NDR Bot</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 text-cyan-400" />
                              <span>Customer</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md ${
                            isOutbound
                              ? 'bg-emerald-950/80 text-emerald-100 border border-emerald-500/30 rounded-tr-xs'
                              : 'bg-slate-800 text-slate-100 border border-white/10 rounded-tl-xs'
                          }`}
                        >
                          <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                          <div className="mt-1.5 flex items-center justify-end gap-1 text-[9px] text-slate-400 font-mono">
                            <span>{msg.messageType}</span>
                            {isOutbound && <CheckCheck className="w-3 h-3 text-emerald-400 ml-1" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Draft Coordinates Pin preview */}
                {selectedSession?.draft?.coordinates && (
                  <div className="mt-2.5 p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 max-w-sm ml-auto">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                      <div className="text-[11px] font-mono text-slate-300">
                        {selectedSession.draft.coordinates.lat.toFixed(4)}, {selectedSession.draft.coordinates.lng.toFixed(4)}
                      </div>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${selectedSession.draft.coordinates.lat},${selectedSession.draft.coordinates.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 underline font-medium"
                    >
                      <span>Open Pin</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Chat Footer Info */}
              <div className="p-3 bg-slate-950 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cloud API HMAC-SHA256 Signed</span>
                </div>
                <div className="font-mono">
                  State: <span className="text-white font-bold">{selectedSession?.state || 'IDLE'}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Interactive WhatsApp Simulator */
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 shadow-xl p-5 space-y-5">
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Interactive Customer Simulator</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulate customer inbound WhatsApp webhooks directly into the NDR Conversation Engine.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  DEVELOPER / QA
                </span>
              </div>

              <div className="text-xs">
                <label htmlFor="sim-target-shipment-id" className="block text-slate-400 mb-1 font-mono">Target Shipment ID *</label>
                <input
                  id="sim-target-shipment-id"
                  type="text"
                  value={simShipmentId}
                  onChange={(e) => setSimShipmentId(e.target.value)}
                  placeholder="Paste Shipment ID to simulate customer inbound message"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Type Select */}
              <div className="space-y-2">
                <label className="block text-xs text-slate-400 font-mono">Select Customer Response Action</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimActionType('ACTION_RESCHEDULE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      simActionType === 'ACTION_RESCHEDULE'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    1. Reschedule
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('ACTION_CORRECTION')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      simActionType === 'ACTION_CORRECTION'
                        ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    2. Wrong Details
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('ACTION_CANCEL')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      simActionType === 'ACTION_CANCEL'
                        ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    3. Cancel Order
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('SELECT_DATE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      simActionType === 'SELECT_DATE'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    4. Select Date
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('SHARE_LOCATION')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      simActionType === 'SHARE_LOCATION'
                        ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    5. Share Pin
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('SKIP_LOCATION')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      simActionType === 'SKIP_LOCATION'
                        ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    6. Skip Location
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('CONFIRM_RESCHEDULE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      simActionType === 'CONFIRM_RESCHEDULE'
                        ? 'bg-teal-600/30 border-teal-500 text-teal-200'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    7. Confirm Final
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('CUSTOM_TEXT')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      simActionType === 'CUSTOM_TEXT'
                        ? 'bg-slate-600/30 border-slate-400 text-slate-200'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    8. Custom Text
                  </button>
                </div>
              </div>

              {/* Simulator Action Sub-Controls */}
              {simActionType === 'SELECT_DATE' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-3">
                  <span className="text-xs font-semibold text-slate-300 block">Select Available Delivery Date:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {availableDates.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setSimSelectedDate(d.key)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          simSelectedDate === d.key
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Calendar className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                        <div className="font-bold">{d.label}</div>
                        <div className="text-[10px] font-mono text-slate-400">{d.key}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {simActionType === 'SHARE_LOCATION' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-3">
                  <span className="text-xs font-semibold text-slate-300 block">Simulate GPS Pin Share:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label htmlFor="sim-coord-lat" className="block text-slate-400 mb-1 font-mono">Latitude</label>
                      <input
                        id="sim-coord-lat"
                        type="number"
                        step="any"
                        value={simCoordinates.lat}
                        onChange={(e) =>
                          setSimCoordinates({ ...simCoordinates, lat: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="sim-coord-lng" className="block text-slate-400 mb-1 font-mono">Longitude</label>
                      <input
                        id="sim-coord-lng"
                        type="number"
                        step="any"
                        value={simCoordinates.lng}
                        onChange={(e) =>
                          setSimCoordinates({ ...simCoordinates, lng: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSimCoordinates({ lat: 24.8607, lng: 67.0011 })}
                      className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] text-slate-300 hover:bg-white/10"
                    >
                      Karachi (24.86, 67.00)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimCoordinates({ lat: 31.5204, lng: 74.3587 })}
                      className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] text-slate-300 hover:bg-white/10"
                    >
                      Lahore (31.52, 74.35)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimCoordinates({ lat: 33.6844, lng: 73.0479 })}
                      className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] text-slate-300 hover:bg-white/10"
                    >
                      Islamabad (33.68, 73.04)
                    </button>
                  </div>
                </div>
              )}

              {simActionType === 'CUSTOM_TEXT' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-2">
                  <label htmlFor="sim-custom-text" className="text-xs font-semibold text-slate-300 block">Custom Customer Message:</label>
                  <textarea
                    id="sim-custom-text"
                    value={simCustomText}
                    onChange={(e) => setSimCustomText(e.target.value)}
                    rows={3}
                    placeholder="Type raw text sent by customer..."
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunSimulator}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-linear-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>Execute Simulated Inbound Webhook</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsTab;
