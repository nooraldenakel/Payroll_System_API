'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { usePayroll, Employee } from '../lib/PayrollContext';

function ReportsContent() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { employees, activePeriod, periods, setActivePeriodId, settings, showToast } = usePayroll();

  const usdRate = settings.usdToDinarRate || 1310;
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [foreignFilter, setForeignFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedVoucher, setSelectedVoucher] = useState<Employee | null>(null);
  const itemsPerPage = 8;

  // Sync department filter from URL query parameter
  useEffect(() => {
    const qDept = searchParams?.get('dept') || searchParams?.get('department');
    if (qDept) {
      setDeptFilter(qDept);
    }
  }, [searchParams]);

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchesSearch =
      emp.name.toLowerCase().includes(q) ||
      emp.id.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      emp.salaryState.toLowerCase().includes(q) ||
      (emp.isForeign ? 'foreign usd dollar' : 'local dinar').includes(q);

    const matchesDept = deptFilter ? emp.department === deptFilter : true;
    const matchesState = stateFilter ? emp.salaryState === stateFilter : true;
    const matchesForeign =
      foreignFilter === 'foreign'
        ? Boolean(emp.isForeign)
        : foreignFilter === 'local'
        ? !emp.isForeign
        : true;

    return matchesSearch && matchesDept && matchesState && matchesForeign;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = filteredEmployees.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Status-based breakdown groups
  const paidEmployees = filteredEmployees.filter((e) => e.salaryState === 'Paid');
  const notYetEmployees = filteredEmployees.filter((e) => e.salaryState === 'Not Yet');
  const stoppedEmployees = filteredEmployees.filter((e) => e.salaryState === 'Stopped');

  const paidCount = paidEmployees.length;
  const notYetCount = notYetEmployees.length;
  const stoppedCount = stoppedEmployees.length;

  // Paid amounts
  const paidDinar = paidEmployees.filter((e) => !e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const paidUsd = paidEmployees.filter((e) => e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const paidEquivIqd = paidDinar + (paidUsd * usdRate);
  const paidEquivUsd = Math.round(((paidDinar / usdRate) + paidUsd) * 100) / 100;

  // Unpaid (Not Yet / Remaining Left) amounts
  const notYetDinar = notYetEmployees.filter((e) => !e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const notYetUsd = notYetEmployees.filter((e) => e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const notYetEquivIqd = notYetDinar + (notYetUsd * usdRate);
  const notYetEquivUsd = Math.round(((notYetDinar / usdRate) + notYetUsd) * 100) / 100;

  // Stopped (Withheld) amounts
  const stoppedDinar = stoppedEmployees.filter((e) => !e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const stoppedUsd = stoppedEmployees.filter((e) => e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const stoppedEquivIqd = stoppedDinar + (stoppedUsd * usdRate);
  const stoppedEquivUsd = Math.round(((stoppedDinar / usdRate) + stoppedUsd) * 100) / 100;

  // Total Outstanding Left (Unpaid + Stopped)
  const leftDinar = notYetDinar + stoppedDinar;
  const leftUsd = notYetUsd + stoppedUsd;
  const leftEquivIqd = leftDinar + (leftUsd * usdRate);
  const leftEquivUsd = Math.round(((leftDinar / usdRate) + leftUsd) * 100) / 100;

  // Deduction Categories
  const totalSearchFeeIqd = filteredEmployees.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.searchingDocFee || 0), 0);
  const totalSearchFeeUsd = filteredEmployees.filter(e => e.isForeign).reduce((sum, e) => sum + (e.searchingDocFee || 0), 0);
  const totalArrivalFeeIqd = filteredEmployees.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.recruitmentFee || 0), 0);
  const totalArrivalFeeUsd = filteredEmployees.filter(e => e.isForeign).reduce((sum, e) => sum + (e.recruitmentFee || 0), 0);
  const totalInsuranceIqd = filteredEmployees.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.insurance || 0), 0);
  const totalInsuranceUsd = filteredEmployees.filter(e => e.isForeign).reduce((sum, e) => sum + (e.insurance || 0), 0);
  const totalAbsenceIqd = filteredEmployees.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.absenceDeduction || 0), 0);
  const totalAbsenceUsd = filteredEmployees.filter(e => e.isForeign).reduce((sum, e) => sum + (e.absenceDeduction || 0), 0);
  const totalBonusIqd = filteredEmployees.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.bonus || 0), 0);
  const totalBonusUsd = filteredEmployees.filter(e => e.isForeign).reduce((sum, e) => sum + (e.bonus || 0), 0);

  const totalDeductionsIqd = totalSearchFeeIqd + totalArrivalFeeIqd + totalInsuranceIqd + totalAbsenceIqd;
  const totalDeductionsUsd = totalSearchFeeUsd + totalArrivalFeeUsd + totalInsuranceUsd + totalAbsenceUsd;
  const totalDeductionsEquivIqd = totalDeductionsIqd + (totalDeductionsUsd * usdRate);
  const totalDeductionsEquivUsd = Math.round(((totalDeductionsIqd / usdRate) + totalDeductionsUsd) * 100) / 100;

  // When: Latest paid employee timestamp
  const latestPaidEmployee = [...paidEmployees].filter(e => Boolean(e.paidAt)).pop();
  const lastPaidTimestamp = latestPaidEmployee?.paidAt || (paidCount > 0 ? 'Recently' : 'No payments yet');

  // Overall Grand Net
  const totalUsdNet = paidUsd + notYetUsd + stoppedUsd;
  const totalDinarNet = paidDinar + notYetDinar + stoppedDinar;
  const grandTotalEquivalentDinar = (totalUsdNet * usdRate) + totalDinarNet;
  const grandTotalEquivalentUsd = Math.round(((totalDinarNet / usdRate) + totalUsdNet) * 100) / 100;

  // Helper for matrix table rows
  const getMatrixRowStats = (group: Employee[]) => {
    const count = group.length;
    const baseIqd = group.filter(e => !e.isForeign).reduce((sum, e) => sum + e.baseSalary, 0);
    const baseUsd = group.filter(e => e.isForeign).reduce((sum, e) => sum + e.baseSalary, 0);
    const arrivalIqd = group.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.recruitmentFee || 0), 0);
    const arrivalUsd = group.filter(e => e.isForeign).reduce((sum, e) => sum + (e.recruitmentFee || 0), 0);
    const searchIqd = group.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.searchingDocFee || 0), 0);
    const searchUsd = group.filter(e => e.isForeign).reduce((sum, e) => sum + (e.searchingDocFee || 0), 0);
    const insuIqd = group.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.insurance || 0), 0);
    const insuUsd = group.filter(e => e.isForeign).reduce((sum, e) => sum + (e.insurance || 0), 0);
    const absIqd = group.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.absenceDeduction || 0), 0);
    const absUsd = group.filter(e => e.isForeign).reduce((sum, e) => sum + (e.absenceDeduction || 0), 0);
    const bonusIqd = group.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.bonus || 0), 0);
    const bonusUsd = group.filter(e => e.isForeign).reduce((sum, e) => sum + (e.bonus || 0), 0);
    const netIqd = group.filter(e => !e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
    const netUsd = group.filter(e => e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
    const netEquivIqd = netIqd + (netUsd * usdRate);
    const netEquivUsd = Math.round(((netIqd / usdRate) + netUsd) * 100) / 100;

    return {
      count,
      baseIqd, baseUsd,
      arrivalIqd, arrivalUsd,
      searchIqd, searchUsd,
      insuIqd, insuUsd,
      absIqd, absUsd,
      bonusIqd, bonusUsd,
      netIqd, netUsd,
      netEquivIqd, netEquivUsd,
    };
  };

  const paidStats = getMatrixRowStats(paidEmployees);
  const notYetStats = getMatrixRowStats(notYetEmployees);
  const stoppedStats = getMatrixRowStats(stoppedEmployees);
  const totalStats = getMatrixRowStats(filteredEmployees);

  const handleExportCSV = () => {
    const headers = 'Employee ID,Employee Name,Department,Workforce Type,Currency,Base Salary,Arrival Fee (0.05),Bonus,Insurance,Search Fee,Absence Deduct,Total Net Payout,Clean USD Cash,Remainder Dinar,Status,Disbursed At\n';
    const rows = filteredEmployees
      .map((e) => {
        const cleanUsd = e.isForeign ? Math.floor(e.netSalary / 100) * 100 : 0;
        const remDinar = e.isForeign ? (e.netSalary % 100) * usdRate : 0;
        return `${e.id},"${e.name}",${e.department},${e.isForeign ? 'Foreign' : 'Local'},${e.isForeign ? 'USD' : 'Dinar'},${e.baseSalary},${e.recruitmentFee || 0},${e.bonus || 0},${e.insurance || 0},${e.searchingDocFee || 0},${e.absenceDeduction || 0},${e.netSalary},${cleanUsd},${remDinar},"${e.salaryState}","${e.paidAt || 'Pending'}"`;
      })
      .join('\n');
    const uri = 'data:text/csv;charset=utf-8,' + encodeURI(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', uri);
    link.setAttribute('download', `payroll_report_${activePeriod.id}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Complete', `Exported full audit ledger for ${filteredEmployees.length} staff members.`);
  };

  const handleExportPDF = () => {
    showToast('Generating PDF', `Preparing official executive payroll statement for ${activePeriod.name}.`, 'info');
    window.print();
  };

  return (
    <div className="bg-[#f8fafc] text-on-background font-body-md min-h-screen flex antialiased">
      {/* Sidebar hidden in PDF export */}
      <div className="print:hidden no-print">
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f8fafc] print:h-auto print:overflow-visible print:bg-white">
        {/* TopNav hidden in PDF export */}
        <div className="print:hidden no-print">
          <TopNav title="Payroll Financial Reports" onMenuClick={() => setMobileOpen(true)} />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc] print:p-0 print:overflow-visible print:bg-white">
          <div className="w-full mx-auto flex flex-col gap-5 pb-16 print:pb-0 print:gap-4">

            {/* ========================================================================= */}
            {/* OFFICIAL PRINT-ONLY EXECUTIVE HEADER (Shown exclusively in PDF / Print) */}
            {/* ========================================================================= */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-widest text-slate-800 font-mono">
                      REPUBLIC OF IRAQ • PUBLIC PAYROLL COMMISSION
                    </span>
                  </div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5 uppercase">
                    Executive Payroll Audit &amp; Disbursement Statement
                  </h1>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Cycle: <strong className="text-slate-900">{activePeriod.name}</strong> ({activePeriod.id}) • Official CBI Exchange Peg: <strong className="text-slate-900">1 USD = {usdRate.toLocaleString()} IQD</strong>
                  </p>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-500">
                  <p className="font-bold text-slate-800 text-xs">OFFICIAL CERTIFIED REPORT</p>
                  <p>Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p>Authority: Aziz Sulaiman (Super Admin)</p>
                </div>
              </div>
            </div>

            {/* Screen Header (Hidden in PDF export) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden no-print">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest font-mono">
                    Financial Audit &amp; Ledger Statement
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-mono">Active Cycle: {activePeriod.name}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  Payroll Financial Breakdown
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
                {/* Period Switcher */}
                <select
                  value={activePeriod.id}
                  onChange={(e) => setActivePeriodId(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl py-2 px-3 shadow-2xs outline-none hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold py-2 px-3.5 rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-slate-600">download</span>
                  Export CSV
                </button>

                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold py-2 px-3.5 rounded-xl shadow-2xs hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  Export to PDF
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 4-CARD EXECUTIVE FINANCIAL STATISTICS BAR */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 print:grid-cols-4 print:gap-2">
              
              {/* 1. TOTAL PAID SO FAR (DISBURSED) */}
              <div className="bg-white rounded-2xl p-4 shadow-2xs border border-emerald-200/90 print:border-slate-400 print:rounded-xl print:p-3 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 print:w-6 print:h-6 print:text-slate-900 print:bg-slate-100 print:shadow-none">
                      <span className="material-symbols-outlined text-[18px] print:text-[14px]">check_circle</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono print:text-slate-600">
                        Paid For Now
                      </p>
                      <h4 className="text-base font-black text-emerald-950 tracking-tight leading-tight mt-0.5 font-mono print:text-sm">
                        {paidDinar > 0 ? `IQD ${paidDinar.toLocaleString()}` : (paidUsd > 0 ? `$${paidUsd.toLocaleString()}` : '0 IQD')}
                        {paidDinar > 0 && paidUsd > 0 && (
                          <span className="text-xs font-bold text-teal-700 ml-1 font-mono">+${paidUsd.toLocaleString()}</span>
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Noticeable small currency conversion badge */}
                <div className="my-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs">
                    <span className="material-symbols-outlined text-[12px] text-emerald-600">currency_exchange</span>
                    ≈ ${paidEquivUsd.toLocaleString()} USD
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 print:border-slate-200 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-800 font-bold">
                    🟢 {paidCount} Paid ({Math.round((paidCount / (filteredEmployees.length || 1)) * 100)}%)
                  </span>
                  <span className="text-slate-400 truncate max-w-[120px]" title={`Last payment: ${lastPaidTimestamp}`}>
                    🕒 {lastPaidTimestamp}
                  </span>
                </div>
              </div>

              {/* 2. UNPAID / NOT YET (LEFT TO PAY) */}
              <div className="bg-white rounded-2xl p-4 shadow-2xs border border-indigo-200/90 print:border-slate-400 print:rounded-xl print:p-3 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 print:w-6 print:h-6 print:text-slate-900 print:bg-slate-100 print:shadow-none">
                      <span className="material-symbols-outlined text-[18px] print:text-[14px]">hourglass_top</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono print:text-slate-600">
                        Unpaid (Pending Left)
                      </p>
                      <h4 className="text-base font-black text-indigo-950 tracking-tight leading-tight mt-0.5 font-mono print:text-sm">
                        {notYetDinar > 0 ? `IQD ${notYetDinar.toLocaleString()}` : (notYetUsd > 0 ? `$${notYetUsd.toLocaleString()}` : '0 IQD')}
                        {notYetDinar > 0 && notYetUsd > 0 && (
                          <span className="text-xs font-bold text-indigo-700 ml-1 font-mono">+${notYetUsd.toLocaleString()}</span>
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Noticeable small currency conversion badge */}
                <div className="my-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-indigo-100/90 text-indigo-800 border border-indigo-300 shadow-2xs">
                    <span className="material-symbols-outlined text-[12px] text-indigo-600">currency_exchange</span>
                    ≈ ${notYetEquivUsd.toLocaleString()} USD
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 print:border-slate-200 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-700 font-bold">
                    ⚪ {notYetCount} Staff Pending
                  </span>
                  <span className="text-slate-400">
                    {Math.round((notYetCount / (filteredEmployees.length || 1)) * 100)}% Left
                  </span>
                </div>
              </div>

              {/* 3. STOPPED / WITHHELD */}
              <div className="bg-white rounded-2xl p-4 shadow-2xs border border-rose-200/90 print:border-slate-400 print:rounded-xl print:p-3 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-md shadow-rose-500/20 print:w-6 print:h-6 print:text-slate-900 print:bg-slate-100 print:shadow-none">
                      <span className="material-symbols-outlined text-[18px] print:text-[14px]">block</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono print:text-slate-600">
                        Stopped (Withheld)
                      </p>
                      <h4 className="text-base font-black text-rose-950 tracking-tight leading-tight mt-0.5 font-mono print:text-sm">
                        {stoppedDinar > 0 ? `IQD ${stoppedDinar.toLocaleString()}` : (stoppedUsd > 0 ? `$${stoppedUsd.toLocaleString()}` : '0 IQD')}
                        {stoppedDinar > 0 && stoppedUsd > 0 && (
                          <span className="text-xs font-bold text-rose-700 ml-1 font-mono">+${stoppedUsd.toLocaleString()}</span>
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Noticeable small currency conversion badge */}
                <div className="my-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-rose-100/90 text-rose-900 border border-rose-300 shadow-2xs">
                    <span className="material-symbols-outlined text-[12px] text-rose-600">currency_exchange</span>
                    ≈ ${stoppedEquivUsd.toLocaleString()} USD
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 print:border-slate-200 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-rose-800 font-bold">
                    🔴 {stoppedCount} Staff Withheld
                  </span>
                  <span className="text-rose-600 font-bold">
                    Paused
                  </span>
                </div>
              </div>

              {/* 4. TOTAL DEDUCTIONS & FEES POOL */}
              <div className="bg-white rounded-2xl p-4 shadow-2xs border border-amber-200/90 print:border-slate-400 print:rounded-xl print:p-3 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 print:w-6 print:h-6 print:text-slate-900 print:bg-slate-100 print:shadow-none">
                      <span className="material-symbols-outlined text-[18px] print:text-[14px]">content_cut</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono print:text-slate-600">
                        Deductions &amp; Fees Pool
                      </p>
                      <h4 className="text-base font-black text-amber-950 tracking-tight leading-tight mt-0.5 font-mono print:text-sm">
                        IQD {totalDeductionsEquivIqd.toLocaleString()}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Noticeable small currency conversion badge */}
                <div className="my-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-100/90 text-amber-900 border border-amber-300 shadow-2xs">
                    <span className="material-symbols-outlined text-[12px] text-amber-700">currency_exchange</span>
                    ≈ ${totalDeductionsEquivUsd.toLocaleString()} USD
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 print:border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-600">
                  <span title="Search Fee Total" className="text-amber-800 font-bold">Search: {totalSearchFeeIqd.toLocaleString()}</span>
                  <span title="Arrival Fee (0.05) Total" className="text-rose-700 font-bold">Arrival: {totalArrivalFeeIqd.toLocaleString()}</span>
                </div>
              </div>

            </div>

            {/* ========================================================================= */}
            {/* EXECUTIVE DISBURSEMENT & DEDUCTIONS AUDIT MATRIX TABLE */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden print:rounded-xl print:border-slate-400">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">table_chart</span>
                    Disbursement &amp; Deductions Audit Matrix
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Comprehensive status breakdown of gross salaries, arrival fees, search fees, insurance, and net payouts.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-700 shadow-2xs">
                    Peg: 1 USD = {usdRate.toLocaleString()} IQD
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider font-mono">
                      <th className="py-2.5 px-3">Salary State</th>
                      <th className="py-2.5 px-2 text-center">Faculty</th>
                      <th className="py-2.5 px-3 text-right">Gross Base (IQD / $)</th>
                      <th className="py-2.5 px-2.5 text-right text-rose-700">Arrival (-0.05)</th>
                      <th className="py-2.5 px-2.5 text-right text-amber-700">Search Fee</th>
                      <th className="py-2.5 px-2.5 text-right text-rose-600">Insurance</th>
                      <th className="py-2.5 px-2.5 text-right text-rose-600">Absence</th>
                      <th className="py-2.5 px-2.5 text-right text-emerald-600">Bonus</th>
                      <th className="py-2.5 px-3 text-right bg-slate-200/60 font-black">Net Payout</th>
                      <th className="py-2.5 px-3 text-center bg-slate-200/40">Converted Equiv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-xs">
                    {/* Row 1: Paid */}
                    <tr className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold flex items-center gap-1.5 text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        🟢 Paid (Disbursed)
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800">{paidStats.count}</td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {paidStats.baseIqd > 0 && <span>IQD {paidStats.baseIqd.toLocaleString()}</span>}
                        {paidStats.baseUsd > 0 && <span className="block text-[11px] text-teal-700 font-bold">${paidStats.baseUsd.toLocaleString()}</span>}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-rose-700 font-medium">
                        {paidStats.arrivalIqd > 0 ? `-${paidStats.arrivalIqd.toLocaleString()}` : (paidStats.arrivalUsd > 0 ? `-$${paidStats.arrivalUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-amber-700 font-medium">
                        {paidStats.searchIqd > 0 ? `-${paidStats.searchIqd.toLocaleString()}` : (paidStats.searchUsd > 0 ? `-$${paidStats.searchUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-rose-600 font-medium">
                        {paidStats.insuIqd > 0 ? `-${paidStats.insuIqd.toLocaleString()}` : (paidStats.insuUsd > 0 ? `-$${paidStats.insuUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-rose-600 font-medium">
                        {paidStats.absIqd > 0 ? `-${paidStats.absIqd.toLocaleString()}` : (paidStats.absUsd > 0 ? `-$${paidStats.absUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-emerald-600 font-medium">
                        {paidStats.bonusIqd > 0 ? `+${paidStats.bonusIqd.toLocaleString()}` : (paidStats.bonusUsd > 0 ? `+$${paidStats.bonusUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-3 text-right bg-emerald-50/50 font-black text-emerald-950">
                        {paidStats.netIqd > 0 && <div>IQD {paidStats.netIqd.toLocaleString()}</div>}
                        {paidStats.netUsd > 0 && <div className="text-teal-700">${paidStats.netUsd.toLocaleString()}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-emerald-50/20">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ≈ ${paidStats.netEquivUsd.toLocaleString()} USD
                        </span>
                      </td>
                    </tr>

                    {/* Row 2: Unpaid */}
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold flex items-center gap-1.5 text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        ⚪ Unpaid (Pending)
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800">{notYetStats.count}</td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {notYetStats.baseIqd > 0 && <span>IQD {notYetStats.baseIqd.toLocaleString()}</span>}
                        {notYetStats.baseUsd > 0 && <span className="block text-[11px] text-teal-700 font-bold">${notYetStats.baseUsd.toLocaleString()}</span>}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-rose-700 font-medium">
                        {notYetStats.arrivalIqd > 0 ? `-${notYetStats.arrivalIqd.toLocaleString()}` : (notYetStats.arrivalUsd > 0 ? `-$${notYetStats.arrivalUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-amber-700 font-medium">
                        {notYetStats.searchIqd > 0 ? `-${notYetStats.searchIqd.toLocaleString()}` : (notYetStats.searchUsd > 0 ? `-$${notYetStats.searchUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-rose-600 font-medium">
                        {notYetStats.insuIqd > 0 ? `-${notYetStats.insuIqd.toLocaleString()}` : (notYetStats.insuUsd > 0 ? `-$${notYetStats.insuUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-rose-600 font-medium">
                        {notYetStats.absIqd > 0 ? `-${notYetStats.absIqd.toLocaleString()}` : (notYetStats.absUsd > 0 ? `-$${notYetStats.absUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-emerald-600 font-medium">
                        {notYetStats.bonusIqd > 0 ? `+${notYetStats.bonusIqd.toLocaleString()}` : (notYetStats.bonusUsd > 0 ? `+$${notYetStats.bonusUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-3 text-right bg-slate-100/50 font-black text-slate-900">
                        {notYetStats.netIqd > 0 && <div>IQD {notYetStats.netIqd.toLocaleString()}</div>}
                        {notYetStats.netUsd > 0 && <div className="text-teal-700">${notYetStats.netUsd.toLocaleString()}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-slate-50">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
                          ≈ ${notYetStats.netEquivUsd.toLocaleString()} USD
                        </span>
                      </td>
                    </tr>

                    {/* Row 3: Stopped */}
                    <tr className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold flex items-center gap-1.5 text-rose-800">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        🔴 Stopped (Withheld)
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-rose-800">{stoppedStats.count}</td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {stoppedStats.baseIqd > 0 && <span>IQD {stoppedStats.baseIqd.toLocaleString()}</span>}
                        {stoppedStats.baseUsd > 0 && <span className="block text-[11px] text-teal-700 font-bold">${stoppedStats.baseUsd.toLocaleString()}</span>}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-rose-700 font-medium">
                        {stoppedStats.arrivalIqd > 0 ? `-${stoppedStats.arrivalIqd.toLocaleString()}` : (stoppedStats.arrivalUsd > 0 ? `-$${stoppedStats.arrivalUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-amber-700 font-medium">
                        {stoppedStats.searchIqd > 0 ? `-${stoppedStats.searchIqd.toLocaleString()}` : (stoppedStats.searchUsd > 0 ? `-$${stoppedStats.searchUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-rose-600 font-medium">
                        {stoppedStats.insuIqd > 0 ? `-${stoppedStats.insuIqd.toLocaleString()}` : (stoppedStats.insuUsd > 0 ? `-$${stoppedStats.insuUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-rose-600 font-medium">
                        {stoppedStats.absIqd > 0 ? `-${stoppedStats.absIqd.toLocaleString()}` : (stoppedStats.absUsd > 0 ? `-$${stoppedStats.absUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-emerald-600 font-medium">
                        {stoppedStats.bonusIqd > 0 ? `+${stoppedStats.bonusIqd.toLocaleString()}` : (stoppedStats.bonusUsd > 0 ? `+$${stoppedStats.bonusUsd.toLocaleString()}` : '-')}
                      </td>
                      <td className="py-2.5 px-3 text-right bg-rose-50/50 font-black text-rose-950">
                        {stoppedStats.netIqd > 0 && <div>IQD {stoppedStats.netIqd.toLocaleString()}</div>}
                        {stoppedStats.netUsd > 0 && <div className="text-teal-700">${stoppedStats.netUsd.toLocaleString()}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-rose-50/20">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          ≈ ${stoppedStats.netEquivUsd.toLocaleString()} USD
                        </span>
                      </td>
                    </tr>
                  </tbody>

                  {/* Summary Totals Footer */}
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-mono text-xs font-black">
                      <td className="py-3 px-3 uppercase tracking-wider">Total Ledger</td>
                      <td className="py-3 px-2 text-center text-primary-300">{totalStats.count}</td>
                      <td className="py-3 px-3 text-right">
                        {totalStats.baseIqd > 0 && <div>IQD {totalStats.baseIqd.toLocaleString()}</div>}
                        {totalStats.baseUsd > 0 && <div className="text-teal-300 font-bold">${totalStats.baseUsd.toLocaleString()}</div>}
                      </td>
                      <td className="py-3 px-2.5 text-right text-rose-300">-{totalArrivalFeeIqd.toLocaleString()}</td>
                      <td className="py-3 px-2.5 text-right text-amber-300">-{totalSearchFeeIqd.toLocaleString()}</td>
                      <td className="py-3 px-2.5 text-right text-rose-300">-{totalInsuranceIqd.toLocaleString()}</td>
                      <td className="py-3 px-2.5 text-right text-rose-300">-{totalAbsenceIqd.toLocaleString()}</td>
                      <td className="py-3 px-2.5 text-right text-emerald-300">+{totalBonusIqd.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right bg-slate-800 text-amber-400 text-sm">
                        IQD {grandTotalEquivalentDinar.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center bg-slate-800/80">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500 text-slate-950">
                          ≈ ${grandTotalEquivalentUsd.toLocaleString()} USD
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Search and Filters Bar (Hidden in PDF export) */}
            <div className="bg-white rounded-xl shadow-2xs p-3 flex flex-col md:flex-row gap-3 items-center border border-slate-200 print:hidden no-print">
              {/* Fluid Search Bar */}
              <div className="relative flex-1 w-full">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                  search
                </span>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-9 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-slate-800 placeholder:text-slate-400 transition-all"
                  placeholder="Search report by employee name, ID, department, or payout status..."
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
                  value={foreignFilter}
                  onChange={(e) => {
                    setForeignFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl py-2 px-3 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="">All Workforce</option>
                  <option value="foreign">🌍 Foreign Staff (USD $)</option>
                  <option value="local">🏛️ Local Staff (Dinar)</option>
                </select>

                <select
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl py-2 px-3 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="">All Salary States</option>
                  <option value="Paid">🟢 Paid</option>
                  <option value="Not Yet">⚪ Unpaid (Not Yet)</option>
                  <option value="Stopped">🔴 Stopped</option>
                </select>

                <select
                  value={deptFilter}
                  onChange={(e) => {
                    setDeptFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl py-2 px-3 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="">All Departments</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                </select>

                {(search || stateFilter || deptFilter || foreignFilter) && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStateFilter('');
                      setDeptFilter('');
                      setForeignFilter('');
                      setPage(1);
                    }}
                    className="text-xs text-primary font-bold hover:underline px-2 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-mono shrink-0">
                <span>{paginatedEmployees.length} of {filteredEmployees.length} records</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* EXECUTIVE SUMMARY TABLE (Optimized for both screen view & crisp PDF output) */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-xl shadow-2xs border border-slate-200 print:border-slate-400 print:shadow-none overflow-hidden flex flex-col w-full">
              <div className="w-full overflow-x-auto print:overflow-visible">
                <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 print:border-slate-400 print:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider print:text-[9px]">
                      <th className="py-3 px-3 text-center w-[85px] print:py-2 print:px-2">ID</th>
                      <th className="py-3 px-4 text-left min-w-[180px] print:py-2 print:px-2">Employee Name</th>
                      <th className="py-3 px-3 text-center w-[110px] print:py-2 print:px-2">Workforce</th>
                      <th className="py-3 px-4 text-center min-w-[150px] bg-slate-100/50 print:bg-transparent text-slate-900 print:py-2 print:px-2">
                        <span>Base Salary</span>
                      </th>
                      <th className="py-3 px-4 text-center bg-slate-100/70 print:bg-transparent min-w-[200px] print:py-2 print:px-2">
                        The Net Salary (Payout)
                      </th>
                      <th className="py-3 px-3 text-center w-[90px] print:py-2 print:px-2">State</th>
                      <th className="py-3 px-4 text-center min-w-[140px] print:py-2 print:px-2">Disbursed At</th>
                      <th className="py-3 px-4 text-center min-w-[130px] print:hidden no-print">Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          <span className="material-symbols-outlined text-[36px] text-slate-300 mb-1">
                            search_off
                          </span>
                          <p className="text-sm font-bold text-slate-700">No matching payroll records.</p>
                          <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query or reset filters.</p>
                        </td>
                      </tr>
                    ) : (
                      // On screen: display paginated records. In print: display all filtered employees seamlessly!
                      (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('print').matches
                        ? filteredEmployees
                        : paginatedEmployees
                      ).map((emp, index) => {
                        const isPaid = emp.salaryState === 'Paid';
                        const isStopped = emp.salaryState === 'Stopped';
                        const isForeign = Boolean(emp.isForeign);
                        const currSymbol = isForeign ? '$' : 'IQD ';
                        
                        // Intelligently open tooltip upwards if row is near bottom or in small list to prevent clipping & scrollbars
                        const totalRows = paginatedEmployees.length;
                        const isNearBottom = index >= Math.max(1, totalRows - 2) || (totalRows <= 3 && index > 0);

                        // Foreign clean dollar & remainder dinar calculation
                        const cleanDollars = Math.floor(emp.netSalary / 100) * 100;
                        const remainderDollars = emp.netSalary % 100;
                        const remainderDinar = remainderDollars * usdRate;

                        // Total deductions summary for hover hint
                        const hasDeductionsOrBonus =
                          emp.hasRecruitmentFee ||
                          (emp.bonus && emp.bonus > 0) ||
                          (emp.insurance && emp.insurance > 0) ||
                          (emp.absenceDays && emp.absenceDays > 0);

                        // Row Border & Tint Styling
                        const rowBorderClass = isPaid
                          ? 'border-l-[4px] border-l-emerald-500 bg-emerald-50/[0.04] print:border-l-slate-900'
                          : isStopped
                          ? 'border-l-[4px] border-l-rose-500 bg-rose-50/[0.30] print:border-l-slate-900'
                          : 'border-l-[4px] border-l-slate-300 bg-white print:border-l-slate-400';

                        return (
                          <tr
                            key={emp.id}
                            className={`group transition-all duration-150 ease-out hover:-translate-y-[1px] hover:shadow-xs relative hover:z-20 print:hover:translate-y-0 print:hover:shadow-none ${rowBorderClass}`}
                          >
                            {/* ID */}
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 whitespace-nowrap print:py-1.5 print:px-2">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 text-xs font-mono border border-slate-200 print:border-none print:bg-transparent print:text-[10px]">
                                {emp.id}
                              </span>
                            </td>

                            {/* Employee Name + Dept */}
                            <td className="py-3 px-4 text-left print:py-1.5 print:px-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-700 text-white flex items-center justify-center font-bold text-[11px] shrink-0 print:hidden no-print">
                                  {emp.initials}
                                </div>
                                <div className="leading-tight">
                                  <span className="font-bold text-slate-900 text-xs block print:text-[11px]">{emp.name}</span>
                                  <span className="text-[10px] text-slate-500 font-medium print:text-[9px]">{emp.department} • {emp.type}</span>
                                </div>
                              </div>
                            </td>

                            {/* Workforce Badge */}
                            <td className="py-3 px-3 text-center whitespace-nowrap print:py-1.5 print:px-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono print:border-none print:bg-transparent ${
                                  isForeign
                                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {isForeign ? 'USD ($)' : 'Dinar (IQD)'}
                              </span>
                            </td>

                            {/* CLEAR BASE SALARY */}
                            <td className="py-3 px-4 text-center whitespace-nowrap bg-slate-50/40 print:bg-transparent print:py-1.5 print:px-2">
                              <span className="font-mono font-bold text-xs text-slate-900 print:text-[11px]">
                                {currSymbol}{emp.baseSalary.toLocaleString()}
                              </span>
                            </td>

                            {/* The Net Salary (Payout Box) */}
                            <td className="py-2.5 px-4 text-center bg-slate-50/70 print:bg-transparent whitespace-nowrap print:py-1.5 print:px-2">
                              <div className="inline-flex flex-col items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs print:border-none print:shadow-none print:p-0">
                                <span className="font-mono font-black text-xs text-slate-900 print:text-[11px]">
                                  {currSymbol}{emp.netSalary.toLocaleString()}
                                </span>
                                {isForeign && (
                                  <div className="text-[9px] font-mono text-slate-500 flex items-center gap-1 print:text-[8px]">
                                    <span className="text-emerald-700 font-bold">${cleanDollars}</span>
                                    {remainderDollars > 0 && (
                                      <span className="text-slate-500">
                                        + {Math.round(remainderDinar).toLocaleString()} IQD
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* State Badge */}
                            <td className="py-3 px-3 text-center whitespace-nowrap print:py-1.5 print:px-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono print:border-none print:bg-transparent ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : isStopped
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {emp.salaryState}
                              </span>
                            </td>

                            {/* Paid Date & Time */}
                            <td className="py-3 px-4 text-center font-mono text-[10px] text-slate-600 whitespace-nowrap print:py-1.5 print:px-2">
                              {emp.paidAt ? (
                                <span className="text-slate-800 font-semibold">{emp.paidAt}</span>
                              ) : (
                                <span className="text-slate-400 italic">Pending</span>
                              )}
                            </td>

                            {/* Screen-only Voucher Button */}
                            <td className="py-3 px-4 text-center whitespace-nowrap print:hidden no-print">
                              <div className="relative inline-block group/voucher">
                                <button
                                  onClick={() => setSelectedVoucher(emp)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-primary hover:text-white text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                                  title="Click to view certified full voucher"
                                >
                                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                  <span>View Voucher</span>
                                  {hasDeductionsOrBonus && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  )}
                                </button>

                                {/* Hover Breakdown Tooltip */}
                                <div className={`absolute right-0 ${isNearBottom ? 'bottom-full mb-2' : 'top-full mt-2'} hidden group-hover/voucher:block z-50 w-64 bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700 pointer-events-none animate-fade-in text-left`}>
                                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
                                    <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-[15px] text-amber-400">info</span>
                                      <span>{emp.name}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">{emp.id}</span>
                                  </div>

                                  <div className="space-y-1.5 text-[11px] font-mono">
                                    <div className="flex justify-between text-slate-300">
                                      <span className="text-slate-400 font-sans">Base Salary:</span>
                                      <span className="font-bold text-white">{currSymbol}{emp.baseSalary.toLocaleString()}</span>
                                    </div>

                                    {emp.hasRecruitmentFee ? (
                                      <div className="flex justify-between text-amber-400">
                                        <span className="font-sans">Arrival (50%):</span>
                                        <span className="font-bold">-{currSymbol}{emp.recruitmentFee?.toLocaleString()}</span>
                                      </div>
                                    ) : null}

                                    {emp.bonus && emp.bonus > 0 ? (
                                      <div className="flex justify-between text-emerald-400">
                                        <span className="font-sans">Bonus:</span>
                                        <span className="font-bold">+{currSymbol}{emp.bonus.toLocaleString()}</span>
                                      </div>
                                    ) : null}

                                    {emp.insurance && emp.insurance > 0 ? (
                                      <div className="flex justify-between text-rose-400">
                                        <span className="font-sans">Insurance:</span>
                                        <span className="font-bold">-{currSymbol}{emp.insurance.toLocaleString()}</span>
                                      </div>
                                    ) : null}

                                    {emp.absenceDays && emp.absenceDays > 0 ? (
                                      <div className="flex justify-between text-rose-400">
                                        <span className="font-sans">Absence ({emp.absenceDays}d):</span>
                                        <span className="font-bold">-{currSymbol}{emp.absenceDeduction?.toLocaleString()}</span>
                                      </div>
                                    ) : null}

                                    <div className="pt-2 border-t border-slate-700/80 flex justify-between items-center text-primary-fixed font-bold">
                                      <span className="text-[10px] text-slate-400 font-sans uppercase">Net Payout:</span>
                                      <span className="text-xs text-emerald-400">{currSymbol}{emp.netSalary.toLocaleString()}</span>
                                    </div>
                                  </div>

                                  <div className="mt-2 text-[9px] text-slate-400 text-center bg-slate-800/80 py-1 rounded-lg">
                                    Click button for official certified printout
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Screen-only Pagination */}
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs print:hidden no-print">
                <p className="text-slate-500 font-mono">
                  Showing <span className="font-bold text-slate-800">{paginatedEmployees.length}</span> of{' '}
                  <span className="font-bold text-slate-800">{filteredEmployees.length}</span> staff records
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg font-bold font-mono text-xs transition-all cursor-pointer ${
                        page === p
                          ? 'bg-primary text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-white border border-transparent hover:border-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* OFFICIAL PRINT-ONLY SIGN-OFF & CERTIFICATION FOOTER */}
            {/* ========================================================================= */}
            <div className="hidden print:block mt-6 pt-4 border-t-2 border-slate-900 font-mono text-[10px]">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900 text-xs">Aziz Sulaiman</p>
                  <p className="text-slate-600">Disbursal &amp; Super Admin Authority</p>
                  <p className="text-slate-400 text-[9px] mt-2">Signature &amp; Date: ___________________</p>
                </div>
                <div className="border-t border-slate-400 pt-2 flex flex-col items-center">
                  <p className="font-bold text-slate-900 text-xs">Official Accounting Seal</p>
                  <p className="text-slate-600">Verified &amp; Certified Statement</p>
                  <div className="mt-1 border border-dashed border-slate-400 px-3 py-1 text-[9px] text-slate-700 font-bold uppercase rounded">
                    [ AUDIT SEAL • PR-2026-GOV ]
                  </div>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900 text-xs">Director of Financial Audit</p>
                  <p className="text-slate-600">Supreme Audit &amp; Control Board</p>
                  <p className="text-slate-400 text-[9px] mt-2">Signature &amp; Date: ___________________</p>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* MODAL: CERTIFIED STATEMENT VOUCHER WITH FULL ITEMIZATION */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in print:hidden no-print">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedVoucher(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-[22px]">verified</span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Official Salary Voucher &amp; Statement</h3>
                <p className="text-xs text-slate-400 font-mono">{activePeriod.name} • Ref: {selectedVoucher.id}</p>
              </div>
            </div>

            {/* Voucher Document Card */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/70 space-y-4 font-mono text-xs shadow-inner">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 font-sans">{selectedVoucher.name}</h4>
                  <p className="text-[11px] text-slate-500 font-sans">{selectedVoucher.department} • {selectedVoucher.type}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  selectedVoucher.salaryState === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : selectedVoucher.salaryState === 'Stopped'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-slate-200 text-slate-700 border border-slate-300'
                }`}>
                  ● {selectedVoucher.salaryState}
                </span>
              </div>

              {/* Itemized Breakdown Rows */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-sans font-semibold">Base Monthly Salary:</span>
                  <span className="font-black text-slate-900 text-sm">
                    {selectedVoucher.isForeign ? '$' : 'IQD '}{selectedVoucher.baseSalary.toLocaleString()}
                  </span>
                </div>

                {selectedVoucher.hasRecruitmentFee && (
                  <div className="flex justify-between items-center text-amber-900 bg-amber-50/80 p-2 rounded-xl border border-amber-200">
                    <span className="font-sans font-medium">Arrival Fee (5% Base Deduction):</span>
                    <span className="font-bold">
                      -{selectedVoucher.isForeign ? '$' : 'IQD '}{(selectedVoucher.recruitmentFee || selectedVoucher.baseSalary * 0.05).toLocaleString()}
                    </span>
                  </div>
                )}

                {selectedVoucher.bonus > 0 && (
                  <div className="flex justify-between items-center text-emerald-800 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                    <span className="font-sans font-medium">Performance Bonus:</span>
                    <span className="font-bold">
                      +{selectedVoucher.isForeign ? '$' : 'IQD '}{selectedVoucher.bonus.toLocaleString()}
                    </span>
                  </div>
                )}

                {selectedVoucher.insurance > 0 && (
                  <div className="flex justify-between items-center text-rose-800 bg-rose-50/80 p-2 rounded-xl border border-rose-200">
                    <span className="font-sans font-medium">Insurance Contribution:</span>
                    <span className="font-bold">
                      -{selectedVoucher.isForeign ? '$' : 'IQD '}{selectedVoucher.insurance.toLocaleString()}
                    </span>
                  </div>
                )}

                {(selectedVoucher.searchingDocFee || 0) > 0 && (
                  <div className="flex justify-between items-center text-amber-900 bg-amber-50/80 p-2 rounded-xl border border-amber-200">
                    <span className="font-sans font-medium">Search Fee:</span>
                    <span className="font-bold">
                      -{selectedVoucher.isForeign ? '$' : 'IQD '}{(selectedVoucher.searchingDocFee || 0).toLocaleString()}
                    </span>
                  </div>
                )}

                {selectedVoucher.absenceDeduction > 0 && (
                  <div className="flex justify-between items-center text-rose-800 bg-rose-50/80 p-2 rounded-xl border border-rose-200">
                    <span className="font-sans font-medium">Absence Deduction ({selectedVoucher.absenceDays} days):</span>
                    <span className="font-bold">
                      -{selectedVoucher.isForeign ? '$' : 'IQD '}{selectedVoucher.absenceDeduction.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Total Net Payout Box */}
              <div className="pt-3 border-t-2 border-slate-300 flex justify-between items-center bg-white p-3.5 rounded-xl border shadow-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Certified Net Disbursement</span>
                  {selectedVoucher.isForeign && (
                    <span className="text-[11px] text-emerald-700 font-bold">
                      ${Math.floor(selectedVoucher.netSalary / 100) * 100} Cash + {Math.round((selectedVoucher.netSalary % 100) * usdRate).toLocaleString()} IQD
                    </span>
                  )}
                </div>
                <span className="text-lg font-black text-primary">
                  {selectedVoucher.isForeign ? '$' : 'IQD '}{selectedVoucher.netSalary.toLocaleString()}
                </span>
              </div>

              {/* Disbursal Timestamp */}
              <div className="text-[11px] text-slate-500 pt-1 flex justify-between items-center font-sans">
                <span>Disbursal Recorded:</span>
                <span className="font-mono font-bold text-slate-700">{selectedVoucher.paidAt || 'Pending Authorization'}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  showToast('Statement Printed', `Voucher for ${selectedVoucher.name} sent to printer.`);
                  window.print();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Print Voucher
              </button>
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-slate-400">Loading payroll reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
