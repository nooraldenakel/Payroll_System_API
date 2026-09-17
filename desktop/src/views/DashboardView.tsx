import React, { useState, useMemo } from 'react';
import { PayrollPeriod, Employee, ReportSummary, ImportHistoryItem } from '../types';
import { formatMoney } from '../services/api';

interface DashboardViewProps {
  periods: PayrollPeriod[];
  activePeriod: PayrollPeriod | null;
  employees: Employee[];
  reportSummary: ReportSummary | null;
  importHistory?: ImportHistoryItem[];
  currency?: 'IQD' | 'USD';
  rate?: number;
  onSelectPeriod: (period: PayrollPeriod) => void;
  onNavigateTab: (tab: any, departmentFilter?: string) => void;
  onExport: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  periods,
  activePeriod,
  employees,
  reportSummary,
  currency = 'IQD',
  rate = 1310,
  onNavigateTab,
  onExport,
}) => {
  const currentPeriod = activePeriod || periods.find((p) => p.status === 'OPEN') || periods[0] || null;

  // Dynamic calculations strictly from live cycle data
  const totalStaff = employees.length;
  const paidCount = employees.filter((e) => e.paymentStatus === 'PAID').length;
  const unpaidCount = employees.filter((e) => e.paymentStatus === 'UNPAID').length;
  const stoppedCount = employees.filter((e) => e.paymentStatus === 'STOPPED').length;
  const foreignCount = employees.filter((e) => e.isForeign || e.currency === 'USD').length;
  const localCount = totalStaff - foreignCount;

  const totalSalarySum = useMemo(() => {
    return employees.reduce((acc, e) => acc + (e.baseSalary || 0), 0);
  }, [employees]);

  const totalBonusSum = useMemo(() => {
    return employees.reduce((acc, e) => acc + (e.bonus || 0), 0);
  }, [employees]);

  const totalAllowancesSum = useMemo(() => {
    return employees.reduce((acc, e) => acc + (e.allowances || 0), 0);
  }, [employees]);

  const totalOvertimeSum = useMemo(() => {
    return employees.reduce((acc, e) => acc + (e.arrivalFee || 0) + (e.searchFee || 0), 0);
  }, [employees]);

  const totalDeductionsSum = useMemo(() => {
    return employees.reduce(
      (acc, e) =>
        acc +
        (e.deductions || 0) +
        (e.arrivalFee || 0) +
        (e.insurance || 0) +
        (e.absence || 0) +
        (e.searchFee || 0),
      0
    );
  }, [employees]);

  const totalNetSum = useMemo(() => {
    if (employees.length === 0) return 0;
    if (currentPeriod && currentPeriod.totalNet > 0) return currentPeriod.totalNet;
    return employees.reduce((acc, e) => acc + (e.netSalary || 0), 0);
  }, [employees, currentPeriod]);

  const grossBudgetSum = useMemo(() => {
    if (employees.length === 0) return 0;
    if (currentPeriod && currentPeriod.totalGross > 0) return currentPeriod.totalGross;
    return totalSalarySum + totalAllowancesSum + totalBonusSum;
  }, [employees, currentPeriod, totalSalarySum, totalAllowancesSum, totalBonusSum]);

  const totalDisbursedNet = useMemo(() => {
    return employees
      .filter((e) => e.paymentStatus === 'PAID')
      .reduce((acc, e) => acc + (e.netSalary || 0), 0);
  }, [employees]);

  const totalPendingNet = useMemo(() => {
    return employees
      .filter((e) => e.paymentStatus !== 'PAID')
      .reduce((acc, e) => acc + (e.netSalary || 0), 0);
  }, [employees]);

  // Dynamic Department breakdown calculated strictly from live employee records with Paid, Unpaid, and Stopped counts
  const departmentStats = useMemo(() => {
    if (employees.length === 0) return [];

    const map: Record<
      string,
      {
        count: number;
        paid: number;
        unpaid: number;
        stopped: number;
        totalNet: number;
      }
    > = {};

    employees.forEach((e) => {
      const dept = e.department?.trim() || 'General';
      if (!map[dept]) {
        map[dept] = { count: 0, paid: 0, unpaid: 0, stopped: 0, totalNet: 0 };
      }
      map[dept].count += 1;
      if (e.paymentStatus === 'PAID') {
        map[dept].paid += 1;
      } else if (e.paymentStatus === 'STOPPED') {
        map[dept].stopped += 1;
      } else {
        map[dept].unpaid += 1;
      }
      map[dept].totalNet += e.netSalary || 0;
    });

    const palette = [
      '#064e3b',
      '#10b981',
      '#059669',
      '#3b82f6',
      '#6366f1',
      '#8b5cf6',
      '#ec4899',
      '#f59e0b',
      '#0284c7',
      '#0d9488',
      '#64748b',
    ];

    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, stats], idx) => ({
        name,
        count: stats.count,
        paidCount: stats.paid,
        unpaidCount: stats.unpaid,
        stoppedCount: stats.stopped,
        paidPercent: stats.count > 0 ? Math.round((stats.paid / stats.count) * 100) : 0,
        percent: Math.round((stats.count / employees.length) * 100),
        color: palette[idx % palette.length],
        totalNet: stats.totalNet,
      }));
  }, [employees]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#f8fafc] text-slate-800 select-none">
      <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20">

        {/* ======================================================== */}
        {/* TOP GREETING & CYCLE HEADER                              */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Payroll Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              Institutional HR finance oversight, faculty compensation, and bank disburals.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {currentPeriod && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{currentPeriod.name} ({currentPeriod.code})</span>
              </span>
            )}

            <button
              type="button"
              onClick={onExport}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px] text-blue-600">download</span>
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* IMAGE 2: OVERVIEW ROYAL BLUE GRADIENT BANNER (Item 1)    */}
        {/* ======================================================== */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 text-white p-6 sm:p-8 shadow-xl shadow-blue-600/15">
          {/* Subtle ambient light patterns */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-indigo-900/30 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Title & Link to Full Report */}
          <div className="relative z-10 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white/95 flex items-center gap-2">
              <span>Financial Overview</span>
              {currentPeriod && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {currentPeriod.name}
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              title="Open full financial breakdown reports"
              className="text-white/90 hover:text-white px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
            >
              <span>View Report</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {/* Large Main Metric: Total Net Payout (Clickable to Reports) */}
          <div
            onClick={() => onNavigateTab('reports')}
            className="relative z-10 mt-3 mb-6 cursor-pointer group inline-block"
            title="Click to view full financial ledger"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-100/80 group-hover:text-white transition-colors">
              Total Net Payroll (Payout) ↗
            </p>
            <div className="flex flex-wrap items-baseline gap-3 mt-1">
              <span className="text-3xl sm:text-5xl font-black tracking-tight text-white group-hover:underline decoration-white/40">
                {formatMoney(totalNetSum, currency, rate)}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold backdrop-blur-sm">
                <span>{paidCount} Paid</span>
                <span className="text-blue-100/90 font-normal">• {totalStaff - paidCount} Pending</span>
              </span>
            </div>
          </div>

          {/* Bottom Secondary Metrics Row (Clickable & Real Values) */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-5 border-t border-white/15">
            {/* Total Customer / Active Staff */}
            <div
              onClick={() => onNavigateTab('employees')}
              className="cursor-pointer hover:bg-white/10 p-2.5 -m-2.5 rounded-2xl transition-all group"
              title="Click to view Staff Roster"
            >
              <div className="flex items-center justify-between text-blue-100/80 text-xs font-semibold group-hover:text-white">
                <span>Total Active Staff</span>
                <span className="material-symbols-outlined text-[16px] opacity-70 group-hover:opacity-100">open_in_new</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">
                {totalStaff.toLocaleString()} Staff
              </p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-white/15 text-blue-100 text-[10.5px] font-bold">
                <span>{unpaidCount} Pending Disbursement</span>
              </span>
            </div>

            {/* Total Disbursed Transactions */}
            <div
              onClick={() => onNavigateTab('reports')}
              className="sm:border-l sm:border-white/15 sm:pl-6 cursor-pointer hover:bg-white/10 p-2.5 -m-2.5 rounded-2xl transition-all group"
              title="Click to view disbursement state"
            >
              <div className="flex items-center justify-between text-blue-100/80 text-xs font-semibold group-hover:text-white">
                <span>Total Disbursed Transactions</span>
                <span className="material-symbols-outlined text-[16px] opacity-70 group-hover:opacity-100">open_in_new</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">
                {paidCount.toLocaleString()} / {totalStaff.toLocaleString()}
              </p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-emerald-500/25 text-emerald-200 text-[10.5px] font-bold">
                <span>{totalStaff > 0 ? Math.round((paidCount / totalStaff) * 100) : 0}% Complete</span>
              </span>
            </div>

            {/* Total Revenue / Gross Budget */}
            <div
              onClick={() => onNavigateTab('reports')}
              className="sm:border-l sm:border-white/15 sm:pl-6 cursor-pointer hover:bg-white/10 p-2.5 -m-2.5 rounded-2xl transition-all group"
              title="Click to view institutional budget"
            >
              <div className="flex items-center justify-between text-blue-100/80 text-xs font-semibold group-hover:text-white">
                <span>Gross Institutional Budget</span>
                <span className="material-symbols-outlined text-[16px] opacity-70 group-hover:opacity-100">open_in_new</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">
                {formatMoney(grossBudgetSum, currency, rate)}
              </p>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-white/15 text-blue-100 text-[10.5px] font-bold">
                <span>Base + Bonuses + Allowances</span>
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* IMAGE 4: TOP 4 FOLKD STATISTIC CARDS (Clickable Item 1)  */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Total Salary */}
          <div
            onClick={() => onNavigateTab('reports')}
            className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex items-center justify-between hover:shadow-md hover:border-emerald-300 hover:scale-[1.01] transition-all cursor-pointer group"
            title="Click to view salary details in Financial Reports"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">
                Total Base Salary ↗
              </p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {formatMoney(totalSalarySum, currency, rate)}
              </h3>
              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10.5px] font-bold border border-emerald-200/60">
                {totalStaff} active staff members
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
          </div>

          {/* Card 2: Total Allowances */}
          <div
            onClick={() => onNavigateTab('reports')}
            className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex items-center justify-between hover:shadow-md hover:border-emerald-300 hover:scale-[1.01] transition-all cursor-pointer group"
            title="Click to view allowances in Financial Reports"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">
                Total Allowances ↗
              </p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {formatMoney(totalAllowancesSum, currency, rate)}
              </h3>
              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10.5px] font-bold border border-emerald-200/60">
                Cycle allowances
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
            </div>
          </div>

          {/* Card 3: Total Overtime / Arrival */}
          <div
            onClick={() => onNavigateTab('reports')}
            className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex items-center justify-between hover:shadow-md hover:border-emerald-300 hover:scale-[1.01] transition-all cursor-pointer group"
            title="Click to view overtime and fees"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">
                Total Overtime & Fees ↗
              </p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {formatMoney(totalOvertimeSum, currency, rate)}
              </h3>
              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10.5px] font-bold border border-emerald-200/60">
                Arrival & search fees
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">schedule</span>
            </div>
          </div>

          {/* Card 4: Total Incentives / Bonus */}
          <div
            onClick={() => onNavigateTab('reports')}
            className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex items-center justify-between hover:shadow-md hover:border-emerald-300 hover:scale-[1.01] transition-all cursor-pointer group"
            title="Click to view incentives and bonuses"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">
                Total Incentives & Bonus ↗
              </p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {formatMoney(totalBonusSum, currency, rate)}
              </h3>
              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10.5px] font-bold border border-emerald-200/60">
                Staff incentives
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">local_atm</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CHARTS ROW: 100% LIVE CYCLE DISBURSEMENT & BREAKDOWN     */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Card (7 Cols): 100% Live Cycle Disbursement & Cash Flow Progress */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col justify-between relative">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Cycle Disbursement & Cash Flow
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10.5px] font-extrabold uppercase tracking-wide">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Real-time funding execution, staff payout status, and institutional liability.
                  </p>
                </div>

                {currentPeriod && (
                  <span className="px-3 py-1 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{currentPeriod.name}</span>
                  </span>
                )}
              </div>

              {/* Main Dual Metric Cards: Disbursed vs Pending */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Disbursed Amount */}
                <div
                  onClick={() => onNavigateTab('reports')}
                  className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer group shadow-2xs"
                  title="Click to view disbursed records in Reports"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>Disbursed Payout</span>
                    <span className="material-symbols-outlined text-[16px] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      arrow_forward
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1.5 tracking-tight">
                    {formatMoney(totalDisbursedNet, currency, rate)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-200/60 text-emerald-900 text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>{paidCount} Staff Paid</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 font-mono">
                      {totalStaff > 0 ? Math.round((paidCount / totalStaff) * 100) : 0}% Complete
                    </span>
                  </div>
                </div>

                {/* Pending Amount */}
                <div
                  onClick={() => onNavigateTab('employees')}
                  className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer group shadow-2xs"
                  title="Click to view pending employees in Roster"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                    <span>Pending Disbursal</span>
                    <span className="material-symbols-outlined text-[16px] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      arrow_forward
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-950 mt-1.5 tracking-tight">
                    {formatMoney(totalPendingNet, currency, rate)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-900 text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{unpaidCount + stoppedCount} Staff Pending</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 font-mono">
                      {totalStaff > 0 ? Math.round(((unpaidCount + stoppedCount) / totalStaff) * 100) : 0}% Remaining
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Disbursement Progress Meter */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">account_balance</span>
                    <span>Disbursement Velocity</span>
                  </span>
                  <span className="text-slate-900 font-mono">
                    {totalStaff > 0 ? Math.round((paidCount / totalStaff) * 100) : 0}% Payout Achieved
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 flex border border-slate-200/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{
                      width: `${totalStaff > 0 ? Math.max(2, (paidCount / totalStaff) * 100) : 0}%`,
                    }}
                    title={`${paidCount} Paid (${totalStaff > 0 ? Math.round((paidCount / totalStaff) * 100) : 0}%)`}
                  />
                  {unpaidCount > 0 && (
                    <div
                      className="h-full bg-amber-400 rounded-r-full transition-all duration-500"
                      style={{
                        width: `${totalStaff > 0 ? (unpaidCount / totalStaff) * 100 : 0}%`,
                      }}
                      title={`${unpaidCount} Unpaid`}
                    />
                  )}
                </div>
              </div>

              {/* 3 Micro Live Statistics */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-4 border-t border-slate-100 text-center">
                <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Avg Staff Pay</p>
                  <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                    {formatMoney(totalStaff > 0 ? Math.round(totalNetSum / totalStaff) : 0, currency, rate)}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Stopped Staff</p>
                  <p className={`text-xs sm:text-sm font-black mt-0.5 ${stoppedCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {stoppedCount} On Hold
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Foreign / Local</p>
                  <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                    {foreignCount} ($) / {localCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Footer Quick Link */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">
                Live cycle synchronization active
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Audit Breakdown</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Right Chart (5 Cols): Payroll Breakdown Barcode Distribution Meter */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between relative">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Payroll Breakdown
                </h3>
                <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-bold inline-flex items-center gap-1">
                  <span>Current Cycle</span>
                </span>
              </div>

              {/* Large Payout Headline */}
              <div className="mt-3">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {formatMoney(totalNetSum, currency, rate)}
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Total Net Pay This Cycle</p>
              </div>

              {/* Folkd Dynamic Barcode Striped Visualizer */}
              <div className="mt-6 mb-6">
                <div className="flex items-center gap-[3px] h-12 w-full overflow-hidden">
                  {(() => {
                    const budget = grossBudgetSum || 1;
                    const sTicks = Math.max(1, Math.round((totalSalarySum / budget) * 55));
                    const aTicks = Math.round((totalAllowancesSum / budget) * 55);
                    const dTicks = Math.round((totalDeductionsSum / budget) * 55);
                    const bTicks = Math.round((totalBonusSum / budget) * 55);

                    return Array.from({ length: 55 }).map((_, i) => {
                      let tickColor = 'bg-emerald-500'; // Salary
                      if (i >= sTicks && i < sTicks + aTicks) tickColor = 'bg-emerald-950'; // Allowances
                      else if (i >= sTicks + aTicks && i < sTicks + aTicks + dTicks) tickColor = 'bg-slate-400'; // Deductions
                      else if (i >= sTicks + aTicks + dTicks && i < sTicks + aTicks + dTicks + bTicks) tickColor = 'bg-amber-400'; // Incentives
                      else if (i >= sTicks + aTicks + dTicks + bTicks) tickColor = 'bg-slate-300'; // Overtime

                      return (
                        <div
                          key={i}
                          className={`flex-1 h-full rounded-full transition-all duration-300 ${tickColor} hover:scale-y-110`}
                        />
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Breakdown Legend Grid */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 pt-4 border-t border-slate-100 text-xs">
              {/* Salary */}
              <div
                onClick={() => onNavigateTab('reports')}
                className="cursor-pointer hover:bg-slate-50 p-1.5 -m-1.5 rounded-xl transition-colors group"
                title="Click to view base salaries"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
                  <span>Salary — {grossBudgetSum > 0 ? Math.round((totalSalarySum / grossBudgetSum) * 100) : 0}%</span>
                </div>
                <p className="text-slate-500 font-mono text-[11.5px] mt-0.5 pl-4">
                  {formatMoney(totalSalarySum, currency, rate)}
                </p>
              </div>

              {/* Allowances */}
              <div
                onClick={() => onNavigateTab('reports')}
                className="cursor-pointer hover:bg-slate-50 p-1.5 -m-1.5 rounded-xl transition-colors group"
                title="Click to view allowances"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-950 shrink-0" />
                  <span>Allowances — {grossBudgetSum > 0 ? Math.round((totalAllowancesSum / grossBudgetSum) * 100) : 0}%</span>
                </div>
                <p className="text-slate-500 font-mono text-[11.5px] mt-0.5 pl-4">
                  {formatMoney(totalAllowancesSum, currency, rate)}
                </p>
              </div>

              {/* Deductions */}
              <div
                onClick={() => onNavigateTab('reports')}
                className="cursor-pointer hover:bg-slate-50 p-1.5 -m-1.5 rounded-xl transition-colors group"
                title="Click to view deductions and withholdings"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 shrink-0" />
                  <span>Deductions — {grossBudgetSum > 0 ? Math.round((totalDeductionsSum / grossBudgetSum) * 100) : 0}%</span>
                </div>
                <p className="text-slate-500 font-mono text-[11.5px] mt-0.5 pl-4">
                  {formatMoney(totalDeductionsSum, currency, rate)}
                </p>
              </div>

              {/* Incentives */}
              <div
                onClick={() => onNavigateTab('reports')}
                className="cursor-pointer hover:bg-slate-50 p-1.5 -m-1.5 rounded-xl transition-colors group"
                title="Click to view bonuses and incentives"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />
                  <span>Incentives — {grossBudgetSum > 0 ? Math.round((totalBonusSum / grossBudgetSum) * 100) : 0}%</span>
                </div>
                <p className="text-slate-500 font-mono text-[11.5px] mt-0.5 pl-4">
                  {formatMoney(totalBonusSum, currency, rate)}
                </p>
              </div>

              {/* Overtime */}
              <div
                onClick={() => onNavigateTab('reports')}
                className="cursor-pointer hover:bg-slate-50 p-1.5 -m-1.5 rounded-xl transition-colors group"
                title="Click to view overtime and fees"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 shrink-0" />
                  <span>Overtime & Fees</span>
                </div>
                <p className="text-slate-500 font-mono text-[11.5px] mt-0.5 pl-4">
                  {formatMoney(totalOvertimeSum, currency, rate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DEPARTMENTS BREAKDOWN CARD (100% Live with Paid/Unpaid/Stopped) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Departments Breakdown
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold font-mono">
                  {departmentStats.length} Departments
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Click any department to filter the roster. Showing live headcount, paid fulfillment, and stopped records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-emerald-700 font-bold">{paidCount} Paid</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-700 font-bold">{unpaidCount} Unpaid</span>
                {stoppedCount > 0 && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-rose-600 font-bold">{stoppedCount} Stopped</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('employees')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
              >
                <span>View All Staff</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Left Column (4 Cols): SVG Segmented Donut Chart */}
            <div className="md:col-span-4 flex items-center justify-center">
              <div className="relative w-52 h-52">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {departmentStats.length === 0 ? (
                    <circle
                      cx="50"
                      cy="50"
                      r="36"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="14"
                    />
                  ) : (
                    (() => {
                      let accumulatedPercent = 0;
                      const circumference = 226.19; // 2 * pi * 36
                      return departmentStats.map((dept) => {
                        const strokeLength = Math.max(2, (dept.percent / 100) * circumference);
                        const strokeOffset = -(accumulatedPercent / 100) * circumference;
                        accumulatedPercent += dept.percent;
                        return (
                          <circle
                            key={dept.name}
                            cx="50"
                            cy="50"
                            r="36"
                            fill="transparent"
                            stroke={dept.color}
                            strokeWidth="14"
                            strokeDasharray={`${strokeLength} ${circumference}`}
                            strokeDashoffset={strokeOffset}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => onNavigateTab('employees', dept.name)}
                          >
                            <title>{`${dept.name}: ${dept.count} staff (${dept.percent}%) • ${dept.paidCount} Paid • ${dept.unpaidCount} Unpaid • ${dept.stoppedCount} Stopped`}</title>
                          </circle>
                        );
                      });
                    })()
                  )}
                </svg>
                {/* Center Circle Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
                    {totalStaff}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                    Total Staff
                  </span>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10.5px] font-extrabold">
                      {paidCount} Paid
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (8 Cols): 2-Column Department Grid with Paid/Unpaid/Stopped */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {departmentStats.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-slate-400 text-xs font-medium">
                  No employee department records available in this cycle.
                </div>
              ) : (
                departmentStats.map((dept) => (
                  <div
                    key={dept.name}
                    onClick={() => onNavigateTab('employees', dept.name)}
                    className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    title={`Click to filter roster for ${dept.name} (${dept.paidCount} paid, ${dept.unpaidCount} unpaid, ${dept.stoppedCount} stopped)`}
                  >
                    {/* Top Row: Color Dot + Name + Count/Percentage */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 group-hover:scale-125 transition-transform shadow-2xs"
                          style={{ backgroundColor: dept.color }}
                        />
                        <p className="text-xs sm:text-[13.5px] font-black text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                          {dept.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                          {dept.count}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 font-mono">
                          ({dept.percent}%)
                        </span>
                        <span className="material-symbols-outlined text-[15px] text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                          arrow_forward
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: 3 High-contrast status badges (Paid, Unpaid, Stopped) */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      {/* Paid Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200/90 text-emerald-700 text-[11px] font-bold shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{dept.paidCount} Paid</span>
                      </span>

                      {/* Unpaid Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200/90 text-amber-700 text-[11px] font-bold shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{dept.unpaidCount} Unpaid</span>
                      </span>

                      {/* Stopped Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-2xs border ${
                          dept.stoppedCount > 0
                            ? 'bg-rose-50 border-rose-200/90 text-rose-700 font-extrabold'
                            : 'bg-slate-100/70 border-slate-200/70 text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dept.stoppedCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'
                          }`}
                        />
                        <span>{dept.stoppedCount} Stopped</span>
                      </span>
                    </div>

                    {/* Bottom Row: Micro Segmented Ratio Progress Bar */}
                    <div className="w-full mt-3">
                      <div className="w-full h-1.5 rounded-full bg-slate-200/70 overflow-hidden flex">
                        {dept.paidCount > 0 && (
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${(dept.paidCount / dept.count) * 100}%` }}
                            title={`${dept.paidCount} Paid (${Math.round((dept.paidCount / dept.count) * 100)}%)`}
                          />
                        )}
                        {dept.unpaidCount > 0 && (
                          <div
                            className="h-full bg-amber-400 transition-all"
                            style={{ width: `${(dept.unpaidCount / dept.count) * 100}%` }}
                            title={`${dept.unpaidCount} Unpaid (${Math.round((dept.unpaidCount / dept.count) * 100)}%)`}
                          />
                        )}
                        {dept.stoppedCount > 0 && (
                          <div
                            className="h-full bg-rose-500 transition-all"
                            style={{ width: `${(dept.stoppedCount / dept.count) * 100}%` }}
                            title={`${dept.stoppedCount} Stopped (${Math.round((dept.stoppedCount / dept.count) * 100)}%)`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Navigate to Ledger & Reports */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">table_chart</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Full Staff Ledger Available</p>
              <p className="text-xs text-slate-500">
                View individual compensations, arrival cuts, absence breakdowns, and disbursal states.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('employees')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              Open Staff Ledger
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              View Financial Breakdown
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
