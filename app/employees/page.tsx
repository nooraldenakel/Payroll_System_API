'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { usePayroll, Employee } from '../lib/PayrollContext';

export default function EmployeesPage() {
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    employees,
    settings,
    activePeriod,
    setIsAddEmployeeModalOpen,
    deleteEmployee,
    updateEmployee,
    toggleSalaryState,
    showToast,
  } = usePayroll();

  useEffect(() => {
    setMounted(true);
  }, []);

  const usdRate = settings.usdToDinarRate || 1310;

  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [foreignFilter, setForeignFilter] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [confirmStateModal, setConfirmStateModal] = useState<{
    employee: Employee;
    targetState: 'Not Yet' | 'Stopped';
  } | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [pendingUpdateConfirmation, setPendingUpdateConfirmation] = useState<{
    id: string;
    name: string;
    updates: Partial<Employee>;
  } | null>(null);

  const [page, setPage] = useState(1);
  const [pageSizeMode, setPageSizeMode] = useState<'5' | '10' | '20' | '50' | '100' | 'all' | 'custom'>('10');
  const [customPageSize, setCustomPageSize] = useState<number>(25);
  const [isCustomInputOpen, setIsCustomInputOpen] = useState(false);

  type SortField =
    | 'id'
    | 'name'
    | 'isForeign'
    | 'baseSalary'
    | 'recruitmentFee'
    | 'bonus'
    | 'insurance'
    | 'absenceDeduction'
    | 'searchingDocFee'
    | 'netSalary'
    | 'salaryState'
    | 'paidAt';

  type SortOrder = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortField(null);
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Multi-field search
  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchesSearch =
      emp.name.toLowerCase().includes(q) ||
      emp.id.toLowerCase().includes(q) ||
      emp.salaryState.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      (emp.isForeign ? 'foreign usd dollar' : 'local dinar').includes(q) ||
      (emp.paidAt && emp.paidAt.toLowerCase().includes(q)) ||
      String(emp.baseSalary).includes(q) ||
      String(emp.netSalary).includes(q);

    const matchesState = stateFilter ? emp.salaryState === stateFilter : true;
    const matchesDept = deptFilter ? emp.department === deptFilter : true;
    const matchesForeign =
      foreignFilter === 'foreign'
        ? Boolean(emp.isForeign)
        : foreignFilter === 'local'
          ? !emp.isForeign
          : true;

    return matchesSearch && matchesState && matchesDept && matchesForeign;
  });

  // Dynamic Type-Aware Sorting (Numerical, Alphabetical, Date, State)
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortField) return 0;
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    switch (sortField) {
      case 'id':
        return multiplier * a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      case 'name':
        return multiplier * a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      case 'isForeign':
        return multiplier * (Number(Boolean(a.isForeign)) - Number(Boolean(b.isForeign)));
      case 'baseSalary': {
        const aVal = a.isForeign ? a.baseSalary * usdRate : a.baseSalary;
        const bVal = b.isForeign ? b.baseSalary * usdRate : b.baseSalary;
        return multiplier * (aVal - bVal);
      }
      case 'recruitmentFee':
        return multiplier * ((a.recruitmentFee || 0) - (b.recruitmentFee || 0));
      case 'bonus':
        return multiplier * ((a.bonus || 0) - (b.bonus || 0));
      case 'insurance':
        return multiplier * ((a.insurance || 0) - (b.insurance || 0));
      case 'absenceDeduction':
        return multiplier * ((a.absenceDeduction || 0) - (b.absenceDeduction || 0));
      case 'searchingDocFee':
        return multiplier * ((a.searchingDocFee || 0) - (b.searchingDocFee || 0));
      case 'netSalary': {
        const aVal = a.isForeign ? a.netSalary * usdRate : a.netSalary;
        const bVal = b.isForeign ? b.netSalary * usdRate : b.netSalary;
        return multiplier * (aVal - bVal);
      }
      case 'salaryState':
        return multiplier * (a.salaryState || '').localeCompare(b.salaryState || '');
      case 'paidAt': {
        const aTime = a.paidAt ? new Date(a.paidAt).getTime() : 0;
        const bTime = b.paidAt ? new Date(b.paidAt).getTime() : 0;
        if (!isNaN(aTime) && !isNaN(bTime) && (aTime > 0 || bTime > 0)) {
          return multiplier * (aTime - bTime);
        }
        return multiplier * (a.paidAt || '').localeCompare(b.paidAt || '');
      }
      default:
        return 0;
    }
  });

  const effectiveItemsPerPage =
    pageSizeMode === 'all'
      ? Math.max(1, sortedEmployees.length)
      : pageSizeMode === 'custom'
        ? Math.max(1, customPageSize || 10)
        : parseInt(pageSizeMode, 10) || 10;

  const totalPages = Math.ceil(sortedEmployees.length / effectiveItemsPerPage) || 1;
  const startIndex = (page - 1) * effectiveItemsPerPage;
  const endIndex = Math.min(sortedEmployees.length, startIndex + effectiveItemsPerPage);
  const paginatedEmployees = sortedEmployees.slice(startIndex, startIndex + effectiveItemsPerPage);

  // Detailed Financial Aggregates
  const foreignCount = employees.filter((e) => e.isForeign).length;
  const localCount = employees.length - foreignCount;
  
  const paidEmployees = employees.filter((e) => e.salaryState === 'Paid');
  const notYetEmployees = employees.filter((e) => e.salaryState === 'Not Yet');
  const stoppedEmployees = employees.filter((e) => e.salaryState === 'Stopped');

  const paidCount = paidEmployees.length;
  const notYetCount = notYetEmployees.length;
  const stoppedCount = stoppedEmployees.length;

  // Paid amounts
  const paidDinar = paidEmployees.filter((e) => !e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const paidUsd = paidEmployees.filter((e) => e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const paidTotalEquivIqd = paidDinar + (paidUsd * usdRate);
  const paidTotalEquivUsd = Math.round(((paidDinar / usdRate) + paidUsd) * 100) / 100;

  // Remaining Left to Pay (Unpaid & Stopped)
  const notYetDinar = notYetEmployees.filter((e) => !e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const notYetUsd = notYetEmployees.filter((e) => e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const stoppedDinar = stoppedEmployees.filter((e) => !e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);
  const stoppedUsd = stoppedEmployees.filter((e) => e.isForeign).reduce((sum, e) => sum + e.netSalary, 0);

  const leftDinar = notYetDinar + stoppedDinar;
  const leftUsd = notYetUsd + stoppedUsd;
  const leftTotalEquivIqd = leftDinar + (leftUsd * usdRate);
  const leftTotalEquivUsd = Math.round(((leftDinar / usdRate) + leftUsd) * 100) / 100;

  // Deductions & Search Fees
  const totalSearchFeeIqd = employees.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.searchingDocFee || 0), 0);
  const totalSearchFeeUsd = employees.filter(e => e.isForeign).reduce((sum, e) => sum + (e.searchingDocFee || 0), 0);
  const totalArrivalFeeIqd = employees.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.recruitmentFee || 0), 0);
  const totalArrivalFeeUsd = employees.filter(e => e.isForeign).reduce((sum, e) => sum + (e.recruitmentFee || 0), 0);
  const totalInsuranceIqd = employees.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.insurance || 0), 0);
  const totalInsuranceUsd = employees.filter(e => e.isForeign).reduce((sum, e) => sum + (e.insurance || 0), 0);
  const totalAbsenceIqd = employees.filter(e => !e.isForeign).reduce((sum, e) => sum + (e.absenceDeduction || 0), 0);
  const totalAbsenceUsd = employees.filter(e => e.isForeign).reduce((sum, e) => sum + (e.absenceDeduction || 0), 0);

  const totalDeductionsIqd = totalSearchFeeIqd + totalArrivalFeeIqd + totalInsuranceIqd + totalAbsenceIqd;
  const totalDeductionsUsd = totalSearchFeeUsd + totalArrivalFeeUsd + totalInsuranceUsd + totalAbsenceUsd;
  const totalDeductionsEquivIqd = totalDeductionsIqd + (totalDeductionsUsd * usdRate);
  const totalDeductionsEquivUsd = Math.round(((totalDeductionsIqd / usdRate) + totalDeductionsUsd) * 100) / 100;

  // When: Latest paid employee timestamp
  const latestPaidEmployee = [...paidEmployees].filter(e => Boolean(e.paidAt)).pop();
  const lastPaidTimestamp = latestPaidEmployee?.paidAt || (paidCount > 0 ? 'Recently' : 'No payments yet');

  const handleStateButtonClick = (emp: Employee) => {
    if (emp.salaryState === 'Paid') {
      // Prompt confirmation alert when changing from Paid to Unpaid or Stopped
      setConfirmStateModal({
        employee: emp,
        targetState: 'Not Yet',
      });
    } else if (emp.salaryState === 'Not Yet') {
      toggleSalaryState(emp.id, 'Paid');
    } else {
      toggleSalaryState(emp.id, 'Not Yet');
    }
  };

  const handleConfirmStateChange = () => {
    if (!confirmStateModal) return;
    const { employee, targetState } = confirmStateModal;
    toggleSalaryState(employee.id, targetState);
    showToast(
      'Status Updated',
      `${employee.name}'s salary status changed from Paid to ${targetState === 'Not Yet' ? 'Unpaid' : 'Stopped'}.`,
      targetState === 'Stopped' ? 'warning' : 'info'
    );
    setConfirmStateModal(null);
  };

  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;
    deleteEmployee(employeeToDelete.id);
    showToast('Employee Deleted', `${employeeToDelete.name} (${employeeToDelete.id}) removed permanently.`, 'error');
    setEmployeeToDelete(null);
  };

  const handleConfirmUpdate = () => {
    if (!pendingUpdateConfirmation) return;
    updateEmployee(pendingUpdateConfirmation.id, pendingUpdateConfirmation.updates);
    showToast('Record Updated', `Compensation details for ${pendingUpdateConfirmation.name} updated successfully.`, 'success');
    setPendingUpdateConfirmation(null);
    setEditingEmployee(null);
  };

  const handleExport = () => {
    const headers = 'ID,Employee Name,Foreign Status,Currency,Base Salary,Arrival Fee (0.5),Bonus,Insurance,Search Fee,Absence Deduct,Total Net USD,Clean Cash USD,Remainder Dinar,Total Dinar Value,Salary State,Paid Date & Time,Department\n';
    const rows = filteredEmployees
      .map((e) => {
        const cleanUsd = Math.floor(e.netSalary / 100) * 100;
        const remDinar = (e.netSalary % 100) * usdRate;
        const totalDinarEquiv = e.isForeign ? e.netSalary * usdRate : e.netSalary;
        return `${e.id},"${e.name}",${e.isForeign ? 'Foreign' : 'Local'},${e.currency || (e.isForeign ? 'USD' : 'Dinar')},${e.baseSalary},${e.recruitmentFee || 0},${e.bonus || 0},${e.insurance || 0},${e.searchingDocFee || 0},${e.absenceDeduction || 0},${e.isForeign ? e.netSalary : 0},${cleanUsd},${remDinar},${totalDinarEquiv},"${e.salaryState}","${e.paidAt || 'Not Paid Yet'}","${e.department}"`;
      })
      .join('\n');
    const uri = 'data:text/csv;charset=utf-8,' + encodeURI(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', uri);
    link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Complete', `Exported ${filteredEmployees.length} employee records to CSV.`);
  };

  return (
    <div className="bg-[#f8fafc] text-on-background font-body-md min-h-screen flex antialiased">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f8fafc]">
        <TopNav title="Employee Management" onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc]">
          <div className="w-full mx-auto flex flex-col gap-4 pb-16">

            {/* Historical Archived Cycle Alert Banner */}
            {activePeriod.status === 'Archived' && (
              <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[22px]">lock_clock</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                        HISTORICAL ARCHIVED CYCLE
                      </span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        {activePeriod.name} ({activePeriod.ref})
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/80 mt-0.5">
                      You are currently managing records in a closed historical period. Any modifications to compensation or payment states will be strictly flagged in the audit log.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/payroll-periods"
                    className="px-3.5 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    Switch Cycle
                  </Link>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* RICH 4-CARD FINANCIAL & DISBURSEMENT STATISTICS BAR */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* 1. PAID SO FAR CARD */}
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-emerald-200/80 hover:shadow-md hover:border-emerald-400 transition-all group relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Paid For Now</p>
                      <h4 className="text-lg font-black text-emerald-950 tracking-tight leading-tight mt-0.5 font-mono">
                        {paidDinar > 0 ? `IQD ${paidDinar.toLocaleString()}` : (paidUsd > 0 ? `$${paidUsd.toLocaleString()}` : '0 IQD')}
                        {paidDinar > 0 && paidUsd > 0 && (
                          <span className="text-xs font-bold text-teal-700 ml-1 block sm:inline font-mono">+${paidUsd.toLocaleString()}</span>
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Small Noticeable Currency Convert Badge */}
                <div className="my-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs">
                    <span className="material-symbols-outlined text-[12px] text-emerald-600">currency_exchange</span>
                    ≈ ${paidTotalEquivUsd.toLocaleString()} USD
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({Math.round((paidCount / (employees.length || 1)) * 100)}% Paid)
                  </span>
                </div>

                {/* When (Timestamp) & Count */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {paidCount} of {employees.length} Staff
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[130px]" title={`Last payment: ${lastPaidTimestamp}`}>
                    🕒 {lastPaidTimestamp}
                  </span>
                </div>
              </div>

              {/* 2. REMAINING LEFT TO PAY CARD */}
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-indigo-200/80 hover:shadow-md hover:border-indigo-400 transition-all group relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Remaining Left</p>
                      <h4 className="text-lg font-black text-indigo-950 tracking-tight leading-tight mt-0.5 font-mono">
                        {leftDinar > 0 ? `IQD ${leftDinar.toLocaleString()}` : (leftUsd > 0 ? `$${leftUsd.toLocaleString()}` : '0 IQD')}
                        {leftDinar > 0 && leftUsd > 0 && (
                          <span className="text-xs font-bold text-indigo-700 ml-1 block sm:inline font-mono">+${leftUsd.toLocaleString()}</span>
                        )}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Small Noticeable Currency Convert Badge */}
                <div className="my-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-indigo-100/90 text-indigo-800 border border-indigo-300 shadow-2xs">
                    <span className="material-symbols-outlined text-[12px] text-indigo-600">currency_exchange</span>
                    ≈ ${leftTotalEquivUsd.toLocaleString()} USD
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({notYetCount + stoppedCount} Remaining)
                  </span>
                </div>

                {/* Unpaid & Stopped Pills */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] flex-wrap">
                  <span className="inline-flex items-center gap-1 text-slate-700 font-bold font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {notYetCount} Unpaid
                  </span>
                  {stoppedCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-800 font-bold font-mono bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      {stoppedCount} Stopped
                    </span>
                  )}
                </div>
              </div>

              {/* 3. DEDUCTIONS & SEARCH FEES POOL */}
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-amber-200/80 hover:shadow-md hover:border-amber-400 transition-all group relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[18px]">savings</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Deductions &amp; Fees</p>
                      <h4 className="text-lg font-black text-amber-950 tracking-tight leading-tight mt-0.5 font-mono">
                        IQD {totalDeductionsEquivIqd.toLocaleString()}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Small Noticeable Currency Convert Badge */}
                <div className="my-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-amber-100/90 text-amber-900 border border-amber-300 shadow-2xs">
                    <span className="material-symbols-outlined text-[12px] text-amber-700">currency_exchange</span>
                    ≈ ${totalDeductionsEquivUsd.toLocaleString()} USD
                  </span>
                </div>

                {/* Deductions Breakdown Mini-Bar */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-600">
                  <span title="Search Fee Total" className="text-amber-800 font-bold">Search: {totalSearchFeeIqd.toLocaleString()}</span>
                  <span title="Arrival Fee (0.05) Total" className="text-rose-700 font-bold">Arrival: {totalArrivalFeeIqd.toLocaleString()}</span>
                </div>
              </div>

              {/* 4. WORKFORCE & EXCHANGE PEG */}
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 hover:shadow-md hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-teal-700 text-white flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[18px]">groups</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Workforce &amp; Peg</p>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                        {employees.length} Staff Members
                      </h4>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-bold font-mono text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200">
                    1$={usdRate.toLocaleString()}
                  </span>
                </div>

                <div className="my-1.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-teal-50 text-teal-800 border border-teal-200">
                    🌍 {foreignCount} Foreign ($)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-slate-100 text-slate-700 border border-slate-200">
                    🏛️ {localCount} Local (IQD)
                  </span>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Cycle: {activePeriod.name}</span>
                  <span className="text-primary font-bold">{filteredEmployees.length} Visible</span>
                </div>
              </div>

            </div>

            {/* Search and Filters Bar */}
            <div className="bg-white rounded-xl shadow-2xs p-3 flex flex-col md:flex-row gap-3 items-center border border-slate-200/80">
              {/* Fluid Left Search Bar */}
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
                  placeholder="Search by employee name, ID, department, salary amount, or status..."
                  type="text"
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

                {(search || stateFilter || deptFilter || foreignFilter || sortField) && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStateFilter('');
                      setDeptFilter('');
                      setForeignFilter('');
                      setSortField(null);
                      setSortOrder('asc');
                      setPage(1);
                    }}
                    className="text-xs text-primary font-bold hover:underline px-2 cursor-pointer flex items-center gap-1"
                    title="Clear search, filters, and active sort order"
                  >
                    <span className="material-symbols-outlined text-[13px]">restart_alt</span>
                    Reset
                  </button>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono shrink-0">
                {sortField && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px] border border-primary/20">
                    <span className="material-symbols-outlined text-[13px]">
                      {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                    Sorted: {sortField} ({sortOrder === 'asc' ? 'Asc' : 'Desc'})
                    <button
                      onClick={() => setSortField(null)}
                      className="ml-0.5 hover:text-slate-900"
                      title="Clear sort"
                    >
                      ×
                    </button>
                  </span>
                )}
                <span>{paginatedEmployees.length} of {sortedEmployees.length} records</span>
              </div>
            </div>

            {/* Table with Status-Colored Borders and Center Alignments */}
            <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden flex flex-col w-full">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                      {/* ID */}
                      <th
                        onClick={() => handleSort('id')}
                        className={`py-3 px-3 text-center w-[95px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'id' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort by ID (Ascending / Descending)"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span>ID</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'id' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'id' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* EMPL NAME */}
                      <th
                        onClick={() => handleSort('name')}
                        className={`py-3 px-3 text-left min-w-[180px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'name' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort alphabetically by Name (A-Z / Z-A)"
                      >
                        <div className="inline-flex items-center justify-start gap-1">
                          <span>Empl Name</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'name' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'name' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* STATUS (Foreign / Local) */}
                      <th
                        onClick={() => handleSort('isForeign')}
                        className={`py-3 px-2 text-center w-[95px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'isForeign' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort by Status / Currency (Foreign USD vs Local Dinar)"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span>Status</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'isForeign' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'isForeign' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* BASE SALARY */}
                      <th
                        onClick={() => handleSort('baseSalary')}
                        className={`py-3 px-2 text-center min-w-[130px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'baseSalary' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort numerically by Base Salary"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span>Base Salary</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'baseSalary' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'baseSalary' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* ARRIVAL (0.05) */}
                      <th
                        onClick={() => handleSort('recruitmentFee')}
                        className={`py-3 px-2 text-center w-[120px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'recruitmentFee' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort by Arrival Fee deduction"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span>Arrival (0.05)</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'recruitmentFee' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'recruitmentFee' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* BONUS */}
                      <th
                        onClick={() => handleSort('bonus')}
                        className={`py-3 px-2 text-center w-[95px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'bonus' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort numerically by Bonus amount"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span>Bonus</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'bonus' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'bonus' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* INSURANCE */}
                      <th
                        onClick={() => handleSort('insurance')}
                        className={`py-3 px-2 text-center w-[95px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'insurance' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort numerically by Insurance contribution"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span>Insurance</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'insurance' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'insurance' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* ABSENCE */}
                      <th
                        onClick={() => handleSort('absenceDeduction')}
                        className={`py-3 px-2 text-center w-[110px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'absenceDeduction' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort by Absence deduction"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span>Absence</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'absenceDeduction' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'absenceDeduction' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* SEARCH FEE */}
                      <th
                        onClick={() => handleSort('searchingDocFee')}
                        className={`py-3 px-2 text-center w-[110px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'searchingDocFee' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort numerically by Search Document Fee"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span>Search Fee</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'searchingDocFee' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'searchingDocFee' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* THE NET SALARY (PAYOUT) */}
                      <th
                        onClick={() => handleSort('netSalary')}
                        className={`py-3 px-3 text-center bg-slate-100/70 min-w-[210px] select-none cursor-pointer transition-colors hover:bg-slate-200/80 ${
                          sortField === 'netSalary' ? 'bg-primary/10 text-primary' : ''
                        }`}
                        title="Click to sort numerically by Net Salary Payout"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span className="font-black">The Net Salary (Payout)</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'netSalary' ? 'text-primary font-black' : 'text-slate-400'
                          }`}>
                            {sortField === 'netSalary' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* STATE */}
                      <th
                        onClick={() => handleSort('salaryState')}
                        className={`py-3 px-2 text-center w-[75px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'salaryState' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort by State (Paid / Not Yet / Stopped)"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span>State</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'salaryState' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'salaryState' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* PAID DATE & TIME */}
                      <th
                        onClick={() => handleSort('paidAt')}
                        className={`py-3 px-3 text-center min-w-[145px] select-none cursor-pointer transition-colors hover:bg-slate-100 ${
                          sortField === 'paidAt' ? 'bg-primary/5 text-primary' : ''
                        }`}
                        title="Click to sort chronologically by Paid Date & Time"
                      >
                        <div className="inline-flex items-center justify-center gap-1 w-full">
                          <span>Paid Date &amp; Time</span>
                          <span className={`material-symbols-outlined text-[14px] ${
                            sortField === 'paidAt' ? 'text-primary font-black' : 'text-slate-300'
                          }`}>
                            {sortField === 'paidAt' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>

                      {/* ACTIONS */}
                      <th className="py-3 px-3 text-center w-[90px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-16 px-4 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-1">
                              <span className="material-symbols-outlined text-[32px]">folder_open</span>
                            </div>
                            <h4 className="text-base font-black text-slate-900">Roster is Empty (0 Employees)</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              No employees in the database. Upload your Excel spreadsheet workbook with college paper sheets to import staff.
                            </p>
                            <div className="flex items-center gap-2.5 mt-3">
                              <Link
                                href="/excel-import"
                                className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-95 flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                                Go to Excel Import
                              </Link>
                              <button
                                onClick={() => setIsAddEmployeeModalOpen(true)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">person_add</span>
                                Add Single Employee
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedEmployees.map((emp) => {
                        const isPaid = emp.salaryState === 'Paid';
                        const isStopped = emp.salaryState === 'Stopped';
                        const isForeign = Boolean(emp.isForeign);
                        const currSymbol = isForeign ? '$' : 'IQD ';

                        // Foreign clean dollar & remainder dinar calculation
                        const cleanDollars = Math.floor(emp.netSalary / 100) * 100;
                        const remainderDollars = emp.netSalary % 100;
                        const remainderDinar = remainderDollars * usdRate;

                        // Row Border & Tint Styling
                        const rowBorderClass = isPaid
                          ? 'border-l-[4px] border-l-emerald-500 bg-emerald-50/[0.04] hover:bg-emerald-50/[0.15]'
                          : isStopped
                            ? 'border-l-[4px] border-l-rose-500 bg-rose-50/[0.30] hover:bg-rose-50/[0.45]'
                            : 'border-l-[4px] border-l-slate-300 bg-white hover:bg-slate-50/80';

                        // Dynamic status-colored border for compensation cards
                        const cellBorderClass = isPaid
                          ? 'border-2 border-emerald-300 bg-white shadow-2xs group-hover:border-emerald-500'
                          : isStopped
                            ? 'border-2 border-rose-300 bg-white shadow-2xs group-hover:border-rose-500'
                            : 'border-2 border-slate-200 bg-white shadow-2xs group-hover:border-slate-400';

                        return (
                          <tr
                            key={emp.id}
                            className={`group transition-all duration-150 ease-out hover:-translate-y-[1px] hover:shadow-xs ${rowBorderClass}`}
                          >
                            {/* ID (Centered) */}
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                              <span className="bg-slate-100 px-2 py-1 rounded-md text-primary text-xs border border-slate-200">
                                {emp.id}
                              </span>
                            </td>

                            {/* Employee Name (Left-aligned) */}
                            <td className="py-3 px-3 text-left">
                              <div
                                onClick={() => setSelectedEmployee(emp)}
                                className="flex items-start gap-2.5 cursor-pointer"
                              >
                                <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 transition-transform duration-200 group-hover:scale-105 mt-0.5 ${isStopped
                                    ? 'bg-gradient-to-br from-rose-600 to-red-700'
                                    : isForeign
                                      ? 'bg-gradient-to-br from-teal-600 to-cyan-700'
                                      : 'bg-primary-container'
                                  }`}>
                                  {emp.initials}
                                </div>
                                <div className="leading-tight">
                                  <p className="font-semibold text-slate-800 text-sm group-hover:text-primary transition-colors whitespace-nowrap">
                                    {emp.name}
                                  </p>
                                  <p className="text-xs text-slate-400 font-mono whitespace-nowrap">{emp.department}</p>

                                  {/* Stopped indicator */}
                                  {isStopped && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100/90 border border-rose-300/80 px-1.5 py-0.5 rounded-md mt-1 shadow-2xs whitespace-nowrap">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                      Salary Stopped (This Month)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Status / Currency (Centered) */}
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <button
                                onClick={() => {
                                  const nextForeign = !emp.isForeign;
                                  updateEmployee(emp.id, {
                                    isForeign: nextForeign,
                                    currency: nextForeign ? 'USD' : 'Dinar',
                                  });
                                  showToast('Currency Updated', `${emp.name} set to ${nextForeign ? 'Foreign (USD $)' : 'Local (Dinar)'}.`);
                                }}
                                title="Click to toggle Foreign (USD) / Local (Dinar)"
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${isForeign
                                    ? 'bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                  }`}
                              >
                                <span>{isForeign ? '🌍 USD' : '🏛️ IQD'}</span>
                              </button>
                            </td>

                            {/* Base Salary (Centered with Status Border Card) */}
                            <td className="py-3 px-2 font-mono text-slate-800 font-semibold text-center whitespace-nowrap">
                              <div className={`inline-flex flex-col items-center justify-center rounded-xl py-1.5 px-3 min-w-[110px] transition-all ${cellBorderClass}`}>
                                <span className={`text-sm font-bold ${isStopped ? 'text-slate-500' : 'text-slate-900'}`}>
                                  {currSymbol}{emp.baseSalary.toLocaleString()}
                                </span>
                                {isForeign && (
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    ≈ IQD {(emp.baseSalary * usdRate).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Arrival Fee (0.05) (Centered) */}
                            <td className="py-3 px-2 text-center font-mono whitespace-nowrap">
                              <button
                                onClick={() => {
                                  const nextFee = !emp.hasRecruitmentFee;
                                  updateEmployee(emp.id, {
                                    hasRecruitmentFee: nextFee,
                                    recruitmentFee: nextFee ? Number(emp.baseSalary) * 0.05 : 0,
                                  });
                                  showToast('Arrival Fee Updated', `${emp.name} arrival fee set to ${nextFee ? '5% deduction' : 'None'}.`);
                                }}
                                title="Click to toggle Arrival Agency Fee (0.05 deduction)"
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${emp.hasRecruitmentFee
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                                  }`}
                              >
                                {emp.hasRecruitmentFee ? (
                                  <span>-5% ({currSymbol}{(emp.recruitmentFee || 0).toLocaleString()})</span>
                                ) : (
                                  <span>-</span>
                                )}
                              </button>
                            </td>

                            {/* Bonus / Bounce (Centered with Status Border Card) */}
                            <td className="py-3 px-2 font-mono text-center whitespace-nowrap">
                              <div className={`inline-flex flex-col items-center justify-center rounded-xl py-1.5 px-3 min-w-[80px] transition-all ${cellBorderClass}`}>
                                {emp.bonus > 0 ? (
                                  <>
                                    <span className="text-emerald-600 font-bold text-sm">+{currSymbol}{emp.bonus.toLocaleString()}</span>
                                    {isForeign && (
                                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        ≈ IQD {Math.round(emp.bonus * usdRate).toLocaleString()}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-300 font-bold text-xs">-</span>
                                )}
                              </div>
                            </td>

                            {/* Insurance / Insu (Centered with Status Border Card) */}
                            <td className="py-3 px-2 font-mono text-center whitespace-nowrap">
                              <div className={`inline-flex flex-col items-center justify-center rounded-xl py-1.5 px-3 min-w-[80px] transition-all ${cellBorderClass}`}>
                                {emp.insurance > 0 ? (
                                  <>
                                    <span className="text-rose-600 font-bold text-sm">-{currSymbol}{emp.insurance.toLocaleString()}</span>
                                    {isForeign && (
                                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        ≈ IQD {Math.round(emp.insurance * usdRate).toLocaleString()}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-300 font-bold text-xs">-</span>
                                )}
                              </div>
                            </td>

                            {/* Absence / Abs (Noticeable Days by default, Deduction Amount on hover) */}
                            <td className="py-3 px-2 font-mono text-center whitespace-nowrap">
                              {emp.absenceDays > 0 ? (
                                <div className="relative group/abs cursor-help inline-flex">
                                  <div className={`inline-flex flex-col items-center justify-center rounded-xl py-1.5 px-3 min-w-[90px] transition-all hover:bg-rose-50/50 ${cellBorderClass}`}>
                                    <span className="text-rose-600 font-black text-sm font-mono flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[15px]">event_busy</span>
                                      {emp.absenceDays} {emp.absenceDays === 1 ? 'Day' : 'Days'}
                                    </span>
                                    {isForeign && (
                                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        ≈ IQD {Math.round(emp.absenceDeduction * usdRate).toLocaleString()}
                                      </span>
                                    )}
                                  </div>

                                  {/* Hover Tooltip showing deduction amount */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/abs:flex flex-col items-center z-50 pointer-events-none animate-fade-in w-52">
                                    <div className="bg-slate-900 text-white text-xs font-sans rounded-xl py-2.5 px-3 shadow-2xl border border-slate-700 text-center leading-tight">
                                      <p className="font-bold text-rose-300 flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">trending_down</span>
                                        Absence Deduction
                                      </p>
                                      <p className="text-white text-sm font-black mt-1 font-mono">
                                        -{currSymbol}{emp.absenceDeduction.toLocaleString()}
                                      </p>
                                      <p className="text-slate-400 text-[10px] mt-0.5 font-mono">
                                        {emp.absenceDays} {emp.absenceDays === 1 ? 'day' : 'days'} × {currSymbol}{Math.round(emp.baseSalary / 30).toLocaleString()}/day
                                      </p>
                                    </div>
                                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                                  </div>
                                </div>
                              ) : (
                                <div className={`inline-flex items-center justify-center rounded-xl py-1.5 px-3 min-w-[90px] transition-all ${cellBorderClass}`}>
                                  <span className="text-slate-300 font-bold text-xs">-</span>
                                </div>
                              )}
                            </td>

                            {/* Searching Doc Fee (Centered) */}
                            <td className="py-3 px-2 font-mono text-center whitespace-nowrap">
                              <div className={`inline-flex flex-col items-center justify-center rounded-xl py-1.5 px-3 min-w-[80px] transition-all ${cellBorderClass}`}>
                                {(emp.searchingDocFee || 0) > 0 ? (
                                  <>
                                    <span className="text-amber-700 font-bold text-sm">-{currSymbol}{(emp.searchingDocFee || 0).toLocaleString()}</span>
                                    {isForeign && (
                                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        ≈ IQD {(emp.searchingDocFeeIqd || Math.round((emp.searchingDocFee || 0) * usdRate)).toLocaleString()}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-300 font-bold text-xs">-</span>
                                )}
                              </div>
                            </td>

                            {/* The Net Salary (Payout) - Status Border Card */}
                            <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                              <div className={`inline-flex flex-col items-center justify-center rounded-xl py-1.5 px-3 min-w-[160px] transition-all ${cellBorderClass}`}>
                                {isStopped ? (
                                  <div className="flex flex-col items-center justify-center leading-tight">
                                    <span className="text-slate-400 line-through text-xs font-mono">
                                      {currSymbol}{emp.netSalary.toLocaleString()}
                                    </span>
                                    <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[11px] font-bold mt-1 shadow-2xs">
                                      ⛔ Withheld
                                    </span>
                                  </div>
                                ) : isForeign ? (
                                  <div className="flex flex-col items-center justify-center leading-tight">
                                    {/* Prominent Large Net Salary on Top */}
                                    <span className="text-[17px] font-black tracking-tight text-primary font-mono leading-none">
                                      ${emp.netSalary.toLocaleString()}
                                    </span>

                                    {/* Clean Cash + Remainder Dinar Below */}
                                    <div className="flex items-center justify-center gap-1.5 mt-1.5 pt-1 border-t border-slate-100 w-full">
                                      <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-800 font-bold font-mono">
                                        ${cleanDollars.toLocaleString()}
                                      </span>

                                      {remainderDollars > 0 && (
                                        <div className="relative group/tip cursor-help">
                                          <span className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            +{remainderDinar.toLocaleString()} IQD
                                          </span>

                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex flex-col items-center z-50 pointer-events-none animate-fade-in w-60">
                                            <div className="bg-slate-900 text-white text-xs font-sans rounded-xl py-2 px-3 shadow-2xl border border-slate-700 text-center leading-tight">
                                              <p className="font-bold text-amber-300 flex items-center justify-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">currency_exchange</span>
                                                ${remainderDollars.toLocaleString()} Converted to Dinar
                                              </p>
                                              <p className="text-slate-300 text-[11px] mt-1 font-mono">
                                                ${remainderDollars} × {usdRate.toLocaleString()} = <strong className="text-white">{remainderDinar.toLocaleString()} Dinar</strong>
                                              </p>
                                            </div>
                                            <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                                    <span className="text-[17px] font-black tracking-tight text-primary font-mono">
                                      IQD {emp.netSalary.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* State of Salary (Icon Only, Centered) */}
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleStateButtonClick(emp)}
                                title={
                                  isPaid
                                    ? 'Paid: Click to modify status (Alert confirmation)'
                                    : isStopped
                                      ? 'Stopped: Click to unfreeze status'
                                      : 'Unpaid: Click to mark as Paid'
                                }
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs ${isPaid
                                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-300'
                                    : isStopped
                                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300'
                                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-300 hover:text-slate-600'
                                  }`}
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {isPaid ? 'check_circle' : isStopped ? 'block' : 'radio_button_unchecked'}
                                </span>
                              </button>
                            </td>

                            {/* Date & Time Paid (Centered) */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {isStopped ? (
                                <div className="inline-flex items-center gap-1 text-rose-700 font-semibold text-xs bg-rose-100/70 border border-rose-200 px-2 py-0.5 rounded-md">
                                  <span className="material-symbols-outlined text-[14px] text-rose-600">pause_circle</span>
                                  <span>Paused for Month</span>
                                </div>
                              ) : emp.paidAt ? (
                                <div className="flex flex-col items-center justify-center leading-tight">
                                  <div className="flex items-center gap-1 text-slate-800 font-semibold text-xs">
                                    <span className="material-symbols-outlined text-[14px] text-emerald-600">event</span>
                                    <span>{emp.paidAt.split(' ').slice(0, 3).join(' ')}</span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {emp.paidAt.split(' ').slice(3).join(' ')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-xs">-- Not Paid --</span>
                              )}
                            </td>

                            {/* Actions (Centered) */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setSelectedEmployee(emp)}
                                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="View Details"
                                >
                                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                                </button>
                                <button
                                  onClick={() => setEditingEmployee(emp)}
                                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Compensation"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                  onClick={() => setEmployeeToDelete(emp)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Record"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination & Page-Size Controls Footer */}
              <div className="p-4 border-t border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono">

                {/* Left: Records Per Page Selector (5, 10, 20, 50, 100, All, Custom) */}
                {(() => {
                  const hasData = filteredEmployees.length > 0;
                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wider select-none">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">tune</span>
                        <span>Show:</span>
                      </div>

                      <div className={`flex items-center p-1 rounded-2xl border transition-all ${hasData
                          ? 'bg-slate-100/90 border-slate-200/90 shadow-2xs gap-0.5'
                          : 'bg-slate-50 border-slate-200/60 opacity-40 cursor-not-allowed pointer-events-none gap-0.5'
                        }`}>
                        {(['5', '10', '20', '50', '100', 'all'] as const).map((mode) => {
                          const isActive = pageSizeMode === mode && !isCustomInputOpen;
                          return (
                            <button
                              key={mode}
                              type="button"
                              disabled={!hasData}
                              onClick={() => {
                                if (!hasData) return;
                                setPageSizeMode(mode);
                                setIsCustomInputOpen(false);
                                setPage(1);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 ${isActive
                                  ? 'bg-primary text-white shadow-xs font-black scale-[1.02]'
                                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/90 cursor-pointer active:scale-95'
                                } ${!hasData ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              {mode === 'all' ? 'All' : mode}
                            </button>
                          );
                        })}

                        {/* Custom Option */}
                        <button
                          type="button"
                          disabled={!hasData}
                          onClick={() => {
                            if (!hasData) return;
                            setPageSizeMode('custom');
                            setIsCustomInputOpen(true);
                            setPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 ${(pageSizeMode === 'custom' || isCustomInputOpen) && hasData
                              ? 'bg-primary text-white shadow-xs font-black scale-[1.02]'
                              : 'text-slate-600 hover:text-slate-950 hover:bg-white/90 cursor-pointer active:scale-95'
                            } ${!hasData ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          Custom
                        </button>
                      </div>

                      {/* Custom Input Field (Shows when Custom is selected and has data) */}
                      {hasData && (pageSizeMode === 'custom' || isCustomInputOpen) && (
                        <div className="flex items-center gap-1.5 bg-white border-2 border-primary rounded-2xl px-3 py-1 shadow-xs ring-2 ring-primary/10 animate-fade-in">
                          <span className="material-symbols-outlined text-[15px] text-primary">edit_attributes</span>
                          <input
                            type="number"
                            min="1"
                            max="5000"
                            value={customPageSize}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setCustomPageSize(val);
                              setPageSizeMode('custom');
                              setPage(1);
                            }}
                            className="w-12 text-center font-black text-xs outline-none text-primary"
                            placeholder="Qty"
                            autoFocus
                          />
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">rows</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Center: Showing Range Summary */}
                <div className="text-slate-500 text-xs">
                  {filteredEmployees.length === 0 ? (
                    <span className="text-slate-400 italic">No records available</span>
                  ) : (
                    <span>
                      Showing <strong className="text-slate-900 font-bold">{startIndex + 1}</strong>–<strong className="text-slate-900 font-bold">{endIndex}</strong> of <strong className="text-slate-900 font-bold">{filteredEmployees.length}</strong> staff
                    </span>
                  )}
                </div>

                {/* Right: Page Navigation (Prev, Pages, Next) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={!mounted || page <= 1 || filteredEmployees.length === 0}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    Prev
                  </button>

                  <div className="flex gap-1 items-center">
                    {totalPages <= 7 ? (
                      Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((p) => {
                        const isCurrent = mounted && page === p && filteredEmployees.length > 0;
                        return (
                          <button
                            key={p}
                            type="button"
                            disabled={filteredEmployees.length === 0}
                            onClick={() => setPage(p)}
                            className={`w-7 h-7 rounded-lg font-bold text-xs transition-all border ${isCurrent
                                ? 'bg-primary text-white border-primary shadow-2xs cursor-default'
                                : filteredEmployees.length === 0
                                  ? 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed'
                                  : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                              }`}
                          >
                            {p}
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                        <span>Page {page} of {totalPages}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={!mounted || page >= totalPages || filteredEmployees.length === 0}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    Next
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CONFIRMATION ALERT MODAL: Changing State from PAID */}
            {confirmStateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
                <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-slate-200 relative animate-scale-up">
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-md shrink-0 border border-amber-200">
                      <span className="material-symbols-outlined text-[26px]">warning</span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">Confirm Status Modification</h3>
                      <p className="text-xs text-slate-500 font-mono">Disbursement Ledger Alert</p>
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 mb-4 text-xs space-y-2 text-slate-700">
                    <p className="font-semibold text-slate-800">
                      <strong className="text-slate-900">{confirmStateModal.employee.name}</strong> ({confirmStateModal.employee.id}) is currently recorded as <strong className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">🟢 PAID</strong>.
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      Are you sure you want to change their salary state? This will remove their paid confirmation and modify their active payout records.
                    </p>
                  </div>

                  {/* Target State Selection */}
                  <div className="mb-5">
                    <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                      Select New Target Status:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmStateModal({ ...confirmStateModal, targetState: 'Not Yet' })}
                        className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${confirmStateModal.targetState === 'Not Yet'
                            ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">radio_button_unchecked</span>
                        ⚪ Set as Unpaid
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmStateModal({ ...confirmStateModal, targetState: 'Stopped' })}
                        className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${confirmStateModal.targetState === 'Stopped'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">block</span>
                        🔴 Set as Stopped
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setConfirmStateModal(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancel (Keep Paid)
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmStateChange}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Confirm Status Edit
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CONFIRMATION ALERT MODAL: DELETE EMPLOYEE */}
            {employeeToDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
                <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-rose-200 relative animate-scale-up">
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-md shrink-0 border border-rose-200">
                      <span className="material-symbols-outlined text-[28px]">delete_forever</span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">Confirm Record Deletion</h3>
                      <p className="text-xs text-rose-600 font-mono font-semibold">Irreversible Action</p>
                    </div>
                  </div>

                  <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 mb-5 text-xs space-y-2 text-slate-700">
                    <p className="font-semibold text-slate-800">
                      Are you sure you want to permanently delete <strong className="text-rose-900 font-bold">{employeeToDelete.name}</strong> ({employeeToDelete.id}) from the payroll system?
                    </p>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      This will remove all associated compensation breakdown, arrival fee data, and historical disbursement timestamps from the database.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEmployeeToDelete(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancel (Keep Record)
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Confirm Permanent Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CONFIRMATION ALERT MODAL: UPDATE EMPLOYEE */}
            {pendingUpdateConfirmation && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
                <div className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl border border-slate-200 relative animate-scale-up">
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-primary flex items-center justify-center shadow-md shrink-0 border border-blue-200">
                      <span className="material-symbols-outlined text-[28px]">fact_check</span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">Confirm Payroll Update</h3>
                      <p className="text-xs text-slate-500 font-mono">Apply Compensation Changes</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 text-xs space-y-2 text-slate-700">
                    <p className="font-semibold text-slate-800">
                      Are you sure you want to apply the updated payroll numbers and compensation breakdown for <strong className="text-primary font-bold">{pendingUpdateConfirmation.name}</strong> ({pendingUpdateConfirmation.id})?
                    </p>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      The ledger will immediately recalculate net pay, deductions, currency conversions, and update all dashboard statistics.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setPendingUpdateConfirmation(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Back to Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmUpdate}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:opacity-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Confirm &amp; Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* View Employee Details Modal */}
            {selectedEmployee && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
                <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>

                  <div className="flex items-center gap-3.5 mb-5">
                    <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold text-lg shadow-md ${selectedEmployee.salaryState === 'Stopped'
                        ? 'bg-gradient-to-br from-rose-600 to-red-700'
                        : 'bg-primary-container'
                      }`}>
                      {selectedEmployee.initials}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{selectedEmployee.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">
                        {selectedEmployee.id} • {selectedEmployee.department} • {selectedEmployee.isForeign ? '🌍 Foreign (USD)' : '🏛️ Local (Dinar)'}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const isFor = Boolean(selectedEmployee.isForeign);
                    const cleanUsd = Math.floor(selectedEmployee.netSalary / 100) * 100;
                    const remUsd = selectedEmployee.netSalary % 100;
                    const remDinar = remUsd * usdRate;

                    return (
                      <div className="space-y-2.5 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">Currency &amp; Nationality:</span>
                          <span className="font-bold text-slate-800">
                            {isFor ? 'Foreign Worker (Paid in USD $)' : 'Local Worker (Paid in Dinar IQD)'}
                          </span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">Base Salary:</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {isFor ? '$' : 'IQD '}{selectedEmployee.baseSalary.toLocaleString()}
                            {isFor && <span className="text-[10px] text-slate-400 font-normal"> (≈ IQD {(selectedEmployee.baseSalary * usdRate).toLocaleString()})</span>}
                          </span>
                        </div>

                        {selectedEmployee.hasRecruitmentFee && (
                          <div className="flex justify-between py-1 border-b border-slate-200 bg-rose-50 px-2 rounded">
                            <span className="text-rose-800 font-semibold">Arrival Company Fee (-0.05):</span>
                            <span className="font-bold text-rose-600 font-mono">
                              -{isFor ? '$' : 'IQD '}{(selectedEmployee.recruitmentFee || selectedEmployee.baseSalary * 0.05).toLocaleString()}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">Bonus:</span>
                          <span className="font-bold text-emerald-600 font-mono">
                            +{isFor ? '$' : 'IQD '}{(selectedEmployee.bonus || 0).toLocaleString()}
                            {isFor && (selectedEmployee.bonus || 0) > 0 && (
                              <span className="text-[10px] text-slate-400 font-normal ml-1">
                                (≈ IQD {Math.round((selectedEmployee.bonus || 0) * usdRate).toLocaleString()})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">Insurance Deduction:</span>
                          <span className="font-bold text-rose-600 font-mono">
                            -{isFor ? '$' : 'IQD '}{(selectedEmployee.insurance || 0).toLocaleString()}
                            {isFor && (selectedEmployee.insurance || 0) > 0 && (
                              <span className="text-[10px] text-slate-400 font-normal ml-1">
                                (≈ IQD {Math.round((selectedEmployee.insurance || 0) * usdRate).toLocaleString()})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">Search Fee:</span>
                          <span className="font-bold text-amber-700 font-mono">
                            {(selectedEmployee.searchingDocFee || 0) > 0 ? (
                              <>
                                -{isFor ? '$' : 'IQD '}{(selectedEmployee.searchingDocFee || 0).toLocaleString()}
                                {isFor && (
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                                    (≈ IQD {(selectedEmployee.searchingDocFeeIqd || Math.round((selectedEmployee.searchingDocFee || 0) * usdRate)).toLocaleString()})
                                  </span>
                                )}
                              </>
                            ) : 'None (0)'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">Absence:</span>
                          <span className="font-bold text-rose-600 font-mono">
                            {selectedEmployee.absenceDays} days (-{isFor ? '$' : 'IQD '}{(selectedEmployee.absenceDeduction || 0).toLocaleString()})
                          </span>
                        </div>

                        {/* Foreign Split Cash Breakdown Box */}
                        {isFor ? (
                          <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl space-y-2 mt-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-primary text-xs">Total Net Salary:</span>
                              <span className="text-lg font-black text-primary font-mono">
                                ${selectedEmployee.netSalary.toLocaleString()}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-primary/20">
                              <div className="bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-[9px] font-bold text-primary uppercase block">Clean Dollars ($100s)</span>
                                <span className="text-sm font-bold text-slate-800 font-mono block mt-0.5">
                                  ${cleanUsd.toLocaleString()}
                                </span>
                              </div>

                              <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                                <span className="text-[9px] font-bold text-amber-800 uppercase block">Remainder in Dinar</span>
                                <span className="text-sm font-bold text-amber-800 font-mono block mt-0.5">
                                  {remDinar.toLocaleString()} IQD
                                </span>
                                <span className="text-[9px] text-amber-700 block">(${remUsd} × {usdRate})</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between py-1.5 border-b border-slate-200 bg-white px-2.5 rounded-lg">
                            <span className="font-bold text-slate-800">The Net Salary:</span>
                            <span className="text-base font-black text-primary font-mono">
                              IQD {selectedEmployee.netSalary.toLocaleString()}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between py-1.5 border-b border-slate-200">
                          <span className="text-slate-500">Salary State:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${selectedEmployee.salaryState === 'Paid'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : selectedEmployee.salaryState === 'Stopped'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                            {selectedEmployee.salaryState === 'Stopped' ? '🔴 Stopped (Withheld)' : selectedEmployee.salaryState}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Date &amp; Time Paid:</span>
                          <span className="font-mono text-slate-800 font-medium">
                            {selectedEmployee.paidAt || (selectedEmployee.salaryState === 'Stopped' ? 'Paused for Month' : 'Not Paid Yet')}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={() => setSelectedEmployee(null)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Employee Modal */}
            {editingEmployee && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
                <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
                  <button
                    onClick={() => setEditingEmployee(null)}
                    className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>

                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Edit Compensation Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mb-5">
                    Update salary, currency, foreign status, arrival fee, search fee, and deductions for {editingEmployee.name} ({editingEmployee.id}).
                  </p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const hasRecruitmentFee = Boolean(editingEmployee.hasRecruitmentFee);
                      const isForeign = Boolean(editingEmployee.isForeign);
                      let baseSalary = Number(editingEmployee.baseSalary) || 0;
                      if (!isForeign && baseSalary > 0 && baseSalary < 20000) {
                        baseSalary = baseSalary * 1000;
                      }

                      const processAmount = (valInput: number | string): number => {
                        if (typeof valInput === 'number') {
                          return isNaN(valInput) ? 0 : Math.max(0, valInput);
                        }
                        const str = String(valInput || '').trim();
                        if (!str) return 0;
                        const isExplicitDollar = str.includes('$') || /usd/i.test(str);
                        const isExplicitIqd = str.includes('iqd') || /dinar/i.test(str);
                        const sanitized = str.replace(/[$€£¥,]/g, '').replace(/(usd|iqd|dinar)/gi, '').trim();
                        let val = parseFloat(sanitized) || 0;
                        if (val <= 0) return 0;

                        if (!isForeign) {
                          if (val > 0 && val < 1000) {
                            val = val * 1000;
                          }
                          return val;
                        } else {
                          if (isExplicitDollar) {
                            return val;
                          }
                          if (isExplicitIqd || val >= 1000) {
                            return Math.round((val / usdRate) * 100) / 100;
                          }
                          return val;
                        }
                      };

                      const recruitmentFee = hasRecruitmentFee ? baseSalary * 0.05 : 0;
                      const searchingDocFee = processAmount(editingEmployee.searchingDocFee || 0);
                      const bonus = processAmount(editingEmployee.bonus || 0);
                      const insurance = processAmount(editingEmployee.insurance || 0);
                      const absenceDeduction = processAmount(editingEmployee.absenceDeduction || 0);

                      // Trigger confirmation modal before applying update
                      setPendingUpdateConfirmation({
                        id: editingEmployee.id,
                        name: editingEmployee.name,
                        updates: {
                          name: editingEmployee.name,
                          baseSalary,
                          searchingDocFee,
                          bonus,
                          insurance,
                          absenceDays: Number(editingEmployee.absenceDays),
                          absenceDeduction,
                          isForeign,
                          currency: isForeign ? 'USD' : 'Dinar',
                          hasRecruitmentFee,
                          recruitmentFee,
                          salaryState: editingEmployee.salaryState,
                          paidAt: editingEmployee.salaryState === 'Paid'
                            ? (editingEmployee.paidAt || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
                            : undefined,
                        }
                      });
                    }}
                    className="space-y-3.5 text-xs"
                  >
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Employee Name
                      </label>
                      <input
                        type="text"
                        value={editingEmployee.name}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Foreign & Arrival Fee Checks */}
                    <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(editingEmployee.isForeign)}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, isForeign: e.target.checked })}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="font-semibold text-slate-800">Foreign (USD $)</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(editingEmployee.hasRecruitmentFee)}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, hasRecruitmentFee: e.target.checked })}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="font-semibold text-slate-800">Arrival Fee (0.05)</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Base Salary ({editingEmployee.isForeign ? 'USD $' : 'IQD'})
                        </label>
                        <input
                          type="number"
                          value={editingEmployee.baseSalary}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, baseSalary: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        {!editingEmployee.isForeign && editingEmployee.baseSalary > 0 && editingEmployee.baseSalary < 20000 && (
                          <p className="text-[10px] text-amber-700 font-mono mt-0.5">
                            Auto-scale &lt; 20k ×1,000: <strong>{(editingEmployee.baseSalary * 1000).toLocaleString()} IQD</strong>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Bonus ({editingEmployee.isForeign ? '$' : 'IQD'})
                        </label>
                        <input
                          type="number"
                          value={editingEmployee.bonus}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, bonus: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Search Fee ({editingEmployee.isForeign ? '$' : 'IQD'})
                        </label>
                        <input
                          type="number"
                          value={editingEmployee.searchingDocFee || 0}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, searchingDocFee: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Insurance ({editingEmployee.isForeign ? '$' : 'IQD'})
                        </label>
                        <input
                          type="number"
                          value={editingEmployee.insurance}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, insurance: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Absence (Days)
                        </label>
                        <input
                          type="number"
                          value={editingEmployee.absenceDays}
                          onChange={(e) => {
                            const days = Number(e.target.value);
                            const effectiveBase = (!editingEmployee.isForeign && editingEmployee.baseSalary < 20000 && editingEmployee.baseSalary > 0)
                              ? editingEmployee.baseSalary * 1000
                              : editingEmployee.baseSalary;
                            const dayRate = Math.round(effectiveBase / 30);
                            setEditingEmployee({
                              ...editingEmployee,
                              absenceDays: days,
                              absenceDeduction: days * dayRate,
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Absence Deduct ({editingEmployee.isForeign ? '$' : 'IQD'})
                        </label>
                        <input
                          type="number"
                          value={editingEmployee.absenceDeduction}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, absenceDeduction: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        State of Salary
                      </label>
                      <select
                        value={editingEmployee.salaryState}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, salaryState: e.target.value as 'Paid' | 'Not Yet' | 'Stopped' })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      >
                        <option value="Paid">🟢 Paid</option>
                        <option value="Not Yet">⚪ Unpaid (Not Yet)</option>
                        <option value="Stopped">🔴 Stopped</option>
                      </select>
                    </div>

                    {/* Calculated Net Preview */}
                    {(() => {
                      const isFor = editingEmployee.isForeign;
                      let base = Number(editingEmployee.baseSalary) || 0;
                      if (!isFor && base > 0 && base < 20000) {
                        base = base * 1000;
                      }

                      const processAmount = (valInput: number | string): number => {
                        const str = String(valInput || '').trim();
                        const isExplicitDollar = str.includes('$') || /usd/i.test(str);
                        const sanitized = str.replace(/[$€£¥,]/g, '').replace(/(usd|iqd|dinar)/gi, '').trim();
                        let val = parseFloat(sanitized) || 0;
                        if (val <= 0) return 0;

                        if (!isFor) {
                          if (val > 0 && val < 1000) {
                            val = val * 1000;
                          }
                          return val;
                        } else {
                          if (isExplicitDollar) {
                            return val;
                          }
                          let dinarVal = val;
                          if (dinarVal > 0 && dinarVal < 1000) {
                            dinarVal = dinarVal * 1000;
                          }
                          return Math.round((dinarVal / usdRate) * 100) / 100;
                        }
                      };

                      const recFee = editingEmployee.hasRecruitmentFee ? base * 0.05 : 0;
                      const effBase = base - recFee;
                      const docFee = processAmount(editingEmployee.searchingDocFee || 0);
                      const bonusVal = processAmount(editingEmployee.bonus || 0);
                      const insVal = processAmount(editingEmployee.insurance || 0);
                      const absVal = processAmount(editingEmployee.absenceDeduction || 0);
                      const calculatedNet = Math.max(0, effBase + bonusVal - insVal - absVal - docFee);
                      const cleanUsd = Math.floor(calculatedNet / 100) * 100;
                      const remUsd = calculatedNet % 100;
                      const remDinar = remUsd * usdRate;

                      return (
                        <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 border border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-700">Calculated Net:</span>
                            <span className="text-sm font-bold text-primary font-mono">
                              {isFor ? '$' : 'IQD '}{calculatedNet.toLocaleString()}
                            </span>
                          </div>
                          {isFor && (
                            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200 text-[10px]">
                              <div className="bg-white p-1.5 rounded border border-slate-200">
                                <span className="text-primary font-bold block uppercase">Clean Cash</span>
                                <span className="font-bold text-slate-800 font-mono">${cleanUsd.toLocaleString()}</span>
                              </div>
                              <div className="bg-amber-50 p-1.5 rounded border border-amber-200">
                                <span className="text-amber-800 font-bold block uppercase">Remainder Dinar</span>
                                <span className="font-bold text-amber-800 font-mono">{remDinar.toLocaleString()} IQD</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setEditingEmployee(null)}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-primary hover:opacity-95 text-white font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
