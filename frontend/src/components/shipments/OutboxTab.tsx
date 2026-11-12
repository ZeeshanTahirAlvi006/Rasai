// src/components/shipments/OutboxTab.tsx
// Production transactional message outbox and WhatsApp HSM template manager.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  FileText,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  IOutboxMessageItem,
  OutboxSummary,
  MerchantTemplateConfig,
  OutboxStatus,
  OutboxMessageType,
  ListOutboxFilter,
} from '../../types/outbox';
import {
  listOutboxMessages,
  dispatchOutboxMessage,
  listTemplates,
  saveTemplate,
} from '../../api/outboxApi';
import { useShipmentInspection } from '../../context/ShipmentInspectionContext';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { cn } from '../../lib/utils';

// Status styling: Clean plain text with semantic colors (Rule 8: Zero background pills or border boxes)
const STATUS_CONFIG: Record<
  OutboxStatus,
  { label: string; textClass: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Pending',
    textClass: 'text-amber-600 dark:text-amber-400 font-semibold',
    icon: <Clock className="w-3 h-3 shrink-0" />,
  },
  PROCESSING: {
    label: 'Sending',
    textClass: 'text-blue-600 dark:text-blue-400 font-semibold',
    icon: <RefreshCw className="w-3 h-3 animate-spin shrink-0" />,
  },
  DISPATCHED: {
    label: 'Sent',
    textClass: 'text-emerald-600 dark:text-emerald-400 font-semibold',
    icon: <CheckCircle2 className="w-3 h-3 shrink-0" />,
  },
  DISCARDED_STALE: {
    label: 'Cancelled',
    textClass: 'text-zinc-500 font-medium',
    icon: <AlertTriangle className="w-3 h-3 shrink-0" />,
  },
  FAILED: {
    label: 'Failed',
    textClass: 'text-rose-600 dark:text-rose-400 font-bold',
    icon: <XCircle className="w-3 h-3 shrink-0" />,
  },
};

const TYPE_CONFIG: Record<OutboxMessageType, { label: string }> = {
  NDR_UTILITY_TEMPLATE: { label: 'NDR Notice' },
  RTO_NOTICE: { label: 'RTO Notice' },
  DELIVERY_CORRECTION: { label: 'Address Update' },
  RESCHEDULE_CONFIRMATION: { label: 'Rescheduled' },
};

function formatLastError(lastError: any): string {
  if (!lastError) return '';
  if (typeof lastError === 'string') return lastError;
  if (typeof lastError === 'object') {
    if (lastError.message) {
      return lastError.code ? `[${lastError.code}] ${lastError.message}` : String(lastError.message);
    }
    try {
      return JSON.stringify(lastError);
    } catch {
      return String(lastError);
    }
  }
  return String(lastError);
}

export const OutboxTab: React.FC = () => {
  const { openInspection } = useShipmentInspection();

  // Active view: Messages queue or WhatsApp HSM Templates
  const [activeTab, setActiveTab] = useState<'messages' | 'templates'>('messages');

  // Main Data States
  const [messages, setMessages] = useState<IOutboxMessageItem[]>([]);
  const [summary, setSummary] = useState<OutboxSummary>({
    PENDING: 0,
    PROCESSING: 0,
    DISPATCHED: 0,
    DISCARDED_STALE: 0,
    FAILED: 0,
  });
  const [templates, setTemplates] = useState<MerchantTemplateConfig[]>([]);

  // Loading States
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Accordion Expand State
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Template Modal Editor State
  const [editingTemplate, setEditingTemplate] = useState<MerchantTemplateConfig | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplLang, setTplLang] = useState('en_US');
  const [tplHeaderType, setTplHeaderType] = useState<'NONE' | 'TEXT'>('NONE');
  const [tplHeaderText, setTplHeaderText] = useState('');
  const [tplBindings, setTplBindings] = useState('');
  const [tplSaving, setTplSaving] = useState(false);

  const fetchOutboxData = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const filter: ListOutboxFilter = { limit: 100 };
      if (statusFilter) filter.status = statusFilter as OutboxStatus;
      if (typeFilter) filter.messageType = typeFilter as OutboxMessageType;

      const res = await listOutboxMessages(filter);
      setMessages(res.data.messages || []);
      setSummary(res.data.summary);
    } catch (err: any) {
      if (err?.status !== 401 && err?.response?.status !== 401) {
        toast.error(typeof err?.message === 'string' ? err.message : 'Failed to load messages');
      }
    } finally {
      setLoadingMessages(false);
    }
  }, [statusFilter, typeFilter]);

  const fetchTemplatesData = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await listTemplates();
      setTemplates(res.data || []);
    } catch (err: any) {
      console.error('Template list error:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchOutboxData();
    fetchTemplatesData();
  }, [fetchOutboxData, fetchTemplatesData]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handle ESC key for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingTemplate) {
        setEditingTemplate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingTemplate]);

  // Handle Single Message Immediate Dispatch / Retry
  const handleDispatchMessage = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDispatchingId(id);
    try {
      const res = await dispatchOutboxMessage(id);
      toast.success(`Message processed: ${res.data.status}`);
      fetchOutboxData();
    } catch (err: any) {
      toast.error(typeof err?.message === 'string' ? err.message : 'Dispatch failed');
    } finally {
      setDispatchingId(null);
    }
  };

  // Open Template Editor
  const handleEditTemplate = (tpl: MerchantTemplateConfig) => {
    setEditingTemplate(tpl);
    setTplName(tpl.templateName || '');
    setTplLang(tpl.languageCode || 'en_US');
    setTplHeaderType(tpl.headerType || 'NONE');
    setTplHeaderText(tpl.headerText || '');
    setTplBindings((tpl.parameterBindings || []).join(', '));
  };

  // Save Template Config
  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setTplSaving(true);
    try {
      const bindingsArray = tplBindings
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await saveTemplate({
        messageType: editingTemplate.messageType,
        templateName: tplName.trim(),
        languageCode: tplLang.trim(),
        headerType: tplHeaderType,
        headerText: tplHeaderText.trim() || undefined,
        parameterBindings: bindingsArray,
        status: 'ACTIVE',
      });

      toast.success(`Template updated for ${editingTemplate.messageType}`);
      setEditingTemplate(null);
      fetchTemplatesData();
    } catch (err: any) {
      toast.error(typeof err?.message === 'string' ? err.message : 'Failed to save template');
    } finally {
      setTplSaving(false);
    }
  };

  const handleCopy = (text: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleRowExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Client-side search across tracking, ID, dedupeKey, error, or meta ID
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (statusFilter && msg.status !== statusFilter) return false;
      if (typeFilter && msg.messageType !== typeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const tracking =
        typeof msg.shipmentId === 'object' && msg.shipmentId !== null
          ? (msg.shipmentId.trackingNumber || '').toLowerCase()
          : '';
      const id = msg._id.toLowerCase();
      const dedupe = (msg.dedupeKey || '').toLowerCase();
      const err = formatLastError(msg.lastError).toLowerCase();
      const metaId = (msg.metaMessageId || '').toLowerCase();
      return (
        tracking.includes(q) ||
        id.includes(q) ||
        dedupe.includes(q) ||
        err.includes(q) ||
        metaId.includes(q)
      );
    });
  }, [messages, statusFilter, typeFilter, searchQuery]);

  return (
    <div className="space-y-3 font-mono text-xs select-none">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & COMPACT SUBVIEW SWITCHER                     */}
      {/* ============================================================ */}
      <div className="border border-border bg-white dark:bg-black p-2 sm:p-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Subview Tabs: Messages & Templates */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer border',
                activeTab === 'messages'
                  ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                  : 'border-transparent text-zinc-500 hover:text-black dark:hover:text-white'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Messages</span>
              <span className="text-[10px] opacity-75">({messages.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer border',
                activeTab === 'templates'
                  ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                  : 'border-transparent text-zinc-500 hover:text-black dark:hover:text-white'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Templates</span>
              <span className="text-[10px] opacity-75">({templates.length})</span>
            </button>
          </div>

          {/* Quick Metrics Summary & Refresh */}
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] shrink-0">
            <div className="flex items-center gap-2 text-muted-foreground font-mono">
              <span>
                Sent <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{summary.DISPATCHED}</strong>
              </span>
              <span>•</span>
              <span>
                Pending <strong className="text-amber-600 dark:text-amber-400 font-bold">{summary.PENDING}</strong>
              </span>
              <span>•</span>
              <span>
                Failed{' '}
                <strong
                  className={cn(
                    'font-bold',
                    summary.FAILED > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'
                  )}
                >
                  {summary.FAILED}
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={refreshAll}
              disabled={loadingMessages || loadingTemplates}
              title="Refresh outbox and templates"
              aria-label="Refresh"
              className="p-1 border border-border bg-white dark:bg-black text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={cn('w-3.5 h-3.5', (loadingMessages || loadingTemplates) && 'animate-spin')}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SUBVIEW 1: MESSAGES QUEUE                                 */}
      {/* ============================================================ */}
      {activeTab === 'messages' && (
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-xs">
          {/* Table Search & Filter Toolbar */}
          <div className="p-2 sm:p-2.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-zinc-50/50 dark:bg-black">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[140px] sm:min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracking #..."
                  className="w-full pl-8 pr-2.5 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-2 py-1">
                <Filter className="w-3 h-3 text-zinc-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white dark:bg-black text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer dark:[color-scheme:dark]"
                >
                  <option value="" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">All Statuses</option>
                  <option value="DISPATCHED" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">Sent</option>
                  <option value="PENDING" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">Pending</option>
                  <option value="PROCESSING" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">Sending</option>
                  <option value="FAILED" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">Failed</option>
                  <option value="DISCARDED_STALE" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">Cancelled</option>
                </select>
              </div>

              {/* Message Type Filter Dropdown */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer dark:[color-scheme:dark]"
              >
                <option value="" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">All Types</option>
                <option value="NDR_UTILITY_TEMPLATE" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">NDR Notice</option>
                <option value="RTO_NOTICE" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">RTO Notice</option>
                <option value="DELIVERY_CORRECTION" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">Address Update</option>
                <option value="RESCHEDULE_CONFIRMATION" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">Rescheduled</option>
              </select>

              {(statusFilter || typeFilter || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('');
                    setTypeFilter('');
                    setSearchQuery('');
                  }}
                  className="text-[11px] text-zinc-500 hover:text-black dark:hover:text-white underline font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="text-[11px] text-zinc-500 font-mono shrink-0">
              Showing {filteredMessages.length} of {messages.length}
            </div>
          </div>

          {/* High-Density Responsive Table with Sticky Header */}
          <div
            role="region"
            tabIndex={0}
            aria-label="Dispatch Queue Table"
            className="border-t border-zinc-200 dark:border-zinc-800 focus:outline-hidden overflow-x-auto"
          >
            <Table className="max-h-[500px]">
              <TableHeader className="bg-muted/30 sticky top-0 z-10">
                <TableRow>
                  {/* Tracking Num (Always visible) */}
                  <TableHead className="py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Tracking
                  </TableHead>

                  {/* Type (Visible on md+) */}
                  <TableHead className="hidden md:table-cell py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Type
                  </TableHead>

                  {/* Status (Always visible, clean text) */}
                  <TableHead className="py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Status
                  </TableHead>

                  {/* Attempts (Visible on sm+) */}
                  <TableHead className="hidden sm:table-cell py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Attempts
                  </TableHead>

                  {/* Action (Always visible) */}
                  <TableHead className="py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-zinc-800 dark:text-zinc-200 font-mono">
                {loadingMessages && messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                      <span>Loading messages...</span>
                    </TableCell>
                  </TableRow>
                ) : filteredMessages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground space-y-1">
                      <MessageSquare className="w-6 h-6 mx-auto opacity-30 mb-2" />
                      <div className="font-semibold text-zinc-700 dark:text-zinc-300">No Messages Found</div>
                      <div className="text-[11px]">Messages generate automatically when NDR events dispatch.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMessages.map((msg) => {
                    const isExpanded = expandedIds.has(msg._id);
                    const statusConf = STATUS_CONFIG[msg.status] || STATUS_CONFIG.PENDING;
                    const typeConf = TYPE_CONFIG[msg.messageType] || { label: msg.messageType };
                    const shipment =
                      typeof msg.shipmentId === 'object' && msg.shipmentId !== null ? msg.shipmentId : null;

                    return (
                      <React.Fragment key={msg._id}>
                        {/* Main Table Row */}
                        <TableRow
                          onClick={() => toggleRowExpand(msg._id)}
                          className={cn(
                            'cursor-pointer text-xs transition-colors',
                            isExpanded ? 'bg-zinc-100 dark:bg-zinc-900/80 font-medium' : 'hover:bg-muted/50'
                          )}
                        >
                          {/* Tracking */}
                          <TableCell className="py-2 px-3">
                            {shipment ? (
                              <div className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (shipment._id) openInspection(shipment._id);
                                  }}
                                  className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1 whitespace-nowrap"
                                  title="Inspect Parcel"
                                >
                                  <span>{shipment.trackingNumber || 'N/A'}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                                </button>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                                  <span>#{msg._id.slice(-6)}</span>
                                  <span className="md:hidden">• {typeConf.label}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                  {typeof msg.shipmentId === 'string' ? msg.shipmentId.slice(-8) : 'N/A'}
                                </span>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  #{msg._id.slice(-6)} <span className="md:hidden">• {typeConf.label}</span>
                                </div>
                              </div>
                            )}
                          </TableCell>

                          {/* Type (Visible on md+) */}
                          <TableCell className="hidden md:table-cell py-2 px-3">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 block text-xs whitespace-nowrap">
                              {typeConf.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              {msg.channel === 'META_WHATSAPP' ? 'WhatsApp' : msg.channel}
                            </span>
                          </TableCell>

                          {/* Status (Clean plain text semantic styling, Rule 8) */}
                          <TableCell className="py-2 px-3">
                            <span className={cn('inline-flex items-center gap-1 text-[11px]', statusConf.textClass)}>
                              {statusConf.icon}
                              <span>{statusConf.label}</span>
                            </span>
                            {/* Mobile subtext for attempt count (below sm) */}
                            <div className="sm:hidden text-[10px] text-muted-foreground font-mono mt-0.5">
                              Att: {msg.attempts}/5
                            </div>
                          </TableCell>

                          {/* Attempts (Visible on sm+) */}
                          <TableCell className="hidden sm:table-cell py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                            <span
                              className={
                                msg.attempts >= 4
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-zinc-900 dark:text-zinc-100 font-semibold'
                              }
                            >
                              {msg.attempts}/5
                            </span>
                          </TableCell>

                          {/* Action (Clean, compact, no bulky disabled buttons) */}
                          <TableCell className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                              {msg.status === 'FAILED' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDispatchMessage(msg._id, e)}
                                  disabled={dispatchingId === msg._id}
                                  className="px-2 py-0.5 text-[10px] font-bold border border-rose-500 bg-rose-500 text-white hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                                  title="Retry message"
                                >
                                  {dispatchingId === msg._id ? (
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                  ) : (
                                    'Retry'
                                  )}
                                </button>
                              )}

                              {msg.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDispatchMessage(msg._id, e)}
                                  disabled={dispatchingId === msg._id}
                                  className="px-2 py-0.5 text-[10px] font-bold border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                                  title="Send message now"
                                >
                                  {dispatchingId === msg._id ? (
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                  ) : (
                                    'Send'
                                  )}
                                </button>
                              )}

                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                onClick={(e) => toggleRowExpand(msg._id, e)}
                                className="p-1 border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Accordion Expanded Sub-Row */}
                        {isExpanded && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                            <TableCell colSpan={5} className="p-3 space-y-2.5 font-mono text-xs">
                              <div className="flex items-center justify-between border-b border-border pb-1.5 flex-wrap gap-2">
                                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                                  <span>ID: {msg._id}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopy(msg._id, msg._id, e)}
                                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    title="Copy ID"
                                  >
                                    {copiedId === msg._id ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <span>
                                    Sent: {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : 'Pending'}
                                  </span>
                                </div>
                              </div>

                              {/* Error Banner if any */}
                              {msg.lastError && (
                                <div className="p-2 border border-rose-300 dark:border-rose-800 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
                                  <strong>Error:</strong> {formatLastError(msg.lastError)}
                                </div>
                              )}

                              {/* Payload Preview */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                    Payload JSON:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleCopy(
                                        JSON.stringify(msg.payload, null, 2),
                                        `pl-${msg._id}`,
                                        e
                                      )
                                    }
                                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                                  >
                                    {copiedId === `pl-${msg._id}` ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>{copiedId === `pl-${msg._id}` ? 'Copied' : 'Copy'}</span>
                                  </button>
                                </div>
                                <pre className="p-2.5 border border-border bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-[11px] font-mono overflow-x-auto max-h-36">
                                  {JSON.stringify(msg.payload, null, 2)}
                                </pre>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. SUBVIEW 2: WHATSAPP HSM TEMPLATES CATALOG                 */}
      {/* ============================================================ */}
      {activeTab === 'templates' && (
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-3 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <span>Configured Meta-approved notification templates and dynamic parameter bindings.</span>
            <span className="font-mono text-[10px] text-zinc-400">Total: {templates.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((tpl) => (
              <div
                key={tpl.messageType}
                className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {TYPE_CONFIG[tpl.messageType]?.label || tpl.messageType}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 border border-zinc-300 dark:border-zinc-700 text-zinc-500 font-mono">
                      {tpl.isCustom ? 'Custom' : 'Default'}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Template: <strong className="text-zinc-900 dark:text-zinc-100">{tpl.templateName}</strong>{' '}
                    <span className="text-zinc-500">({tpl.languageCode})</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {(tpl.parameterBindings || []).map((binding) => (
                      <span
                        key={binding}
                        className="px-1.5 py-0.2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[10px] text-zinc-500 font-mono"
                      >
                        {`{{${binding}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleEditTemplate(tpl)}
                  className="px-2.5 py-1 text-[11px] font-bold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 transition-colors cursor-pointer"
                >
                  Configure
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. TEMPLATE CONFIGURATION MODAL (MONOCHROME DIALOG)          */}
      {/* ============================================================ */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4 font-mono text-xs"
            role="dialog"
            aria-modal="true"
            aria-label="Configure Template"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                <FileText className="w-4 h-4 text-zinc-500" />
                <span>
                  Configure Template: {TYPE_CONFIG[editingTemplate.messageType]?.label || editingTemplate.messageType}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="p-1 text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-bold uppercase text-[11px]">
                  Template Name:
                </label>
                <input
                  type="text"
                  required
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="e.g. ndr_utility_v1"
                  className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-bold uppercase text-[11px]">
                    Language:
                  </label>
                  <input
                    type="text"
                    required
                    value={tplLang}
                    onChange={(e) => setTplLang(e.target.value)}
                    placeholder="e.g. en_US"
                    className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-bold uppercase text-[11px]">
                    Header Type:
                  </label>
                  <select
                    value={tplHeaderType}
                    onChange={(e) => setTplHeaderType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden cursor-pointer font-mono dark:[color-scheme:dark]"
                  >
                    <option value="NONE" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">None</option>
                    <option value="TEXT" className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">Text</option>
                  </select>
                </div>
              </div>

              {tplHeaderType === 'TEXT' && (
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-bold uppercase text-[11px]">
                    Header Text:
                  </label>
                  <input
                    type="text"
                    value={tplHeaderText}
                    onChange={(e) => setTplHeaderText(e.target.value)}
                    placeholder="Delivery Notice"
                    className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-bold uppercase text-[11px]">
                  Variable Bindings (comma-separated):
                </label>
                <input
                  type="text"
                  value={tplBindings}
                  onChange={(e) => setTplBindings(e.target.value)}
                  placeholder="trackingNumber, orderAmount, carrier"
                  className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Parameters: trackingNumber, orderValueCOD, carrier, rescheduledDate, customerPhone
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tplSaving}
                  className="px-4 py-1.5 text-xs font-bold uppercase border border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                >
                  {tplSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutboxTab;
