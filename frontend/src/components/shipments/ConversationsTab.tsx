// src/components/shipments/ConversationsTab.tsx
// Two-way WhatsApp customer resolution sessions, draft state machine, and inbound simulation drawer.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Clock,
  CheckCheck,
  Bot,
  User,
  Zap,
  Search,
  Filter,
  X,
  Send,
  MapPin,
  Calendar,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  IConversationSessionItem,
  ConversationState,
  ListConversationsFilter,
  SimulateInboundInput,
} from '../../types/conversation';
import {
  listConversations,
  getConversationDetail,
  simulateInboundTurn,
  expireConversation,
} from '../../api/conversationApi';

// Plain text state styling with semantic text color (Zero background/pill per project standards)
const STATE_CONFIG: Record<
  ConversationState,
  { label: string; textColor: string }
> = {
  AWAITING_CHOICE: {
    label: 'Awaiting Choice',
    textColor: 'text-amber-600 dark:text-amber-400 font-bold',
  },
  AWAITING_DATE: {
    label: 'Awaiting Date',
    textColor: 'text-amber-600 dark:text-amber-400 font-bold',
  },
  AWAITING_LOCATION: {
    label: 'Awaiting Location',
    textColor: 'text-amber-600 dark:text-amber-400 font-bold',
  },
  CONFIRMING: {
    label: 'Confirming',
    textColor: 'text-cyan-600 dark:text-cyan-400 font-bold',
  },
  DONE: {
    label: 'Rescheduled',
    textColor: 'text-emerald-600 dark:text-emerald-400 font-bold',
  },
  EXPIRED: {
    label: 'Expired',
    textColor: 'text-zinc-500 dark:text-zinc-400 font-bold',
  },
};

const CARRIER_LABELS: Record<string, string> = {
  TRAX: 'Trax',
  POSTEX: 'PostEx',
  LEOPARDS: 'Leopards',
  TCS: 'TCS',
};

const CARRIER_TEXT_COLORS: Record<string, string> = {
  TRAX: 'text-blue-600 dark:text-blue-400 font-bold',
  POSTEX: 'text-rose-600 dark:text-rose-400 font-bold',
  LEOPARDS: 'text-amber-600 dark:text-amber-400 font-bold',
  TCS: 'text-red-600 dark:text-red-400 font-bold',
};

/**
 * Generate next 3 delivery dates skipping Sundays (matching backend business logic)
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
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSession, setSelectedSession] = useState<IConversationSessionItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');

  // Simulator Drawer
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [simShipmentId, setSimShipmentId] = useState<string>('');
  const [simActionType, setSimActionType] = useState<
    'ACTION_RESCHEDULE' | 'ACTION_CORRECTION' | 'ACTION_CANCEL' | 'SELECT_DATE' | 'SHARE_LOCATION' | 'SKIP_LOCATION' | 'CONFIRM_RESCHEDULE' | 'CUSTOM_TEXT'
  >('ACTION_RESCHEDULE');
  const [simSelectedDate, setSimSelectedDate] = useState<string>('');
  const [simCoordinates, setSimCoordinates] = useState<{ lat: number; lng: number }>({
    lat: 24.8607,
    lng: 67.0011,
  });
  const [simCustomText, setSimCustomText] = useState<string>('Yes, please deliver tomorrow');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const availableDates = useMemo(() => getAvailableSimDates(), []);

  useEffect(() => {
    if (availableDates.length > 0 && !simSelectedDate) {
      setSimSelectedDate(availableDates[0].key);
    }
  }, [availableDates, simSelectedDate]);

  // Sync simulator target shipment ID whenever selected session changes
  useEffect(() => {
    if (selectedSession?.shipmentId) {
      const sId = typeof selectedSession.shipmentId === 'object'
        ? selectedSession.shipmentId._id
        : selectedSession.shipmentId;
      setSimShipmentId(sId || '');
    }
  }, [selectedSession]);

  // Handle ESC key to dismiss simulator drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSimulatorOpen) {
        setIsSimulatorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimulatorOpen]);

  // Fetch Conversation Sessions
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const filter: ListConversationsFilter = { limit: 100 };
      if (stateFilter) filter.state = stateFilter as ConversationState;

      const res = await listConversations(filter);
      const fetched = res.data.sessions || [];
      setSessions(fetched);

      // Spec requirement: In desktop mode - no conversation should be open by default; only open when user selects.
      // Maintain active selection only if already selected by user and still present in fetched list.
      setSelectedSession((curr) => {
        if (curr && fetched.some((s) => s._id === curr._id)) {
          return curr;
        }
        return null;
      });
    } catch (err: any) {
      if (err?.status !== 401 && err?.response?.status !== 401) {
        toast.error(typeof err?.message === 'string' ? err.message : 'Failed to load conversation sessions');
      }
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
      if (err?.status !== 401 && err?.response?.status !== 401) {
        toast.error(typeof err?.message === 'string' ? err.message : 'Failed to load conversation detail');
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectSession = (sess: IConversationSessionItem) => {
    setSelectedSession(sess);
    loadSessionDetail(sess._id);
  };

  const handleBackToList = () => {
    setSelectedSession(null);
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
      toast.error(typeof err?.message === 'string' ? err.message : 'Failed to expire session');
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
      setIsSimulatorOpen(false);
    } catch (err: any) {
      toast.error(typeof err?.message === 'string' ? err.message : 'Simulation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format countdown for 24h window
  const getWindowTimeRemaining = (windowExpiresAt?: string) => {
    if (!windowExpiresAt) return null;
    const diff = new Date(windowExpiresAt).getTime() - Date.now();
    if (diff <= 0) return { label: '24h Expired', isUrgent: true, isExpired: true };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return {
      label: `${hours}h ${mins}m left`,
      isUrgent: hours < 6,
      isExpired: false,
    };
  };

  // Client-side search across trackingNumber, phone hash, and carrier
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter((sess) => {
      const tracking = typeof sess.shipmentId === 'object' && sess.shipmentId?.trackingNumber
        ? sess.shipmentId.trackingNumber.toLowerCase()
        : '';
      const carrier = typeof sess.shipmentId === 'object' && sess.shipmentId?.carrier
        ? sess.shipmentId.carrier.toLowerCase()
        : '';
      const phoneHash = (sess.customerPhoneHash || '').toLowerCase();
      return tracking.includes(q) || phoneHash.includes(q) || carrier.includes(q);
    });
  }, [sessions, searchQuery]);

  return (
    <div className="h-[calc(100dvh-6rem)] md:h-[calc(100dvh-7rem)] flex flex-col font-mono text-xs select-none min-h-0">
      {/* Responsive Master-Detail / Drill-Down Container */}
      <div className="flex-1 flex flex-row border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs min-h-0">
        
        {/* ============================================================ */}
        {/* LEFT PANE: Compact Streamlined Sessions List                 */}
        {/* Mobile/Tablet: Takes full width when active; hidden when transcript opens */}
        {/* Desktop (xl+): Always visible side-by-side with border-r     */}
        {/* ============================================================ */}
        <div
          className={`border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 bg-white dark:bg-zinc-950 h-full min-h-0 ${
            selectedSession
              ? 'hidden xl:flex xl:w-80 2xl:w-96 xl:border-r'
              : 'flex w-full xl:w-80 2xl:w-96 xl:border-r'
          }`}
        >
          {/* Top Filter & Search Toolbar */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                <span>Conversations</span>
                <span className="text-[10px] text-zinc-500 font-normal">({filteredSessions.length})</span>
              </div>
              <button
                onClick={() => fetchSessions()}
                disabled={loading}
                title="Refresh sessions"
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracking, phone, carrier..."
                className="w-full pl-8 pr-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
              />
            </div>

            {/* State Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-zinc-400 shrink-0" />
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="">ALL STATES</option>
                <option value="AWAITING_CHOICE">AWAITING CHOICE</option>
                <option value="AWAITING_DATE">AWAITING DATE</option>
                <option value="AWAITING_LOCATION">AWAITING LOCATION</option>
                <option value="CONFIRMING">CONFIRMING</option>
                <option value="DONE">RESOLVED / DONE</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>
          </div>

          {/* Session Cards Scroll Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800 min-h-0 overscroll-contain">
            {loading && sessions.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 dark:text-zinc-600 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading sessions...</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 dark:text-zinc-600 space-y-1">
                <AlertCircle className="w-6 h-6 mx-auto opacity-40" />
                <div className="font-semibold text-zinc-600 dark:text-zinc-400">No conversations found</div>
                <div className="text-[11px]">Sessions initiate when WhatsApp NDR templates dispatch.</div>
              </div>
            ) : (
              filteredSessions.map((sess) => {
                const isSelected = selectedSession?._id === sess._id;
                const stateMeta = STATE_CONFIG[sess.state] || STATE_CONFIG.EXPIRED;
                const shipmentObj = typeof sess.shipmentId === 'object' ? sess.shipmentId : null;
                const windowRemaining = getWindowTimeRemaining(sess.windowExpiresAt);

                return (
                  <div
                    key={sess._id}
                    onClick={() => handleSelectSession(sess)}
                    className={`p-3.5 cursor-pointer transition-colors border-l-2 space-y-1.5 ${
                      isSelected
                        ? 'border-l-zinc-900 dark:border-l-zinc-100 bg-zinc-100/80 dark:bg-zinc-900/80'
                        : 'border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                    }`}
                  >
                    {/* Customer Phone Hash & Plain Text State */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {sess.customerPhoneHash
                          ? `Phone: ${sess.customerPhoneHash.substring(0, 10)}...`
                          : 'Unknown Customer'}
                      </span>

                      <span className={`text-[10px] uppercase tracking-wider shrink-0 ${stateMeta.textColor}`}>
                        {stateMeta.label}
                      </span>
                    </div>

                    {/* Tracking Number & Plain Text Carrier */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-zinc-600 dark:text-zinc-400 font-medium truncate">
                        {shipmentObj ? shipmentObj.trackingNumber : 'Unlinked Parcel'}
                      </span>
                      {shipmentObj?.carrier && (
                        <span
                          className={`text-[11px] shrink-0 ${
                            CARRIER_TEXT_COLORS[shipmentObj.carrier] || 'text-zinc-600 dark:text-zinc-400 font-bold'
                          }`}
                        >
                          {CARRIER_LABELS[shipmentObj.carrier] || shipmentObj.carrier}
                        </span>
                      )}
                    </div>

                    {/* Bottom Metadata: Turns Count & Plain Text 24h Window Timer */}
                    <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                      <span>{sess.messages?.length || 0} turns</span>
                      {windowRemaining && (
                        <span
                          className={`shrink-0 ${
                            windowRemaining.isExpired
                              ? 'text-zinc-400 dark:text-zinc-600'
                              : windowRemaining.isUrgent
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {windowRemaining.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANE: Chat Header, Transcript Canvas & Empty State     */}
        {/* Mobile/Tablet: Hidden when no session selected; full screen when opened */}
        {/* Desktop (xl+): Always visible; shows empty state if unselected */}
        {/* ============================================================ */}
        <div
          className={`flex-col min-w-0 bg-white dark:bg-zinc-950 overflow-hidden h-full min-h-0 ${
            selectedSession
              ? 'flex flex-1 w-full xl:w-auto'
              : 'hidden xl:flex xl:flex-1'
          }`}
        >
          {!selectedSession ? (
            /* Desktop Unselected Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/40 dark:bg-zinc-950/60 font-mono select-none">
              <div className="w-14 h-14 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500">
                <MessageSquare className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-400">
                No Conversation Selected
              </div>
            </div>
          ) : (
            <>
              {/* Minimal Chat Header Bar */}
              <div className="h-11 min-h-11 border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-4 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/30 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Back to List Button (Visible on mobile/tablet, hidden on desktop xl+) */}
                  <button
                    onClick={handleBackToList}
                    className="xl:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 shadow-2xs"
                    title="Back to conversations list"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Back</span>
                  </button>

                  <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-xs sm:text-sm">
                    {selectedSession.customerPhoneHash
                      ? `CUSTOMER: ${selectedSession.customerPhoneHash.substring(0, 16)}...`
                      : `SESSION: ${selectedSession._id.substring(0, 10)}`}
                  </span>

                  <span className="text-zinc-400 dark:text-zinc-600">•</span>

                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider shrink-0 ${
                      STATE_CONFIG[selectedSession.state]?.textColor || 'text-zinc-500'
                    }`}
                  >
                    {STATE_CONFIG[selectedSession.state]?.label || selectedSession.state}
                  </span>

                  {typeof selectedSession.shipmentId === 'object' && selectedSession.shipmentId?.trackingNumber && (
                    <span className="hidden md:inline text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                      • {selectedSession.shipmentId.trackingNumber}
                      {selectedSession.shipmentId.carrier && (
                        <span
                          className={`ml-1.5 font-bold ${
                            CARRIER_TEXT_COLORS[selectedSession.shipmentId.carrier] || 'text-zinc-500'
                          }`}
                        >
                          {CARRIER_LABELS[selectedSession.shipmentId.carrier] || selectedSession.shipmentId.carrier}
                        </span>
                      )}
                    </span>
                  )}

                  {selectedSession.windowExpiresAt && (
                    <span className="hidden sm:inline text-[10px] text-zinc-500 font-mono truncate">
                      • 24h Window: {getWindowTimeRemaining(selectedSession.windowExpiresAt)?.label}
                    </span>
                  )}
                </div>

                {/* Header Right Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {selectedSession.state !== 'EXPIRED' && selectedSession.state !== 'DONE' && (
                    <button
                      onClick={handleExpireCurrentSession}
                      disabled={actionLoading}
                      title="Force expire 24h resolution window"
                      className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Expire</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsSimulatorOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 font-bold text-[11px] border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90 transition-opacity"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Simulate</span>
                  </button>

                  {/* Desktop Close/Deselect Button (xl+) */}
                  <button
                    onClick={handleBackToList}
                    className="hidden xl:flex items-center justify-center p-1 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Close conversation view"
                    aria-label="Close conversation view"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Transcript Message Canvas */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 bg-zinc-50/30 dark:bg-zinc-950 min-h-0 overscroll-contain">
                {loadingDetail && (!selectedSession.messages || selectedSession.messages.length === 0) ? (
                  <div className="flex items-center justify-center h-full text-zinc-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                ) : !selectedSession.messages || selectedSession.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-center">
                    <Clock className="w-8 h-8 opacity-30 mb-2" />
                    <span className="text-zinc-600 dark:text-zinc-400">No message turns recorded in this session.</span>
                    <span className="text-[11px] text-zinc-500 mt-1">Use the Simulate button to trigger customer inbound webhooks.</span>
                  </div>
                ) : (
                  selectedSession.messages.map((msg, idx) => {
                    const isOutbound = msg.direction === 'OUTBOUND';

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        {/* Direction & Timestamp Header */}
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                          {isOutbound ? (
                            <>
                              <Bot className="w-3 h-3 text-zinc-600 dark:text-zinc-400" />
                              <span>NDR Engine</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 text-zinc-600 dark:text-zinc-400" />
                              <span>Customer</span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Speech Bubble */}
                        <div
                          className={`max-w-[85%] p-3.5 text-xs shadow-xs border ${
                            isOutbound
                              ? 'bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-950 dark:text-zinc-50 border-zinc-300 dark:border-zinc-700'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="whitespace-pre-wrap leading-relaxed select-text">{msg.text}</div>

                          {/* Bubble Metadata */}
                          <div className="mt-2 flex items-center justify-end gap-1.5 text-[9px] text-zinc-500 font-mono pt-1 border-t border-zinc-300/40 dark:border-zinc-700/40">
                            <span>{msg.messageType}</span>
                            {isOutbound && <CheckCheck className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Interactive Draft State Preview (Date Slot / Location Pin) */}
                {selectedSession.draft?.coordinates && (
                  <div className="p-2.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 max-w-sm ml-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
                      <div className="font-mono text-zinc-900 dark:text-zinc-100">
                        GPS: {selectedSession.draft.coordinates.lat.toFixed(4)},{' '}
                        {selectedSession.draft.coordinates.lng.toFixed(4)}
                      </div>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${selectedSession.draft.coordinates.lat},${selectedSession.draft.coordinates.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white underline font-semibold"
                    >
                      <span>Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Minimalist Bottom Transcript Status Bar */}
              <div className="h-8 min-h-8 border-t border-zinc-200 dark:border-zinc-800 px-3 sm:px-4 flex items-center justify-between text-[10px] text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3 text-zinc-400" />
                  <span className="truncate">META HMAC-SHA256 SIGNED</span>
                </div>
                <div className="font-mono shrink-0">
                  VERSION: <span className="text-zinc-800 dark:text-zinc-200 font-bold">{selectedSession.stateVersion ?? 1}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* SLIDE-OVER DRAWER: WhatsApp Customer Inbound Simulator       */}
      {/* ============================================================ */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop with blur and light-dismiss */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSimulatorOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in Drawer Window */}
          <div
            className="relative w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col h-full max-h-dvh font-mono text-xs z-10 min-h-0"
            role="dialog"
            aria-modal="true"
            aria-label="Interactive Customer Simulator"
          >
            {/* Drawer Header */}
            <div className="h-11 min-h-11 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                <Zap className="w-4 h-4 text-zinc-500" />
                <span>Customer Simulator</span>
              </div>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                aria-label="Close simulator"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 overscroll-contain">
              {/* Target Shipment ID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="sim-shipment-id" className="text-[11px] font-bold uppercase text-zinc-700 dark:text-zinc-300">
                    Shipment ID *
                  </label>
                  {simShipmentId && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(simShipmentId, 'simId')}
                      className="text-[10px] text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1"
                    >
                      {copiedId === 'simId' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === 'simId' ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
                <input
                  id="sim-shipment-id"
                  type="text"
                  value={simShipmentId}
                  onChange={(e) => setSimShipmentId(e.target.value)}
                  placeholder="Paste Target Shipment ID"
                  className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                />
              </div>

              {/* State-Aware Quick Action Response Chips */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-700 dark:text-zinc-300 mb-2">
                  Customer Reply Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimActionType('ACTION_RESCHEDULE')}
                    className={`p-2 border text-left transition-colors ${
                      simActionType === 'ACTION_RESCHEDULE'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="font-bold">1. Reschedule</div>
                    <div className="text-[10px] opacity-75">Trigger date picker</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('ACTION_CORRECTION')}
                    className={`p-2 border text-left transition-colors ${
                      simActionType === 'ACTION_CORRECTION'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="font-bold">2. Wrong Info</div>
                    <div className="text-[10px] opacity-75">Customer correction</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('SELECT_DATE')}
                    className={`p-2 border text-left transition-colors ${
                      simActionType === 'SELECT_DATE'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="font-bold">3. Select Date</div>
                    <div className="text-[10px] opacity-75">Choose delivery slot</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('SHARE_LOCATION')}
                    className={`p-2 border text-left transition-colors ${
                      simActionType === 'SHARE_LOCATION'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="font-bold">4. Share GPS Pin</div>
                    <div className="text-[10px] opacity-75">Inbound coordinates</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('CONFIRM_RESCHEDULE')}
                    className={`p-2 border text-left transition-colors ${
                      simActionType === 'CONFIRM_RESCHEDULE'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="font-bold">5. Confirm Final</div>
                    <div className="text-[10px] opacity-75">Resolve session</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimActionType('ACTION_CANCEL')}
                    className={`p-2 border text-left transition-colors ${
                      simActionType === 'ACTION_CANCEL'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="font-bold">6. Cancel Order</div>
                    <div className="text-[10px] opacity-75">Initiate RTO return</div>
                  </button>
                </div>
              </div>

              {/* Action-Specific Subcontrols */}
              {simActionType === 'SELECT_DATE' && (
                <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
                  <span className="text-[11px] font-bold uppercase text-zinc-700 dark:text-zinc-300 block">
                    Available Delivery Dates:
                  </span>
                  <div className="space-y-1.5">
                    {availableDates.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setSimSelectedDate(d.key)}
                        className={`w-full p-2 border flex items-center justify-between text-left transition-colors ${
                          simSelectedDate === d.key
                            ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{d.label}</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-80">{d.key}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {simActionType === 'SHARE_LOCATION' && (
                <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
                  <span className="text-[11px] font-bold uppercase text-zinc-700 dark:text-zinc-300 block">
                    Simulate GPS Pin:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="sim-lat" className="text-[10px] text-zinc-500 block">Latitude</label>
                      <input
                        id="sim-lat"
                        type="number"
                        step="any"
                        value={simCoordinates.lat}
                        onChange={(e) =>
                          setSimCoordinates({ ...simCoordinates, lat: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="sim-lng" className="text-[10px] text-zinc-500 block">Longitude</label>
                      <input
                        id="sim-lng"
                        type="number"
                        step="any"
                        value={simCoordinates.lng}
                        onChange={(e) =>
                          setSimCoordinates({ ...simCoordinates, lng: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* City Presets */}
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setSimCoordinates({ lat: 24.8607, lng: 67.0011 })}
                      className="px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[10px] text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                    >
                      Karachi
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimCoordinates({ lat: 31.5204, lng: 74.3587 })}
                      className="px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[10px] text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                    >
                      Lahore
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimCoordinates({ lat: 33.6844, lng: 73.0479 })}
                      className="px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[10px] text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                    >
                      Islamabad
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input Box Emulator */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <label htmlFor="sim-custom-text" className="block text-[11px] font-bold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Customer Message Emulator
                </label>
                <textarea
                  id="sim-custom-text"
                  value={simCustomText}
                  onChange={(e) => {
                    setSimCustomText(e.target.value);
                    if (simActionType !== 'CUSTOM_TEXT') {
                      setSimActionType('CUSTOM_TEXT');
                    }
                  }}
                  rows={3}
                  placeholder="Type simulated customer message..."
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                />
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
              <button
                type="button"
                onClick={handleRunSimulator}
                disabled={actionLoading || !simShipmentId.trim()}
                className="w-full py-2.5 px-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Send className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>Execute Simulated Turn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsTab;
