import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, AuditLogEvent } from '../types';

interface HeaderProps {
  pageTitle: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  apiOnline: boolean;
  onRefreshApi: () => void;
  user: UserProfile;
  recentEvents?: AuditLogEvent[];
  currency?: string;
  rate?: number;
  onToggleCurrency?: () => void;
  onNavigateAudit: () => void;
  onNavigateSettings: () => void;
  onBack?: () => void;
  onLogout: () => void;
  onSyncData?: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  apiOnline,
  onRefreshApi,
  user,
  recentEvents = [],
  currency = 'IQD',
  rate = 1310,
  onToggleCurrency,
  onNavigateAudit,
  onNavigateSettings,
  onLogout,
  onSyncData,
  isSyncing = false,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAuditor = user.role?.toLowerCase().includes('auditor');

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 flex justify-between items-center w-full px-6 md:px-8 h-20 z-40 shrink-0 sticky top-0 shadow-xs select-none">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight tracking-tight flex items-center gap-2">
            {pageTitle}
          </h1>
          <p className="text-xs font-semibold text-slate-500 hidden sm:block mt-0.5">
            Institutional University Division • Central Payroll System
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Instant System Sync Button (Item 20) */}
        {onSyncData && (
          <button
            type="button"
            onClick={onSyncData}
            title="Sync system data immediately across accounts"
            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <span className={`material-symbols-outlined text-[17px] text-teal-700 ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        )}

        {/* Currency Quick Toggle */}
        {onToggleCurrency && (
          <button
            type="button"
            onClick={onToggleCurrency}
            title={`Active system currency: ${currency}. Rate: 1 USD = ${rate.toLocaleString()} IQD. Click to switch.`}
            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <span className="text-sm">{currency === 'USD' ? '💵' : '🏛️'}</span>
            <span>{currency}</span>
            <span className="text-[10px] text-slate-400 font-mono">({rate})</span>
          </button>
        )}

        {/* Wi-Fi Signal Indicator */}
        <div className="relative group">
          <button
            type="button"
            onClick={onRefreshApi}
            title={
              apiOnline
                ? 'Backend Live: Ktor Engine connected (127.0.0.1:8080). Click to ping.'
                : 'Server Offline / Disconnected. Click to re-verify connection.'
            }
            className={`w-9 h-9 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
              apiOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span className="material-symbols-outlined text-[19px]">
              {apiOnline ? 'wifi' : 'wifi_off'}
            </span>
          </button>

          {/* Minimalist Hover Tooltip */}
          <div className="absolute right-0 top-full mt-2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-white shadow-xl pointer-events-none whitespace-nowrap z-50 animate-scale-in">
            <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{apiOnline ? 'Live API Connected (8080)' : 'Backend Offline • Local Mode'}</span>
          </div>
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            title="Recent Activity"
            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all relative cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-[19px]">notifications</span>
            {recentEvents.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 animate-scale-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]">
                    notifications_active
                  </span>
                  <span className="font-bold text-slate-900 text-[14px]">Forensic Activity</span>
                </div>
                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {recentEvents.length} events
                </span>
              </div>

              <div className="divide-y divide-slate-100 my-2 max-h-72 overflow-y-auto">
                {recentEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigateAudit();
                    }}
                    className="py-3 flex items-start gap-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                        event.category === 'DISBURSAL'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : event.category === 'SALARY'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {event.category === 'DISBURSAL'
                          ? 'check_circle'
                          : event.category === 'SALARY'
                          ? 'payments'
                          : 'upload_file'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] font-bold text-slate-900 truncate">{event.title}</p>
                        <span className="text-[10.5px] text-slate-400 shrink-0 font-mono">{event.timeDisplay}</span>
                      </div>
                      <p className="text-[11.5px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">{event.summary}</p>
                    </div>
                  </div>
                ))}

                {recentEvents.length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-[12.5px]">
                    No recent audit activity recorded
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    onNavigateAudit();
                  }}
                  className="text-[12.5px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center justify-center gap-1 w-full py-1.5 cursor-pointer"
                >
                  View Full Audit Ledger →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Action Icon Button */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            title={`Operator Profile: ${user.name} (${user.role || 'Admin'})`}
            className="h-9 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user.name.charAt(0) || 'A'}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline-block max-w-[120px] truncate">
              {user.name}
            </span>
            <span
              className={`hidden md:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                isAuditor ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isAuditor ? 'Fiscal Auditor' : 'Super Admin'}
            </span>
            <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-slate-700">
              expand_more
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 text-slate-800 animate-scale-in">
              <div className="p-3 border-b border-slate-100 mb-1">
                <p className="font-bold text-sm text-slate-900 leading-tight">{user.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">{user.email || 'admin@institution.edu'}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10.5px] font-bold">
                  {user.role || 'Super Admin'}
                </span>
              </div>

              <div className="space-y-1">
                {user.role !== 'Fiscal Auditor' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigateSettings();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-400">settings</span>
                      <span>System Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigateAudit();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-400">history_edu</span>
                      <span>Forensic Audit Trail</span>
                    </button>
                  </>
                )}

                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-rose-500">logout</span>
                    <span>Sign Out of Session</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
