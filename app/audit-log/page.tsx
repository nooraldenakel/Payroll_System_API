'use client';

import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { usePayroll } from '../lib/PayrollContext';

export default function AuditLogPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { auditLogs, showToast } = usePayroll();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const filteredLogs = auditLogs.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(q) ||
      log.detail.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q) ||
      (log.employeeId && log.employeeId.toLowerCase().includes(q)) ||
      (log.employeeName && log.employeeName.toLowerCase().includes(q)) ||
      (log.changes && log.changes.some((c) => c.field.toLowerCase().includes(q) || c.from.toLowerCase().includes(q) || c.to.toLowerCase().includes(q)));

    const matchesCategory =
      categoryFilter === 'All'
        ? true
        : log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleExportAudit = () => {
    const headers = 'Time,Category,Action,Target Employee,User,Details,Specific Changes\n';
    const rows = filteredLogs
      .map((l) => {
        const changesStr = l.changes ? l.changes.map((c) => `${c.field}: ${c.from} -> ${c.to}`).join('; ') : 'N/A';
        const empStr = l.employeeName ? `${l.employeeName} (${l.employeeId || 'N/A'})` : 'System Wide';
        return `"${l.time}","${l.category || 'General'}","${l.action}","${empStr}","${l.user}","${l.detail.replace(/"/g, '""')}","${changesStr.replace(/"/g, '""')}"`;
      })
      .join('\n');
    const uri = 'data:text/csv;charset=utf-8,' + encodeURI(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', uri);
    link.setAttribute('download', `detailed_payroll_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Audit Exported', `Downloaded granular audit trail containing ${filteredLogs.length} events.`);
  };

  return (
    <div className="bg-[#f8fafc] text-on-background font-body-md min-h-screen flex antialiased">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f8fafc]">
        <TopNav title="System Audit Trail" onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full space-y-5 pb-24">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-primary uppercase tracking-widest font-mono">Immutable Compliance Log</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-mono">{auditLogs.length} Total Events</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                Audit Trail &amp; Activity Log
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Granular ledger tracking every specific modification, compensation adjustment, salary state change, and employee record update.
              </p>
            </div>

            <button
              onClick={handleExportAudit}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[17px]">download</span>
              Export Detailed Trail
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="bg-white rounded-2xl shadow-2xs p-3.5 border border-slate-200/90 flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee name, ID, modified field, amount, or action..."
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-9 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-slate-800 placeholder:text-slate-400 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto shrink-0 text-xs">
              {['All', 'Salary', 'Employee', 'Import', 'System'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    categoryFilter === cat
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'All' ? 'All Events' : cat === 'Salary' ? '💰 Salary Changes' : cat === 'Employee' ? '👥 Employee Records' : cat === 'Import' ? '📥 Imports' : '⚙️ System'}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Timeline List */}
          <div className="bg-white rounded-3xl shadow-2xs border border-slate-200/90 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Detailed Event Ledger</h3>
                <span className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  {filteredLogs.length} Events Found
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="material-symbols-outlined text-[36px] text-slate-300 mb-1">manage_search</span>
                  <p className="text-sm font-bold text-slate-700">No matching audit events found.</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try searching a different employee or resetting the filter.</p>
                </div>
              ) : (
                filteredLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-5 hover:bg-slate-50/60 transition-colors group flex items-start gap-4"
                  >
                    {/* Action Icon Badge */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${entry.badgeColor}`}>
                      <span className="material-symbols-outlined text-[20px]">{entry.icon}</span>
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      {/* Top Row: Title, Target Employee, Time */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">
                            {entry.action}
                          </h4>

                          {entry.employeeName && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-lg text-xs font-bold font-mono">
                              <span className="material-symbols-outlined text-[13px] text-primary">person</span>
                              {entry.employeeName} ({entry.employeeId})
                            </span>
                          )}

                          {entry.category && (
                            <span className="text-[10px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {entry.category}
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-mono text-slate-400 font-semibold shrink-0">
                          {entry.time}
                        </span>
                      </div>

                      {/* Detail Text */}
                      <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1">
                        {entry.detail}
                      </p>

                      {/* GRANULAR FIELD DIFFS BOX (Specific Before ➔ After Breakdown) */}
                      {entry.changes && entry.changes.length > 0 && (
                        <div className="mt-3 bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">
                            <span className="material-symbols-outlined text-[14px] text-primary">difference</span>
                            <span>Specific Fields Modified:</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {entry.changes.map((change, idx) => (
                              <div
                                key={idx}
                                className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <span className="font-bold text-slate-700 text-[11px] font-mono shrink-0">
                                  {change.field}:
                                </span>
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-right truncate">
                                  <span className="text-slate-400 line-through truncate max-w-[100px]" title={change.from}>
                                    {change.from}
                                  </span>
                                  <span className="text-slate-400 text-[10px]">➔</span>
                                  <span className="text-primary font-bold truncate max-w-[130px]" title={change.to}>
                                    {change.to}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer Attribution */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-2.5">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-emerald-600">shield</span>
                          Authorized User: <strong className="text-slate-700">{entry.user}</strong>
                        </span>
                        <span>•</span>
                        <span className="text-slate-400 font-mono">ID: {entry.id}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-center text-xs font-semibold text-slate-500 font-mono">
              Audit log verified &amp; synchronized with state engine
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
