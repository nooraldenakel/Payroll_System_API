'use client';

import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { usePayroll, PayrollPeriod, Employee } from '../lib/PayrollContext';
import { useRouter } from 'next/navigation';

export default function PayrollPeriodsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    periods,
    activePeriod,
    setActivePeriodId,
    updatePeriodStatus,
    archivePeriod,
    reopenPeriod,
    setIsNewRunModalOpen,
    employees,
    settings,
    showToast,
    periodEmployeesMap,
  } = usePayroll();
  const router = useRouter();

  const usdRate = settings.usdToDinarRate || 1310;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Confirmation modal state before switching active cycle
  const [pendingSwitchPeriod, setPendingSwitchPeriod] = useState<PayrollPeriod | null>(null);

  // Modal state for archiving a completed cycle
  const [archiveConfirmPeriod, setArchiveConfirmPeriod] = useState<PayrollPeriod | null>(null);

  // Modal state for inspecting past month's employee payment roster
  const [inspectPeriod, setInspectPeriod] = useState<PayrollPeriod | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState('');

  const filteredPeriods = periods.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.ref.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? p.status.toLowerCase() === statusFilter.toLowerCase() : true;
    const matchesYear = yearFilter ? String(p.year) === yearFilter : true;
    return matchesSearch && matchesStatus && matchesYear;
  });

  // Summary KPIs
  const activeCount = periods.filter((p) => p.status === 'Active').length;
  const draftCount = periods.filter((p) => p.status === 'Draft').length;
  const archivedCount = periods.filter((p) => p.status === 'Archived').length;
  const totalEmployeesTracked = employees.length;

  // Handle switching confirmation
  const handleConfirmCycleSwitch = () => {
    if (!pendingSwitchPeriod) return;
    const target = pendingSwitchPeriod;
    setPendingSwitchPeriod(null);
    setActivePeriodId(target.id);
    router.push('/employees');
  };

  // Get roster for modal snapshot from period map
  const inspectedRoster = inspectPeriod
    ? (periodEmployeesMap[inspectPeriod.id] || employees)
    : [];

  const filteredInspectedRoster = inspectedRoster.filter((emp) => {
    const q = modalSearch.toLowerCase();
    const matchesSearch =
      emp.name.toLowerCase().includes(q) ||
      emp.id.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q);
    const matchesStatus = modalStatusFilter ? emp.salaryState === modalStatusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const inspectedPaidCount = inspectedRoster.filter((e) => e.salaryState === 'Paid').length;
  const inspectedUnpaidCount = inspectedRoster.filter((e) => e.salaryState === 'Not Yet').length;
  const inspectedStoppedCount = inspectedRoster.filter((e) => e.salaryState === 'Stopped').length;

  return (
    <div className="bg-[#f8fafc] text-on-background font-body-md min-h-screen flex antialiased">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f8fafc]">
        <TopNav title="Payroll Periods & Cycles" onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc]">
          <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 pb-20">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest font-mono">
                    Multi-Cycle Fiscal Engine
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-mono">Active: {activePeriod.name}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  Payroll Processing Cycles &amp; Historical Archive
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage, audit, and switch between past and present monthly payroll cycles. Current session progress is automatically preserved in the ledger upon switching.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
                <button
                  onClick={() => setIsNewRunModalOpen(true)}
                  className="flex items-center gap-2 bg-primary text-white rounded-xl py-2.5 px-4 text-xs font-bold shadow-2xs hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Create New Cycle
                </button>
              </div>
            </div>

            {/* Executive KPI Cards for Periods */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Active Period Focus */}
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-2xs border border-slate-200 hover:border-primary/40 transition-all flex flex-col justify-between group">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-teal-700 text-white flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">play_circle</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Current Active Month</p>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none mt-0.5 font-mono">
                        {activePeriod.name}
                      </h4>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 text-[11px]">{activePeriod.ref}</span>
                  {activePeriod.status === 'Active' ? (
                    <button
                      onClick={() => setArchiveConfirmPeriod(activePeriod)}
                      className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      title="Archive and seal this cycle"
                    >
                      <span className="material-symbols-outlined text-[13px] text-amber-600">lock</span>
                      Archive Cycle
                    </button>
                  ) : activePeriod.status === 'Archived' ? (
                    <button
                      onClick={() => reopenPeriod(activePeriod.id)}
                      className="text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      title="Reopen this archived cycle"
                    >
                      <span className="material-symbols-outlined text-[13px] text-emerald-600">lock_open</span>
                      Reopen Cycle
                    </button>
                  ) : (
                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                      Draft
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Total Historical Cycles */}
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-2xs border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between group">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">history</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Recorded Cycles</p>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none mt-0.5 font-mono">
                        {periods.length} Total Periods
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-mono text-slate-500">
                  <span className="text-emerald-700 font-bold">{activeCount} Open</span>
                  <span>•</span>
                  <span className="text-slate-600">{archivedCount} Archived</span>
                  <span>•</span>
                  <span className="text-amber-700">{draftCount} Draft</span>
                </div>
              </div>

              {/* 3. Total Workforce Tracked */}
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-2xs border border-slate-200 hover:border-teal-300 transition-all flex flex-col justify-between group">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">groups</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Workforce Base</p>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none mt-0.5 font-mono">
                        {totalEmployeesTracked} Staff Members
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-600">
                  <span>Peg: 1 USD = {usdRate.toLocaleString()} IQD</span>
                  <span className="text-primary font-bold">Dual Currency</span>
                </div>
              </div>

              {/* 4. Instant Historical Lookup Tooltip */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 md:p-5 shadow-md flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-amber-400 text-[20px]">security</span>
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono text-amber-300">Protected Past Months</h4>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Switching to past cycles prompts confirmation and tracks any historical adjustments under strict audit oversight.
                </p>
                <div className="pt-2 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">verified</span>
                  Zero data loss on switch.
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-xl shadow-2xs p-3 flex flex-col md:flex-row gap-3 items-center border border-slate-200">
              {/* Fluid Search Bar */}
              <div className="relative flex-1 w-full">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                  search
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-9 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-slate-800 placeholder:text-slate-400 transition-all"
                  placeholder="Search period by name (e.g. 'July 2026') or reference ID..."
                  type="text"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap w-full md:w-auto gap-2 items-center text-xs shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl py-2 px-3 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active In-Progress</option>
                  <option value="archived">Archived (Closed)</option>
                  <option value="draft">Draft / Scheduled</option>
                </select>

                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl py-2 px-3 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="">All Fiscal Years</option>
                  <option value="2026">FY 2026</option>
                  <option value="2025">FY 2025</option>
                  <option value="2024">FY 2024</option>
                </select>

                {(search || statusFilter || yearFilter) && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('');
                      setYearFilter('');
                    }}
                    className="text-xs text-primary font-bold hover:underline px-2 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Cycles Grid with Inspect Roster + Open Cycle Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPeriods.map((period) => {
                const isActive = period.status === 'Active';
                const isDraft = period.status === 'Draft';
                const isArchived = period.status === 'Archived';
                const isCurrentActive = period.id === activePeriod.id;
                const periodStaffList = isCurrentActive ? employees : (periodEmployeesMap[period.id] || []);
                const periodStaffCount = periodStaffList.length;
                const periodTotalDinar = periodStaffList.reduce((sum, e) => {
                  const equiv = e.isForeign ? e.netSalary * usdRate : e.netSalary;
                  return sum + equiv;
                }, 0);

                return (
                  <div
                    key={period.id}
                    className={`bg-white rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md border flex flex-col justify-between group ${
                      isCurrentActive
                        ? 'border-2 border-primary ring-4 ring-primary/10 shadow-md'
                        : 'border-slate-200 shadow-2xs'
                    }`}
                  >
                    {/* Top Status Accent Bar */}
                    <div
                      className={`absolute top-0 left-0 w-full h-1.5 ${
                        isActive ? 'bg-primary' : isDraft ? 'bg-amber-400' : 'bg-slate-400'
                      }`}
                    />

                    <div>
                      {/* Title, Month Letter Icon & Status Badge */}
                      <div className="flex justify-between items-start mb-4 pt-1 gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-xs ${
                            isCurrentActive
                              ? 'bg-gradient-to-br from-primary to-teal-700 text-white shadow-primary/20'
                              : isActive
                              ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                              : isDraft
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            <span className="text-base font-black leading-none font-mono">
                              {(period.month ? period.month.charAt(0) : period.name.charAt(0)).toUpperCase()}
                            </span>
                            <span className="text-[9px] font-bold tracking-tighter opacity-80 uppercase leading-tight font-mono">
                              {(period.month || period.name.slice(0, 3)).toUpperCase()}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-base font-black text-slate-900 tracking-tight">{period.name}</h3>
                              {isCurrentActive && (
                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${
                                  isArchived ? 'bg-amber-500 text-white' : 'bg-primary text-white'
                                }`}>
                                  CURRENT CYCLE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">Ref: {period.ref}</p>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border flex items-center gap-1.5 shrink-0 ${
                            isCurrentActive
                              ? isArchived
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : isDraft
                                ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                : 'bg-primary text-white border-primary shadow-xs'
                              : isArchived
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : isDraft
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isCurrentActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                          {isArchived && !isCurrentActive && <span className="material-symbols-outlined text-[13px]">lock</span>}
                          {isDraft && !isCurrentActive && <span className="material-symbols-outlined text-[13px]">schedule</span>}
                          
                          {isCurrentActive
                            ? isArchived
                              ? 'Active (Archived)'
                              : isDraft
                              ? 'Active (Draft)'
                              : 'Active (Open)'
                            : isArchived
                            ? 'Archived'
                            : isDraft
                            ? 'Draft'
                            : 'Open'}
                        </span>
                      </div>

                      {/* Period Financial Stats Box */}
                      <div className="grid grid-cols-2 gap-2.5 mb-4">
                        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                          <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">Staff Records</p>
                          <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                            {periodStaffCount === 0 ? '0 Staff' : `${periodStaffCount} Staff`}
                          </p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                          <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">Total Ledger</p>
                          <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                            {periodStaffCount === 0 ? '0 IQD' : `${(periodTotalDinar / 1000000).toFixed(2)}M IQD`}
                          </p>
                        </div>
                      </div>

                      {/* Metadata Line */}
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-slate-400">person</span>
                          <span className="truncate max-w-[120px]">{period.creator}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          <span>{period.createdOn}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Action Buttons */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Button 1: Inspect Past Month Roster */}
                        <button
                          onClick={() => setInspectPeriod(period)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title={`Inspect snapshot for ${period.name}`}
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary">manage_search</span>
                          <span>Inspect</span>
                        </button>

                        {/* Button 2: Archive / Reopen status toggle */}
                        {isArchived ? (
                          <button
                            onClick={() => reopenPeriod(period.id)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Reopen this archived cycle"
                          >
                            <span className="material-symbols-outlined text-[15px] text-emerald-600">lock_open</span>
                            <span>Reopen</span>
                          </button>
                        ) : isActive ? (
                          <button
                            onClick={() => setArchiveConfirmPeriod(period)}
                            className="bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Seal and archive this cycle"
                          >
                            <span className="material-symbols-outlined text-[15px] text-amber-600">archive</span>
                            <span>Archive</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => updatePeriodStatus(period.id, 'Active')}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-amber-200"
                            title="Publish and activate this draft cycle"
                          >
                            <span className="material-symbols-outlined text-[15px]">publish</span>
                            <span>Activate</span>
                          </button>
                        )}
                      </div>

                      {/* Main Switch Button: Prompts Confirmation Alert */}
                      <button
                        onClick={() => {
                          if (isCurrentActive) {
                            router.push('/employees');
                          } else {
                            setPendingSwitchPeriod(period);
                          }
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
                          isCurrentActive
                            ? 'bg-primary text-white hover:bg-primary/90'
                            : isArchived
                            ? 'bg-slate-800 text-white hover:bg-slate-900'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isCurrentActive ? 'badge' : isArchived ? 'history_toggle_off' : 'change_circle'}
                        </span>
                        <span>
                          {isCurrentActive
                            ? 'Open Active Roster'
                            : isArchived
                            ? `Switch to Archived ${period.name}`
                            : `Switch to ${period.name}`}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Results count */}
            <div className="flex justify-between items-center py-3 text-xs text-slate-500 border-t border-slate-200 font-mono">
              <span>Showing {filteredPeriods.length} of {periods.length} historical &amp; active cycles</span>
              <span>Central Bank Exchange Peg: 1 USD = {usdRate.toLocaleString()} IQD</span>
            </div>

          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIRMATION ALERT TO SWITCH ACTIVE CYCLE & SAVE CURRENT WORK */}
      {/* ========================================================================= */}
      {pendingSwitchPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                pendingSwitchPeriod.status === 'Archived' ? 'bg-amber-100 text-amber-800' : 'bg-primary/10 text-primary'
              }`}>
                <span className="material-symbols-outlined text-[24px]">
                  {pendingSwitchPeriod.status === 'Archived' ? 'history_edu' : 'change_circle'}
                </span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Switch Active Payroll Cycle?
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Preserve current ledger session &amp; switch active month
                </p>
              </div>
            </div>

            {/* Switch Details Box */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-xs font-mono space-y-2 mb-4">
              <div className="flex justify-between text-slate-600">
                <span>Current Active Cycle:</span>
                <strong className="text-slate-900">{activePeriod.name} ({employees.length} Records Saved)</strong>
              </div>
              <div className="flex justify-between text-primary font-bold">
                <span>Target Cycle to Activate:</span>
                <strong>{pendingSwitchPeriod.name} ({pendingSwitchPeriod.status})</strong>
              </div>
            </div>

            {/* Warning Alert if Target is Archived */}
            {pendingSwitchPeriod.status === 'Archived' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 mb-5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span>Warning: Activating Archived Historical Cycle</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/90">
                  You are opening <strong>{pendingSwitchPeriod.name}</strong>, which is a closed historical cycle. All modifications to employee compensation or payment states will be strictly flagged in the audit log as historical adjustments.
                </p>
              </div>
            ) : pendingSwitchPeriod.status === 'Draft' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 mb-5 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-800">
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  <span>Activating Draft Cycle</span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-900/90">
                  You are activating <strong>{pendingSwitchPeriod.name}</strong>. Payouts in draft cycles are marked as Unpaid in preparation for distribution.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">check_circle</span>
                <span>Your work in <strong>{activePeriod.name}</strong> is safely preserved in the ledger before switching.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingSwitchPeriod(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmCycleSwitch}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">task_alt</span>
                Confirm &amp; Switch Active Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ARCHIVE COMPLETED CYCLE CONFIRMATION */}
      {/* ========================================================================= */}
      {archiveConfirmPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">lock</span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Archive and Seal Cycle: {archiveConfirmPeriod.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Move completed payroll cycle to Historical Archive
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-xs font-mono space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Period Name:</span>
                <strong className="text-slate-900 font-bold">{archiveConfirmPeriod.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Staff Processed:</span>
                <strong className="text-emerald-700 font-bold">{archiveConfirmPeriod.employeesCount} Staff</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Payroll:</span>
                <strong className="text-slate-900 font-bold">${(archiveConfirmPeriod.totalPayroll / 1000000).toFixed(2)}M</strong>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 mb-5 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0 mt-0.5">info</span>
              <p className="text-[11px] leading-relaxed">
                Archiving seals this month&apos;s ledger for historical reporting. You can still inspect historical records or make retroactive audited corrections if required.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setArchiveConfirmPeriod(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  archivePeriod(archiveConfirmPeriod.id);
                  setArchiveConfirmPeriod(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-400">lock</span>
                Seal &amp; Archive Cycle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: INSPECT PAST MONTH'S EMPLOYEE PAYMENT ROSTER */}
      {/* ========================================================================= */}
      {inspectPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase font-mono rounded bg-primary/10 text-primary border border-primary/20">
                    Cycle Snapshot
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Ref: {inspectPeriod.ref}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                  Employee Disbursement Roster — {inspectPeriod.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect who was paid, unpaid, or stopped during this specific historical cycle.
                </p>
              </div>

              <button
                onClick={() => {
                  setInspectPeriod(null);
                  setModalSearch('');
                  setModalStatusFilter('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Cycle Snapshot Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Total Workforce</span>
                <span className="text-base font-black text-slate-900 font-mono">{inspectedRoster.length} Staff</span>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono block">Paid Staff</span>
                <span className="text-base font-black text-emerald-800 font-mono">{inspectedPaidCount} Paid</span>
              </div>

              <div className="bg-slate-100 border border-slate-200 p-3 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Unpaid Staff</span>
                <span className="text-base font-black text-slate-700 font-mono">{inspectedUnpaidCount} Unpaid</span>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl">
                <span className="text-[10px] font-bold text-rose-700 uppercase font-mono block">Stopped Staff</span>
                <span className="text-base font-black text-rose-800 font-mono">{inspectedStoppedCount} Stopped</span>
              </div>
            </div>

            {/* Modal Search and Filter */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
                  search
                </span>
                <input
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                  placeholder={`Search ${inspectPeriod.name} employee roster...`}
                  type="text"
                />
              </div>

              <select
                value={modalStatusFilter}
                onChange={(e) => setModalStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl py-1.5 px-3 text-xs outline-none cursor-pointer"
              >
                <option value="">All Payment States</option>
                <option value="Paid">🟢 Paid</option>
                <option value="Not Yet">⚪ Unpaid (Not Yet)</option>
                <option value="Stopped">🔴 Stopped</option>
              </select>
            </div>

            {/* Modal Table Container */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl mb-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center">ID</th>
                    <th className="py-2.5 px-3 text-left">Employee Name</th>
                    <th className="py-2.5 px-3 text-center">Workforce</th>
                    <th className="py-2.5 px-3 text-center">Base Salary</th>
                    <th className="py-2.5 px-3 text-center">Net Payout</th>
                    <th className="py-2.5 px-3 text-center">Payment Status in {inspectPeriod.name}</th>
                    <th className="py-2.5 px-3 text-center">Disbursed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredInspectedRoster.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 font-sans">
                        No employees match the filter for this cycle snapshot.
                      </td>
                    </tr>
                  ) : (
                    filteredInspectedRoster.map((emp) => {
                      const isPaid = emp.salaryState === 'Paid';
                      const isStopped = emp.salaryState === 'Stopped';
                      const isForeign = Boolean(emp.isForeign);
                      const currSymbol = isForeign ? '$' : 'IQD ';

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isPaid
                              ? 'border-l-4 border-l-emerald-500'
                              : isStopped
                              ? 'border-l-4 border-l-rose-500 bg-rose-50/20'
                              : 'border-l-4 border-l-slate-300'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-bold text-primary whitespace-nowrap">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {emp.id}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-left whitespace-nowrap">
                            <div className="font-sans">
                              <span className="font-bold text-slate-900 block">{emp.name}</span>
                              <span className="text-[10px] text-slate-400">{emp.department} • {emp.type}</span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isForeign ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {isForeign ? 'USD ($)' : 'Dinar'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 whitespace-nowrap">
                            {currSymbol}{emp.baseSalary.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-center font-bold text-primary whitespace-nowrap">
                            {currSymbol}{emp.netSalary.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isStopped
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPaid ? 'bg-emerald-500' : isStopped ? 'bg-rose-500' : 'bg-slate-400'
                                }`}
                              />
                              {emp.salaryState}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center text-[11px] text-slate-600 whitespace-nowrap">
                            {emp.paidAt ? (
                              <span className="text-emerald-800 font-semibold">{emp.paidAt}</span>
                            ) : (
                              <span className="text-slate-400 italic">Not Disbursed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <p className="text-xs text-slate-500 font-mono">
                Viewing snapshot for <strong className="text-slate-800">{inspectPeriod.name}</strong>.
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setInspectPeriod(null);
                    setModalSearch('');
                    setModalStatusFilter('');
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const selected = inspectPeriod;
                    setInspectPeriod(null);
                    setPendingSwitchPeriod(selected);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">change_circle</span>
                  <span>Switch &amp; Open Cycle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
