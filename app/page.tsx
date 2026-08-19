'use client';

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import { usePayroll } from './lib/PayrollContext';
import Link from 'next/link';

import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const {
    periods,
    activePeriod,
    setActivePeriodId,
    employees,
    imports,
    deleteImportRecord,
    clearImports,
    settings,
    showToast,
  } = usePayroll();

  const usdRate = settings.usdToDinarRate || 1310;
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // Dynamic calculations based on active employee roster
  const foreignStaff = employees.filter((e) => e.isForeign);
  const localStaff = employees.filter((e) => !e.isForeign);

  const totalUsdNet = foreignStaff.reduce((sum, e) => sum + e.netSalary, 0);
  const totalDinarNet = localStaff.reduce((sum, e) => sum + e.netSalary, 0);
  const grandTotalEquivalentDinar = (totalUsdNet * usdRate) + totalDinarNet;

  const totalAbsenceDeduct = employees.reduce((sum, e) => sum + (e.absenceDeduction || 0), 0);
  const totalArrivalFees = employees.reduce((sum, e) => sum + (e.recruitmentFee || 0), 0);
  const totalInsurance = employees.reduce((sum, e) => sum + (e.insurance || 0), 0);
  const totalDeductions = totalAbsenceDeduct + totalArrivalFees + totalInsurance;

  const paidStaff = employees.filter((e) => e.salaryState === 'Paid');
  const unpaidStaff = employees.filter((e) => e.salaryState === 'Not Yet');
  const stoppedStaff = employees.filter((e) => e.salaryState === 'Stopped');

  const paidPercentage = employees.length
    ? Math.round((paidStaff.length / employees.length) * 100)
    : 64;

  // Department payroll breakdown with accurate workforce % share
  const departments = ['Engineering', 'Design', 'Marketing', 'Human Resources', 'Finance', 'Operations'];
  const deptStats = departments.map((dept) => {
    const staffInDept = employees.filter((e) => e.department === dept);
    const count = staffInDept.length;
    const totalPayrollDept = staffInDept.reduce((sum, e) => {
      const equiv = e.isForeign ? e.netSalary * usdRate : e.netSalary;
      return sum + equiv;
    }, 0);
    // Workforce headcount percentage share
    const pct = employees.length > 0 ? Math.round((count / employees.length) * 100) : 0;
    return { dept, count, totalPayrollDept, pct };
  });

  const handleExportData = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'ID,Name,Department,Workforce,Currency,Base Salary,Bonus,Insurance,Absence Deduct,Total Net Payout,Clean USD,Remainder Dinar,State,Disbursed At\n' +
      employees
        .map((e) => {
          const cleanUsd = e.isForeign ? Math.floor(e.netSalary / 100) * 100 : 0;
          const remDinar = e.isForeign ? (e.netSalary % 100) * usdRate : 0;
          return `${e.id},"${e.name}",${e.department},${e.isForeign ? 'Foreign' : 'Local'},${e.isForeign ? 'USD' : 'Dinar'},${e.baseSalary},${e.bonus || 0},${e.insurance || 0},${e.absenceDeduction || 0},${e.netSalary},${cleanUsd},${remDinar},"${e.salaryState}","${e.paidAt || 'Pending'}"`;
        })
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payroll_${activePeriod.id}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Complete', `Downloaded ${activePeriod.name} executive ledger.`);
  };

  return (
    <div className="bg-[#f8fafc] text-on-background font-body-md min-h-screen flex antialiased">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f8fafc]">
        <TopNav title="Payroll Overview" onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-20">

            {/* ========================================================================= */}
            {/* 1. CLEAN TOP BANNER (NO CLUTTER, UNSTACKED) */}
            {/* ========================================================================= */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 md:p-6 shadow-2xs border border-slate-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono">
                    Active Cycle: {activePeriod.name}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-mono">
                    1 USD = {usdRate.toLocaleString()} IQD
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Welcome, Aziz Sulaiman
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Here is the real-time payroll summary for this month.
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Active Cycle Switcher Dropdown */}
                <div className="relative">
                  <select
                    value={activePeriod.id}
                    onChange={(e) => {
                      setActivePeriodId(e.target.value);
                      showToast(
                        'Cycle Switched',
                        `Active processing cycle set to ${periods.find((p) => p.id === e.target.value)?.name}.`,
                        'info'
                      );
                    }}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl py-2 pl-3 pr-8 shadow-2xs outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-slate-400 text-[18px] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    expand_more
                  </span>
                </div>

                <button
                  onClick={handleExportData}
                  className="flex items-center gap-1.5 bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-bold py-2 px-3.5 rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-slate-600">download</span>
                  Export CSV
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. FISCAL TIMELINE (CLEAN, SEPARATED CARDS) */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                    Select Month Cycle
                  </span>
                </div>
                <Link
                  href="/payroll-periods"
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1 font-mono"
                >
                  <span>View All Cycles ({periods.length})</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {periods.map((p) => {
                  const isCurrent = p.id === activePeriod.id;
                  const isArchived = p.status === 'Archived';
                  const firstLetter = (p.month ? p.month.charAt(0) : p.name.charAt(0)).toUpperCase();
                  const monthCode = (p.month || p.name.slice(0, 3)).toUpperCase();

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setActivePeriodId(p.id);
                        showToast('Cycle Selected', `Viewing ${p.name}.`, 'info');
                      }}
                      className={`flex-1 min-w-[160px] p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                        isCurrent
                          ? 'bg-primary/5 border-primary shadow-xs ring-2 ring-primary/10'
                          : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {/* Month Letter Badge */}
                      <div
                        className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-mono font-bold shrink-0 text-xs ${
                          isCurrent
                            ? 'bg-primary text-white shadow-xs'
                            : isArchived
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        <span className="leading-none text-[13px] font-black">{firstLetter}</span>
                        <span className="text-[8px] opacity-75 leading-none">{monthCode}</span>
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{p.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCurrent ? 'bg-emerald-500 animate-pulse' : isArchived ? 'bg-slate-400' : 'bg-amber-500'
                            }`}
                          />
                          <span className="text-[10px] font-mono text-slate-500">
                            {isCurrent ? 'Active Now' : p.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. 4 SEPARATE, UNSTACKED, CRYSTAL-CLEAR KPI CARDS */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Payroll Payout */}
              <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200 hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Net Payroll Payout
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 font-mono tracking-tight">
                    {grandTotalEquivalentDinar.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">IQD</span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 mt-3 font-mono text-xs">
                  <div className="bg-teal-50 border border-teal-200 px-2 py-1 rounded-lg text-teal-800 font-bold">
                    <span className="text-[9px] text-teal-600 uppercase block">USD Staff</span>
                    <span>${totalUsdNet.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-slate-700 font-bold">
                    <span className="text-[9px] text-slate-400 uppercase block">Local Dinar</span>
                    <span>{totalDinarNet.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Total Workforce */}
              <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200 hover:border-teal-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Active Workforce
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">groups</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 font-mono tracking-tight">
                    {employees.length} Staff Members
                  </h3>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs font-mono text-slate-600">
                  <span>🌍 {foreignStaff.length} Foreign (USD)</span>
                  <span>🏛️ {localStaff.length} Local (IQD)</span>
                </div>
              </div>

              {/* Card 3: Disbursal Status */}
              <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Disbursal Progress
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-primary/10 text-primary">
                      {paidPercentage}%
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 font-mono tracking-tight">
                    {paidStaff.length} of {employees.length} Paid
                  </h3>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center gap-1.5 flex-wrap font-mono">
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {paidStaff.length} Paid
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {unpaidStaff.length} Unpaid
                  </span>
                  {stoppedStaff.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {stoppedStaff.length} Stopped
                    </span>
                  )}
                </div>
              </div>

              {/* Card 4: Total Deductions */}
              <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200 hover:border-rose-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Deductions &amp; Fees
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">content_cut</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-rose-700 font-mono tracking-tight">
                    {totalDeductions.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">Total</span>
                  </h3>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs font-mono text-slate-500">
                  <span>Absence: {totalAbsenceDeduct.toLocaleString()}</span>
                  <span>Insurance: {totalInsurance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 4. DEPARTMENT ALLOCATION & RECENT BATCH IMPORTS */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Department Payroll Breakdown */}
              <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">domain</span>
                      <div>
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-mono">
                          Department Breakdown
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono">Double-click to open in Reports</p>
                      </div>
                    </div>
                    {selectedDept && (
                      <button
                        onClick={() => setSelectedDept(null)}
                        className="text-[11px] text-primary font-bold hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {deptStats.map((item) => {
                      const isSelected = selectedDept === item.dept;

                      return (
                        <div
                          key={item.dept}
                          onClick={() => setSelectedDept(isSelected ? null : item.dept)}
                          onDoubleClick={() => {
                            showToast('Filtered Reports', `Opening ${item.dept} department reports...`, 'info');
                            router.push(`/reports?dept=${encodeURIComponent(item.dept)}`);
                          }}
                          title={`Click to select • Double-click to open ${item.dept} in Reports`}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none group ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20'
                              : 'border-slate-100 hover:border-primary/50 hover:bg-primary/5'
                          }`}
                        >
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-800 group-hover:text-primary transition-colors flex items-center gap-1.5">
                              <span>{item.dept}</span>
                              {isSelected && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/reports?dept=${encodeURIComponent(item.dept)}`);
                                  }}
                                  className="text-[10px] font-bold text-primary bg-white px-2 py-0.5 rounded-md border border-primary/30 shadow-2xs hover:bg-primary hover:text-white transition-all flex items-center gap-0.5"
                                  title="Open in Reports"
                                >
                                  <span>Open Report</span>
                                  <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                </button>
                              )}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px] group-hover:text-primary font-bold">
                              {item.count} Staff ({item.pct}%)
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(6, item.pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-center mt-3">
                  <Link
                    href="/reports"
                    className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 font-mono"
                  >
                    <span>View All Department Reports</span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </Link>
                </div>
              </div>

              {/* Recent Batch Spreadsheet Ingestions */}
              <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 col-span-1 lg:col-span-2 flex flex-col justify-between overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">table_chart</span>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-mono">
                      Recent Excel Imports
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary font-mono">
                      {imports.length} Batches
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {imports.length > 0 && (
                      <button
                        onClick={clearImports}
                        className="text-[11px] text-slate-400 hover:text-rose-600 font-mono transition-colors cursor-pointer mr-1"
                        title="Clear batch import history"
                      >
                        Clear All
                      </button>
                    )}
                    <Link
                      href="/excel-import"
                      className="text-primary text-xs font-bold hover:underline flex items-center gap-1 font-mono"
                    >
                      <span>Import Excel</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  {imports.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-[22px]">upload_file</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700">No Excel workbooks imported yet</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Upload your institutional Excel or CSV payroll paper sheet to ingest records into the live ledger.
                      </p>
                      <Link
                        href="/excel-import"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-primary/90 mt-2"
                      >
                        <span className="material-symbols-outlined text-[15px]">upload</span>
                        Upload Excel File
                      </Link>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-4">File Name</th>
                          <th className="py-2.5 px-3">Batch Type</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Records</th>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {imports.slice(0, 6).map((imp) => (
                          <tr
                            key={imp.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[18px] shrink-0">description</span>
                                <span className="truncate max-w-[180px] sm:max-w-[240px]" title={imp.fileName}>
                                  {imp.fileName}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-slate-600 font-medium">{imp.type}</td>

                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                  imp.status === 'Success'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    imp.status === 'Success' ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                                {imp.status}
                              </span>
                            </td>

                            <td className="py-3 px-3 font-mono font-bold text-slate-800">
                              {imp.recordsCount.toLocaleString()}
                            </td>

                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {imp.date}
                            </td>

                            <td className="py-3 px-2 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteImportRecord(imp.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Remove this record"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50/40 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-mono">Total {imports.length} past batches</span>
                  <Link href="/audit-log" className="text-primary font-bold hover:underline font-mono">
                    View Audit Logs
                  </Link>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 5. QUICK NAVIGATION SHORTCUTS */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/employees"
                className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-primary/50 hover:shadow-xs transition-all group flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-primary transition-colors">Employee Roster</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{employees.length} Records</p>
                </div>
              </Link>

              <Link
                href="/reports"
                className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition-all group flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">analytics</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">Financial Reports</h4>
                  <p className="text-[10px] text-slate-400 font-mono">PDF &amp; CSV</p>
                </div>
              </Link>

              <Link
                href="/payroll-periods"
                className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all group flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-indigo-700 transition-colors">Payroll Periods</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{periods.length} Cycles</p>
                </div>
              </Link>

              <Link
                href="/excel-import"
                className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all group flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-amber-700 transition-colors">Map &amp; Import</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Spreadsheet Bridge</p>
                </div>
              </Link>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
