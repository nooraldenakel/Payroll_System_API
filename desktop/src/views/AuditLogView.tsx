import React, { useState, useMemo } from 'react';
import { AuditLogEvent } from '../types';

interface AuditLogViewProps {
  auditLogs: AuditLogEvent[];
  onExportAudit: () => void;
}

type CategoryFilter = 'ALL' | 'SALARY' | 'DISBURSAL' | 'IMPORT' | 'SYSTEM';

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs, onExportAudit }) => {
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>('ALL');
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesCategory = selectedFilter === 'ALL' || log.category === selectedFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        log.title.toLowerCase().includes(q) ||
        log.summary.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorId.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [auditLogs, selectedFilter, search]);

  const getCategoryCount = (cat: CategoryFilter) => {
    if (cat === 'ALL') return auditLogs.length;
    return auditLogs.filter((l) => l.category === cat).length;
  };

  const getCategoryBadge = (category: AuditLogEvent['category']) => {
    switch (category) {
      case 'SALARY':
        return {
          icon: 'payments',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          indicator: 'bg-emerald-500',
        };
      case 'DISBURSAL':
        return {
          icon: 'account_balance',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          indicator: 'bg-blue-500',
        };
      case 'IMPORT':
        return {
          icon: 'upload_file',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          indicator: 'bg-amber-500',
        };
      case 'SYSTEM':
      default:
        return {
          icon: 'shield',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          indicator: 'bg-purple-500',
        };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#f8fafc] text-slate-800 select-none">
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs">
              <span className="material-symbols-outlined text-[26px]">history_edu</span>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Institutional Audit Trail
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 font-medium">
                Immutable forensic activity ledger of all payroll transactions, faculty compensations, and cycle transitions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExportAudit}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px] text-blue-600">download</span>
              <span>Export Forensic CSV</span>
            </button>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SHA-256 Ledger Locked</span>
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { key: 'ALL', label: 'All Events' },
              { key: 'SALARY', label: 'Compensations' },
              { key: 'DISBURSAL', label: 'Disbursements' },
              { key: 'IMPORT', label: 'Excel Ingests' },
              { key: 'SYSTEM', label: 'System Engine' },
            ].map((tab) => {
              const count = getCategoryCount(tab.key as any);
              const isActive = selectedFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedFilter(tab.key as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by action, actor, or ID..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Audit Events List */}
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const badge = getCategoryBadge(log.category);
            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 group"
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Category Avatar */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${badge.bg}`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{badge.icon}</span>
                  </div>

                  {/* Event Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {log.title}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">• {log.timeDisplay}</span>
                      {log.badgeText && (
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}>
                          {log.badgeText}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{log.summary}</p>

                    {/* Diff tags if available */}
                    {(log.previousValue || log.newValue) && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[11px] text-slate-400 font-medium">Transition:</span>
                        {log.previousValue && (
                          <span className="text-[11px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 line-through">
                            {log.previousValue}
                          </span>
                        )}
                        <span className="text-slate-400 text-xs">→</span>
                        {log.newValue && (
                          <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                            {log.newValue}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Officer Signature Badge */}
                    <div className="pt-1.5 flex items-center gap-2 text-xs text-slate-400">
                      <span className="material-symbols-outlined text-[15px] text-emerald-600">verified_user</span>
                      <span>
                        Officer: <strong className="text-slate-700 font-semibold">{log.actorName}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 font-mono text-[11px]">{log.actorId}</span>
                      <span className="text-slate-400">({log.actorRole})</span>
                    </div>
                  </div>
                </div>

                {/* Timestamp & Code */}
                <div className="text-right shrink-0 hidden md:block self-start">
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-xs space-y-2">
              <span className="material-symbols-outlined text-4xl text-slate-300">manage_search</span>
              <p className="text-sm font-bold text-slate-700">No forensic log events matched</p>
              <p className="text-xs text-slate-400">Try changing the category filter or search query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
