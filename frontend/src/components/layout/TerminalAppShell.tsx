// src/components/layout/TerminalAppShell.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router';
import {
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
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  Key,
  Sun,
  Moon,
  Terminal,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { onApiCallLogged, type ApiCallLogEntry } from '../../api/telemetry';
import { Parcel360Drawer } from '../shipments/Parcel360Drawer';
import { GlobalOmnisearchModal } from './GlobalOmnisearchModal';
import { QuickAuthModal } from '../shipments/QuickAuthModal';
import { RasaiLogo } from '../auth/RasaiLogo';
import { RasaiUrduCalligraphy } from '../common/RasaiUrduCalligraphy';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    group: 'Operations',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Triage', path: '/triage', icon: AlertTriangle },
      { label: 'Shipments', path: '/shipments', icon: Package },
    ],
  },
  {
    group: 'Customer Comms',
    items: [
      { label: 'Conversations', path: '/conversations', icon: MessageSquare },
      { label: 'Outbox', path: '/outbox', icon: Send },
    ],
  },
  {
    group: 'Logistics',
    items: [{ label: 'Dispatch', path: '/manifests', icon: FileSpreadsheet }],
  },
  {
    group: 'Finance & Disputes',
    items: [{ label: 'Disputes', path: '/disputes', icon: ShieldAlert }],
  },
  {
    group: 'Diagnostics',
    items: [
      { label: 'Health', path: '/system/carrier-health', icon: Activity },
      { label: 'Poller', path: '/system/poller', icon: Zap },
      { label: 'Simulator', path: '/system/simulator', icon: Sliders },
      { label: 'Ledger', path: '/system/ledger', icon: Layers },
      { label: 'Tracking', path: '/system/tracking', icon: Compass },
    ],
  },
  {
    group: 'Settings',
    items: [{ label: 'Configuration', path: '/settings', icon: Settings }],
  },
];

export const TerminalAppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [omnisearchOpen, setOmnisearchOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Live PKT clock
  const [pktTime, setPktTime] = useState<string>('');

  // Latest API telemetry
  const [lastLog, setLastLog] = useState<ApiCallLogEntry | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Karachi',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setPktTime(formatted);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onApiCallLogged((entry) => {
      setLastLog(entry);
    });
    return unsubscribe;
  }, []);

  // Global hotkey for Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOmnisearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
      }`}
    >
      {/* Top Header Bar */}
      <header
        className={`relative h-11 border-b flex items-center justify-between px-3 md:px-4 z-40 select-none ${
          isDark
            ? 'bg-zinc-950/95 border-zinc-800 text-zinc-200'
            : 'bg-white border-zinc-200 text-zinc-800 shadow-2xs'
        }`}
      >
        {/* Left Section: Mobile menu / Sidebar toggle & Search Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile & Tablet hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1 text-zinc-400 hover:text-white"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Desktop collapse rail button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile brand text */}
          <Link to="/dashboard" className="md:hidden flex items-center select-none">
            <span className="font-bold text-xs tracking-wider uppercase text-zinc-100">
              Rasai
            </span>
          </Link>

          {/* Omnisearch trigger button - Left side of the screen */}
          <button
            onClick={() => setOmnisearchOpen(true)}
            className={`flex items-center gap-2 px-2.5 py-1 text-zinc-400 hover:text-zinc-200 border transition-colors ${
              isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
            }`}
            title="Search (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline text-[11px]">Search...</span>
            <span className="hidden sm:inline text-[10px] text-zinc-500 bg-zinc-800/80 px-1 py-0.2 border border-zinc-700">
              ⌘K
            </span>
          </button>
        </div>

        {/* Center Section: Tablets + Desktop "Rasai" (English) + Logo + "رسائی" (Urdu) */}
        <Link
          to="/dashboard"
          className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2.5 group select-none hover:opacity-90 transition-opacity"
          title="Rasai"
        >
          <span className="font-bold text-xs sm:text-sm tracking-wider uppercase text-zinc-100 group-hover:text-white transition-colors">
            rasai
          </span>
          <RasaiLogo size={20} className="transition-transform group-hover:scale-105" />
          <RasaiUrduCalligraphy
            height={18}
            variant="white"
            className="transition-opacity group-hover:opacity-100 opacity-90"
          />
        </Link>

        {/* Right Section: Time (no ping), Theme Switcher, User Credentials */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Live PKT Clock (without ping) */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2 py-1 border ${
              isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-300 text-zinc-600'
            }`}
          >
            <span className="text-[11px] font-bold text-zinc-200">{pktTime}</span>
            <span className="text-[9px] text-zinc-500 uppercase">PKT</span>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 border transition-colors ${
              isDark
                ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:text-black'
            }`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Auth Modal Button */}
          <button
            onClick={() => setAuthModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 font-bold text-[11px] border transition-colors ${
              accessToken
                ? isDark
                  ? 'bg-zinc-900 border-zinc-700 text-emerald-400 hover:border-emerald-500/50'
                  : 'bg-zinc-100 border-zinc-300 text-emerald-700 hover:border-emerald-500'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <Key className="w-3 h-3" />
            <span className="hidden sm:inline">
              {accessToken
                ? user
                  ? `${user.username || user.email}`
                  : 'Authenticated'
                : 'Auth Setup'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Layout Container (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile & Tablet Navigation Drawer Backdrop with Background Blur (Light-Dismiss) */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-50 transition-all duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile & Tablet Navigation Drawer (Opens OVER the screen without pushing content) */}
        <aside
          className={`lg:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } ${
            isDark ? 'bg-zinc-950/95 border-r border-zinc-800 text-zinc-100' : 'bg-white/95 border-r border-zinc-200 text-zinc-900'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          {/* Drawer Header */}
          <div className="h-11 border-b border-border px-4 flex items-center justify-between shrink-0">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 font-mono select-none"
            >
              <span className="font-bold text-sm tracking-wider uppercase text-zinc-100 hover:text-white transition-colors">
                Rasai
              </span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Navigation Items - Always Show Full Text Labels */}
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4 font-mono">
            {NAVIGATION_GROUPS.map((grp) => (
              <div key={grp.group} className="space-y-1">
                <div className="px-2 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  {grp.group}
                </div>
                <div className="space-y-0.5">
                  {grp.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 text-xs transition-colors border ${
                          isActive
                            ? isDark
                              ? 'bg-zinc-900 text-white font-bold border-zinc-700'
                              : 'bg-zinc-100 text-black font-bold border-zinc-300'
                            : isDark
                            ? 'text-zinc-300 hover:text-white hover:bg-zinc-900/50 border-transparent'
                            : 'text-zinc-700 hover:text-black hover:bg-zinc-50 border-transparent'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 text-zinc-400" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Drawer Footer */}
          <div className={`p-3 border-t font-mono text-xs space-y-1 shrink-0 ${
            isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-600'
          }`}>
            <Link
              to="/track"
              target="_blank"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-2 py-1.5 hover:text-white transition-colors"
            >
              ↗ Public Tracking
            </Link>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-2 py-1.5 hover:text-white transition-colors"
            >
              ← Story Landing
            </Link>
          </div>
        </aside>

        {/* Desktop Left Sidebar (Only for Desktop lg:screens - Rail / Expanded) */}
        <aside
          className={`hidden lg:flex border-r flex-col z-30 transition-all duration-200 ${
            sidebarCollapsed ? 'w-14' : 'w-56'
          } ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          {/* Sidebar Navigation Items */}
          <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 font-mono">
            {NAVIGATION_GROUPS.map((grp) => (
              <div key={grp.group} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="px-2 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    {grp.group}
                  </div>
                )}
                <div className="space-y-0.5">
                  {grp.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 text-xs transition-colors border ${
                          isActive
                            ? isDark
                              ? 'bg-zinc-900 text-white font-bold border-zinc-700'
                              : 'bg-zinc-100 text-black font-bold border-zinc-300'
                            : isDark
                            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border-transparent'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border-transparent'
                        }`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer Link to Public Tracking & Landing */}
          <div className={`p-2 border-t font-mono text-[10px] space-y-1 ${
            isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-600'
          }`}>
            <Link
              to="/track"
              target="_blank"
              className="block px-2 py-1 hover:text-zinc-300 transition-colors"
            >
              {!sidebarCollapsed ? '↗ Public Tracking' : '↗'}
            </Link>
            <Link
              to="/"
              className="block px-2 py-1 hover:text-zinc-300 transition-colors"
            >
              {!sidebarCollapsed ? '← Story Landing' : '←'}
            </Link>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-3 md:p-5">
            <Outlet />
          </div>

          {/* Bottom Terminal Status Bar */}
          <footer
            className={`h-7 border-t px-3 flex items-center justify-between font-mono text-[10px] select-none ${
              isDark
                ? 'bg-zinc-950 border-zinc-800 text-zinc-400'
                : 'bg-zinc-100 border-zinc-200 text-zinc-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span>TERMINAL_MONO</span>
              </span>
              <span className="hidden sm:inline text-zinc-600">|</span>
              <span className="hidden sm:inline">
                API STATUS: {lastLog ? (
                  <span className={lastLog.isError ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {lastLog.method} {lastLog.status} ({lastLog.durationMs}ms)
                  </span>
                ) : (
                  <span className="text-zinc-500">IDLE</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline">
                ACTIVE USER: {user?.username || 'GUEST'}
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">PKT (UTC+5)</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Global 360° Parcel Drawer */}
      <Parcel360Drawer />

      {/* Global Omnisearch Modal */}
      <GlobalOmnisearchModal
        isOpen={omnisearchOpen}
        onClose={() => setOmnisearchOpen(false)}
      />

      {/* Quick Auth Switcher Modal */}
      <QuickAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default TerminalAppShell;
