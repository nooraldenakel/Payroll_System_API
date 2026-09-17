import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { PayrollPeriod, Employee, ReportSummary } from '../types';
import { formatMoney } from '../services/api';
import { SalaryVoucherModal } from '../components/SalaryVoucherModal';

interface ReportsViewProps {
  periods: PayrollPeriod[];
  activePeriod: PayrollPeriod | null;
  employees: Employee[];
  reportSummary: ReportSummary | null;
  currency?: 'IQD' | 'USD';
  rate?: number;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onSelectPeriod?: (period: PayrollPeriod) => void;
}

type SortField = 'id' | 'name' | 'workforce' | 'baseSalary' | 'netSalary' | 'state' | 'disbursedAt';

export const ReportsView: React.FC<ReportsViewProps> = ({
  periods,
  activePeriod,
  employees,
  currency = 'IQD',
  rate = 1310,
  onExportPdf,
  onExportExcel,
  onSelectPeriod,
}) => {
  const currentPeriod = activePeriod || periods[0] || null;

  // Filter & Search state
  const [search, setSearch] = useState('');
  const [selectedWorkforce, setSelectedWorkforce] = useState('ALL');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Voucher modal & hover tooltip state
  const [selectedVoucherEmployee, setSelectedVoucherEmployee] = useState<Employee | null>(null);
  const [hoveredVoucherId, setHoveredVoucherId] = useState<string | null>(null);

  // Helper: auto format numbers with up to 2 decimal places if needed
  const formatNumberAuto = (num: number) => {
    if (!num || isNaN(num)) return '0';
    const hasDecimals = num % 1 !== 0;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: hasDecimals ? 1 : 0,
      maximumFractionDigits: 2,
    });
  };

  // Helper: convert IQD to USD badge
  const formatUsdBadge = (iqdAmount: number) => {
    const usd = iqdAmount / (rate || 1310);
    return `= $${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  // Extract clean integer ID from employee code or fallback to index
  const getDisplayId = (emp: Employee, index: number) => {
    const match = emp.employeeCode?.match(/\d+/);
    return match ? parseInt(match[0], 10) : index + 1;
  };

  // Metrics computation from active employees list
  const paidEmployees = useMemo(() => employees.filter((e) => e.paymentStatus === 'PAID'), [employees]);
  const unpaidEmployees = useMemo(() => employees.filter((e) => e.paymentStatus === 'UNPAID'), [employees]);
  const stoppedEmployees = useMemo(() => employees.filter((e) => e.paymentStatus === 'STOPPED'), [employees]);

  const paidTotalIqd = useMemo(
    () => paidEmployees.reduce((acc, e) => acc + (e.currency === 'USD' ? (e.netSalary || 0) * rate : e.netSalary || 0), 0),
    [paidEmployees, rate]
  );
  const paidPercent = employees.length > 0 ? ((paidEmployees.length / employees.length) * 100).toFixed(1) : '0.0';

  const unpaidTotalIqd = useMemo(
    () => unpaidEmployees.reduce((acc, e) => acc + (e.currency === 'USD' ? (e.netSalary || 0) * rate : e.netSalary || 0), 0),
    [unpaidEmployees, rate]
  );
  const unpaidPercent = employees.length > 0 ? ((unpaidEmployees.length / employees.length) * 100).toFixed(1) : '0.0';

  const stoppedTotalIqd = useMemo(
    () => stoppedEmployees.reduce((acc, e) => acc + (e.currency === 'USD' ? (e.netSalary || 0) * rate : e.netSalary || 0), 0),
    [stoppedEmployees, rate]
  );

  const deductionsTotalIqd = useMemo(
    () =>
      employees.reduce(
        (acc, e) => {
          const isUsd = e.currency === 'USD' || e.isForeign;
          const arrival = isUsd ? (e.arrivalFee || 0) * rate : (e.arrivalFee || 0);
          const search = isUsd ? (e.searchFeeIqd || (e.searchFee || 0) * rate) : (e.searchFee || 0);
          const insurance = isUsd ? (e.insuranceIqd || (e.insurance || 0) * rate) : (e.insurance || 0);
          const absence = isUsd ? (e.absence || 0) * rate : (e.absence || 0);
          return acc + arrival + search + insurance + absence;
        },
        0
      ),
    [employees, rate]
  );

  const deductionsCount = useMemo(
    () =>
      employees.filter(
        (e) => (e.arrivalFee || 0) > 0 || (e.searchFee || 0) > 0 || (e.insurance || 0) > 0 || (e.absence || 0) > 0 || (e.deductions || 0) > 0
      ).length,
    [employees]
  );

  // Departments list for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Disbursement & Deductions Audit Matrix rows computation
  const matrixData = useMemo(() => {
    const buildRow = (title: string, list: Employee[], dotColor: string) => {
      const count = list.length;
      const iqdGross = list
        .filter((e) => e.currency !== 'USD' && !e.isForeign)
        .reduce((acc, e) => acc + (e.baseSalary || 0) + (e.bonus || 0) + (e.allowances || 0), 0);
      const usdGross = list
        .filter((e) => e.currency === 'USD' || e.isForeign)
        .reduce((acc, e) => acc + (e.baseSalary || 0) + (e.bonus || 0) + (e.allowances || 0), 0);

      const arrival = list.reduce((acc, e) => acc + (e.arrivalFee || 0), 0);
      const search = list.reduce((acc, e) => acc + (e.searchFee || 0), 0);
      const insurance = list.reduce((acc, e) => acc + (e.insurance || 0), 0);
      const absence = list.reduce((acc, e) => acc + (e.absence || 0), 0);
      const bonus = list.reduce((acc, e) => acc + (e.bonus || 0), 0);
      const netIqd = list.reduce(
        (acc, e) => acc + (e.currency === 'USD' ? (e.netSalary || 0) * rate : e.netSalary || 0),
        0
      );

      return {
        title,
        dotColor,
        count,
        iqdGross,
        usdGross,
        arrival,
        search,
        insurance,
        absence,
        bonus,
        netIqd,
      };
    };

    return [
      buildRow('Paid (Disbursed)', paidEmployees, 'bg-emerald-500'),
      buildRow('Unpaid (Pending)', unpaidEmployees, 'bg-amber-500'),
      buildRow('Stopped (Withheld)', stoppedEmployees, 'bg-rose-500'),
    ];
  }, [paidEmployees, unpaidEmployees, stoppedEmployees, rate]);

  // Matrix Total Summary
  const matrixTotal = useMemo(() => {
    const totalCount = employees.length;
    const iqdGross = employees
      .filter((e) => e.currency !== 'USD' && !e.isForeign)
      .reduce((acc, e) => acc + (e.baseSalary || 0) + (e.bonus || 0) + (e.allowances || 0), 0);
    const usdGross = employees
      .filter((e) => e.currency === 'USD' || e.isForeign)
      .reduce((acc, e) => acc + (e.baseSalary || 0) + (e.bonus || 0) + (e.allowances || 0), 0);

    const arrival = employees.reduce((acc, e) => acc + (e.arrivalFee || 0), 0);
    const search = employees.reduce((acc, e) => acc + (e.searchFee || 0), 0);
    const insurance = employees.reduce((acc, e) => acc + (e.insurance || 0), 0);
    const absence = employees.reduce((acc, e) => acc + (e.absence || 0), 0);
    const bonus = employees.reduce((acc, e) => acc + (e.bonus || 0), 0);
    const netIqd = employees.reduce(
      (acc, e) => acc + (e.currency === 'USD' ? (e.netSalary || 0) * rate : e.netSalary || 0),
      0
    );

    return {
      totalCount,
      iqdGross,
      usdGross,
      arrival,
      search,
      insurance,
      absence,
      bonus,
      netIqd,
    };
  }, [employees, rate]);

  // Filtered staff list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = emp.fullName?.toLowerCase().includes(q);
        const matchCode = emp.employeeCode?.toLowerCase().includes(q);
        const matchDept = emp.department?.toLowerCase().includes(q);
        const matchStatus = emp.paymentStatus?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDept && !matchStatus) return false;
      }

      // Workforce filter
      if (selectedWorkforce === 'DIRECT' && (emp.currency === 'USD' || emp.isForeign)) return false;
      if (selectedWorkforce === 'FOREIGN' && emp.currency !== 'USD' && !emp.isForeign) return false;

      // Salary State filter
      if (selectedState !== 'ALL' && emp.paymentStatus !== selectedState) return false;

      // Department filter
      if (selectedDept !== 'ALL' && emp.department !== selectedDept) return false;

      return true;
    });
  }, [employees, search, selectedWorkforce, selectedState, selectedDept]);

  // Sorted staff list
  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'id': {
          const idA = parseInt(a.employeeCode?.match(/\d+/)?.[0] || '0', 10);
          const idB = parseInt(b.employeeCode?.match(/\d+/)?.[0] || '0', 10);
          comparison = idA - idB;
          break;
        }
        case 'name':
          comparison = (a.fullName || '').localeCompare(b.fullName || '');
          break;
        case 'workforce': {
          const isA = a.currency === 'USD' || a.isForeign ? 1 : 0;
          const isB = b.currency === 'USD' || b.isForeign ? 1 : 0;
          comparison = isA - isB;
          break;
        }
        case 'baseSalary':
          comparison = (a.baseSalary || 0) - (b.baseSalary || 0);
          break;
        case 'netSalary':
          comparison = (a.netSalary || 0) - (b.netSalary || 0);
          break;
        case 'state':
          comparison = (a.paymentStatus || '').localeCompare(b.paymentStatus || '');
          break;
        case 'disbursedAt':
          comparison = (a.paidAt || '').localeCompare(b.paidAt || '');
          break;
        default:
          comparison = 0;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [filteredEmployees, sortField, sortAsc]);

  // Paginated staff list
  const paginatedEmployees = useMemo(() => {
    if (pageSize === 'ALL') return sortedEmployees;
    const start = (currentPage - 1) * pageSize;
    return sortedEmployees.slice(start, start + pageSize);
  }, [sortedEmployees, currentPage, pageSize]);

  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(sortedEmployees.length / pageSize) || 1;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Native Excel (.xlsx) Export Handler (Item 10) - Lossless Arabic support
  const handleExportExcel = () => {
    const data = [
      [
        '# / ID',
        'Employee Code',
        'Full Name',
        'Department',
        'Workforce Type',
        'Base Salary',
        'Arrival Fee (0.05)',
        'Search Fee',
        'Insurance',
        'Absence Cost',
        'Bonus',
        'Net Payout',
        'Currency',
        'Payment State',
        'Disbursal Date',
      ],
      ...employees.map((e, idx) => {
        const id = getDisplayId(e, idx);
        const isForeign = e.currency === 'USD' || e.isForeign;
        const wf = isForeign ? 'Foreign Staff (USD)' : 'Direct Institutional Staff (IQD)';
        return [
          id,
          e.employeeCode || '',
          e.fullName || '',
          e.department || '',
          wf,
          e.baseSalary || 0,
          e.arrivalFee || 0,
          e.searchFee || 0,
          e.insurance || 0,
          e.absence || 0,
          e.bonus || 0,
          e.netSalary || 0,
          e.currency || 'IQD',
          e.paymentStatus || 'UNPAID',
          e.paidAt || 'Pending',
        ];
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 30 },
      { wch: 26 },
      { wch: 22 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Financial Ledger');
    const filename = `Payroll_Ledger_Report_${currentPeriod?.code || 'Cycle'}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // PDF / Print handler (Strictly triggers native PDF print layout)
  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc] text-slate-900 select-none">
      <div className="w-full px-2 sm:px-4 md:px-6 space-y-5 pb-20">
        {/* =========================================================================
            HEADER BAR (Pic 1: Finalized Audit & Ledger Statement, Actions)
            ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FINALIZED AUDIT & LEDGER STATEMENT</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                Active Cycle: {currentPeriod?.name || 'August 2026'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Official Institutional Disbursement Ledger & Comprehensive Reconciliation Report
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap no-print">
            {/* Period Selector Dropdown */}
            <div className="relative">
              <select
                value={currentPeriod?.id || ''}
                onChange={(e) => {
                  const p = periods.find((item) => item.id === e.target.value);
                  if (p && onSelectPeriod) onSelectPeriod(p);
                }}
                className="appearance-none bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs font-bold text-xs px-3.5 py-2 pr-8 rounded-xl cursor-pointer transition-all outline-none"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.code} {p.status === 'OPEN' ? 'Active' : ''}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>

            {/* Export to Excel (.xlsx) */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              title="Export ledger to native Excel (.xlsx) with Arabic text support"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-700">table_view</span>
              <span>Export to Excel (.xlsx)</span>
            </button>

            {/* Export to PDF */}
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-4 py-2 bg-[#0f4a47] hover:bg-[#0b3836] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              title="Export printable statement to PDF"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              <span>Export to PDF</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            TOP 4 METRIC CARDS (Pic 1: PAID FOR NOW, REMAINING, STOPPED, DEDUCTIONS)
            ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: PAID FOR NOW */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  PAID FOR NOW
                </span>
                <div className="text-xl font-black font-mono text-slate-900">
                  {formatNumberAuto(paidTotalIqd)} IQD
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold border border-emerald-100">
                <span className="material-symbols-outlined text-[13px]">attach_money</span>
                <span>{formatUsdBadge(paidTotalIqd)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{paidEmployees.length} Paid Staff ({paidPercent}%)</span>
                <span>To reconcile: {paidEmployees.length} staff</span>
              </div>
            </div>
          </div>

          {/* CARD 2: REMAINING (PENDING LEFT) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  REMAINING (PENDING LEFT)
                </span>
                <div className="text-xl font-black font-mono text-slate-900 flex items-baseline gap-1.5">
                  <span>IQD {formatNumberAuto(unpaidTotalIqd)}</span>
                  {unpaidEmployees.some((e) => (e.arrivalFee || 0) > 0) && (
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                      +5%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-100">
                <span className="material-symbols-outlined text-[13px]">payments</span>
                <span>{formatUsdBadge(unpaidTotalIqd)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{unpaidEmployees.length} Staff Pending</span>
                <span className="font-bold text-indigo-600">{unpaidPercent}%</span>
              </div>
            </div>
          </div>

          {/* CARD 3: STOPPED (WITHHELD) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  STOPPED (WITHHELD)
                </span>
                <div className="text-xl font-black font-mono text-rose-600">
                  {formatNumberAuto(stoppedTotalIqd)} IQD
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">block</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-mono text-[11px] font-bold border border-rose-100">
                <span className="material-symbols-outlined text-[13px]">attach_money</span>
                <span>{formatUsdBadge(stoppedTotalIqd)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-rose-600 font-bold">{stoppedEmployees.length} Staff Withheld</span>
                <span className="text-rose-500 font-bold">Frozen</span>
              </div>
            </div>
          </div>

          {/* CARD 4: DEDUCTIONS & FEES POOL */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  DEDUCTIONS & FEES POOL
                </span>
                <div className="text-xl font-black font-mono text-amber-600">
                  IQD {formatNumberAuto(deductionsTotalIqd)}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-mono text-[11px] font-bold border border-amber-100">
                <span className="material-symbols-outlined text-[13px]">attach_money</span>
                <span>{formatUsdBadge(deductionsTotalIqd)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{deductionsCount} Deductions Applied</span>
                <span className="font-bold text-amber-600">Audit Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            DISBURSEMENT & DEDUCTIONS AUDIT MATRIX (Pic 1: Table with Total footer)
            ========================================================================= */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-700 text-[20px]">account_balance</span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Disbursement & Deductions Audit Matrix
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Comprehensive breakdown of disbursements, withholdings, arrival fees, insurance, and net payouts.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono self-start sm:self-auto">
              Page 1 of 1 • {employees.length} staff
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold text-[10.5px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3 px-3">SALARY STATE</th>
                  <th className="py-3 px-3 text-center">FACULTY</th>
                  <th className="py-3 px-3">GROSS POOL (IQD / $)</th>
                  <th className="py-3 px-3 text-right">ARRIVAL FEE (0.05)</th>
                  <th className="py-3 px-3 text-right">SEARCH FEE</th>
                  <th className="py-3 px-3 text-right">INSURANCE</th>
                  <th className="py-3 px-3 text-right">ABSENCE</th>
                  <th className="py-3 px-3 text-right">BONUS</th>
                  <th className="py-3 px-3 text-right font-black">NET PAYOUT</th>
                  <th className="py-3 px-3 text-right">CONVERTED EQUIV.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.map((row) => (
                  <tr key={row.title} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-800 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${row.dotColor}`} />
                      <span>{row.title}</span>
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-600">
                      {row.count}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-700">
                      {row.count === 0 ? (
                        <span className="text-slate-400">0</span>
                      ) : row.iqdGross > 0 && row.usdGross > 0 ? (
                        <span>
                          IQD {formatNumberAuto(row.iqdGross)} / ${formatNumberAuto(row.usdGross)}
                        </span>
                      ) : row.iqdGross > 0 ? (
                        <span>IQD {formatNumberAuto(row.iqdGross)}</span>
                      ) : row.usdGross > 0 ? (
                        <span>${formatNumberAuto(row.usdGross)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-amber-600">
                      {row.arrival > 0 ? formatNumberAuto(row.arrival) : '-'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                      {row.search > 0 ? formatNumberAuto(row.search) : '-'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                      {row.insurance > 0 ? formatNumberAuto(row.insurance) : '-'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-rose-500">
                      {row.absence > 0 ? `-${formatNumberAuto(row.absence)}` : '-'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-emerald-600">
                      {row.bonus > 0 ? `+${formatNumberAuto(row.bonus)}` : '-'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900">
                      {row.count === 0 ? '0 IQD' : `IQD ${formatNumberAuto(row.netIqd)}`}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
                        {formatUsdBadge(row.netIqd)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Total / Month Dark Bar matching Pic 1 */}
              <tfoot>
                <tr className="bg-[#0c1524] text-white font-bold border-t-2 border-slate-700">
                  <td className="py-3.5 px-3 text-white font-bold">Total / Month</td>
                  <td className="py-3.5 px-3 text-center font-mono text-slate-200">
                    {matrixTotal.totalCount}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-200">
                    {matrixTotal.iqdGross > 0 && matrixTotal.usdGross > 0 ? (
                      <span>
                        IQD {formatNumberAuto(matrixTotal.iqdGross)} / ${formatNumberAuto(matrixTotal.usdGross)}
                      </span>
                    ) : matrixTotal.iqdGross > 0 ? (
                      <span>IQD {formatNumberAuto(matrixTotal.iqdGross)}</span>
                    ) : (
                      <span>${formatNumberAuto(matrixTotal.usdGross)}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-amber-400">
                    {matrixTotal.arrival > 0 ? formatNumberAuto(matrixTotal.arrival) : '-'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                    {matrixTotal.search > 0 ? formatNumberAuto(matrixTotal.search) : '-'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                    {matrixTotal.insurance > 0 ? formatNumberAuto(matrixTotal.insurance) : '-'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-rose-400">
                    {matrixTotal.absence > 0 ? `-${formatNumberAuto(matrixTotal.absence)}` : '-'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-400">
                    {matrixTotal.bonus > 0 ? `+${formatNumberAuto(matrixTotal.bonus)}` : '-'}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-black text-amber-400 text-sm">
                    IQD {formatNumberAuto(matrixTotal.netIqd)}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono text-[11px] font-bold">
                      {formatUsdBadge(matrixTotal.netIqd)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* =========================================================================
            SEARCH & FILTER TOOLBAR (Pic 1: Search, Workforce, State, Depts, Count)
            ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search report by employee name, ID, department, or payout status..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 shadow-2xs transition-all"
            />
          </div>

          {/* Filters & Counter */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Workforce Filter */}
            <select
              value={selectedWorkforce}
              onChange={(e) => {
                setSelectedWorkforce(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold px-3 py-2 shadow-2xs outline-none cursor-pointer hover:bg-slate-50"
            >
              <option value="ALL">All Workforce</option>
              <option value="DIRECT">Direct (IQD)</option>
              <option value="FOREIGN">Foreign (USD)</option>
            </select>

            {/* Salary States Filter */}
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold px-3 py-2 shadow-2xs outline-none cursor-pointer hover:bg-slate-50"
            >
              <option value="ALL">All Salary States</option>
              <option value="PAID">Paid (Disbursed)</option>
              <option value="UNPAID">Unpaid (Pending)</option>
              <option value="STOPPED">Stopped (Withheld)</option>
            </select>

            {/* Departments Filter */}
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold px-3 py-2 shadow-2xs outline-none cursor-pointer hover:bg-slate-50 max-w-[160px] truncate"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Counter */}
            <span className="text-xs text-slate-400 font-mono pl-1">
              {paginatedEmployees.length} of {employees.length} records
            </span>
          </div>
        </div>

        {/* =========================================================================
            DETAILED STAFF PAYOUT & VOUCHER ROSTER TABLE (Pic 1 & Pic 2 Popover)
            ========================================================================= */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto relative">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shadow-xs">
                <tr className="border-b border-slate-200 text-slate-500 font-bold text-[10.5px] uppercase tracking-wider bg-slate-50">
                  <th
                    className="sticky top-0 z-20 bg-slate-50 py-3 px-3 cursor-pointer hover:text-slate-700 transition-colors border-b border-slate-200"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-1">
                      <span># / ID</span>
                      <span className="material-symbols-outlined text-[14px]">swap_vert</span>
                    </div>
                  </th>

                  <th
                    className="sticky top-0 z-20 bg-slate-50 py-3 px-3 cursor-pointer hover:text-slate-700 transition-colors border-b border-slate-200"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>EMPLOYEE NAME</span>
                      <span className="material-symbols-outlined text-[14px]">swap_vert</span>
                    </div>
                  </th>

                  <th
                    className="sticky top-0 z-20 bg-slate-50 py-3 px-3 cursor-pointer hover:text-slate-700 transition-colors border-b border-slate-200"
                    onClick={() => handleSort('workforce')}
                  >
                    <div className="flex items-center gap-1">
                      <span>WORKFORCE</span>
                      <span className="material-symbols-outlined text-[14px]">swap_vert</span>
                    </div>
                  </th>

                  <th
                    className="sticky top-0 z-20 bg-slate-50 py-3 px-3 cursor-pointer hover:text-slate-700 transition-colors border-b border-slate-200"
                    onClick={() => handleSort('baseSalary')}
                  >
                    <div className="flex items-center gap-1">
                      <span>BASE SALARY</span>
                      <span className="material-symbols-outlined text-[14px]">swap_vert</span>
                    </div>
                  </th>

                  <th
                    className="sticky top-0 z-20 bg-slate-50 py-3 px-3 cursor-pointer hover:text-slate-700 transition-colors border-b border-slate-200"
                    onClick={() => handleSort('netSalary')}
                  >
                    <div className="flex items-center gap-1">
                      <span>THE NET SALARY (PAYOUT)</span>
                      <span className="material-symbols-outlined text-[14px]">swap_vert</span>
                    </div>
                  </th>

                  <th
                    className="sticky top-0 z-20 bg-slate-50 py-3 px-3 cursor-pointer hover:text-slate-700 transition-colors border-b border-slate-200"
                    onClick={() => handleSort('state')}
                  >
                    <div className="flex items-center gap-1">
                      <span>STATE</span>
                      <span className="material-symbols-outlined text-[14px]">swap_vert</span>
                    </div>
                  </th>

                  <th
                    className="sticky top-0 z-20 bg-slate-50 py-3 px-3 cursor-pointer hover:text-slate-700 transition-colors border-b border-slate-200"
                    onClick={() => handleSort('disbursedAt')}
                  >
                    <div className="flex items-center gap-1">
                      <span>DISBURSED AT</span>
                      <span className="material-symbols-outlined text-[14px]">swap_vert</span>
                    </div>
                  </th>

                  <th className="sticky top-0 z-20 bg-slate-50 py-3 px-3 text-right border-b border-slate-200">VOUCHER</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedEmployees.map((emp, idx) => {
                  const displayId = getDisplayId(emp, (currentPage - 1) * (pageSize === 'ALL' ? 0 : pageSize) + idx);
                  const isForeign = emp.currency === 'USD' || emp.isForeign;
                  const isPaid = emp.paymentStatus === 'PAID';
                  const isStopped = emp.paymentStatus === 'STOPPED';

                  // Pick initial character for avatar
                  const initial = emp.fullName ? emp.fullName.trim()[0] : 'E';

                  return (
                    <tr
                      key={emp.id}
                      className={`transition-all duration-200 ease-out cursor-default border-b ${
                        isStopped
                          ? 'bg-rose-50/95 hover:bg-rose-100 text-rose-950 border-rose-200 font-semibold shadow-2xs'
                          : 'hover:bg-teal-50/70 border-slate-100 text-slate-800'
                      } group`}
                    >
                      {/* ID Column with hover indicator */}
                      <td
                        className={`py-3 px-3 font-mono text-xs relative border-l-4 transition-all ${
                          isStopped
                            ? 'border-l-rose-500 font-bold text-rose-950'
                            : 'border-l-transparent group-hover:border-l-teal-600 font-bold text-slate-500'
                        }`}
                      >
                        #{displayId}
                      </td>

                      {/* EMPLOYEE NAME */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#0f4a47] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs tracking-tight">
                              {emp.fullName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {emp.department || 'Engineering'} • {emp.position || 'Full-Time'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* WORKFORCE */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 text-[10.5px] font-mono font-medium">
                          {isForeign ? '💵 Foreign (USD)' : '🏛️ Direct (IQD)'}
                        </span>
                      </td>

                      {/* BASE SALARY */}
                      <td className="py-3 px-3 font-mono text-slate-700 font-medium">
                        {isForeign ? `$ ${formatNumberAuto(emp.baseSalary)}` : `IQD ${formatNumberAuto(emp.baseSalary)}`}
                      </td>

                      {/* THE NET SALARY (PAYOUT) */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-3 py-1 rounded-md border border-slate-200 bg-white text-slate-900 font-mono font-black text-xs shadow-2xs">
                          {isForeign
                            ? `$ ${formatNumberAuto(emp.netSalary)}`
                            : `IQD ${formatNumberAuto(emp.netSalary)}`}
                        </span>
                      </td>

                      {/* STATE */}
                      <td className="py-3 px-3">
                        {isPaid ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            Paid
                          </span>
                        ) : isStopped ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            Stopped
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                            Not Yet
                          </span>
                        )}
                      </td>

                      {/* DISBURSED AT */}
                      <td className="py-3 px-3 font-mono text-xs text-slate-400">
                        {isPaid && emp.paidAt ? (
                          <span>{emp.paidAt}</span>
                        ) : (
                          <span className="italic">Pending</span>
                        )}
                      </td>

                      {/* VOUCHER BUTTON & INTERACTIVE TOOLTIP POPOVER (Pic 2) */}
                      <td className="py-3 px-3 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setSelectedVoucherEmployee(emp)}
                            onMouseEnter={() => setHoveredVoucherId(emp.id)}
                            onMouseLeave={() => setHoveredVoucherId(null)}
                            className={
                              idx === 0 || isPaid
                                ? 'px-3 py-1.5 rounded-lg bg-[#0f4a47] hover:bg-[#0b3836] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer'
                                : 'px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer'
                            }
                          >
                            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                            <span>View Voucher</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          </button>

                          {/* Hover Popover Tooltip (matches Pic 2 media_1789328950364.png) */}
                          {hoveredVoucherId === emp.id && (
                            <div
                              className={`absolute right-0 ${
                                idx < 3 ? 'top-full mt-2' : 'bottom-full mb-2'
                              } z-[9999] w-72 p-4 bg-[#0c1524] text-white rounded-2xl border border-slate-700 shadow-2xl animate-fade-in pointer-events-none`}
                              style={{ filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.6))' }}
                            >
                              {/* Top Bar: Info Icon, Name, ID */}
                              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5 mb-2.5">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-[14px]">info</span>
                                </div>
                                <div className="font-bold text-xs truncate text-right flex-1 text-slate-100">
                                  {emp.fullName}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 shrink-0">
                                  {displayId}
                                </div>
                              </div>

                              {/* Base & Net Payout Lines */}
                              <div className="space-y-2 text-xs font-mono">
                                <div className="flex justify-between items-center text-slate-300">
                                  <span className="text-[11px] text-slate-400">Base Salary:</span>
                                  <span className="font-bold">
                                    {isForeign
                                      ? `$ ${formatNumberAuto(emp.baseSalary)}`
                                      : `IQD ${formatNumberAuto(emp.baseSalary)}`}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                                    NET PAYOUT:
                                  </span>
                                  <span className="font-black text-teal-400">
                                    {isForeign
                                      ? `$ ${formatNumberAuto(emp.netSalary)}`
                                      : `IQD ${formatNumberAuto(emp.netSalary)}`}
                                  </span>
                                </div>
                              </div>

                              {/* Footer Note */}
                              <div className="mt-3 pt-2 border-t border-slate-800/80">
                                <div className="w-full py-1.5 px-2 rounded-lg bg-slate-800/90 text-[10.5px] text-slate-300 text-center font-medium">
                                  Click button for official certified printout
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginatedEmployees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 space-y-2">
                      <span className="material-symbols-outlined text-4xl text-slate-300">
                        find_in_page
                      </span>
                      <p className="text-sm font-bold text-slate-600">No employee records match the filter</p>
                      <p className="text-xs text-slate-400">
                        Try resetting your search query or selecting "All Salary States".
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {sortedEmployees.length > 0 && (
            <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const v = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                    setPageSize(v);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value="ALL">All</option>
                </select>
                <span>per page</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1 || pageSize === 'ALL'}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer transition-all"
                >
                  Previous
                </button>
                <span className="px-3 py-1 font-mono font-bold text-slate-800">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages || pageSize === 'ALL'}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Official Certified Salary Disbursement Voucher Modal */}
      <SalaryVoucherModal
        isOpen={!!selectedVoucherEmployee}
        employee={selectedVoucherEmployee}
        period={currentPeriod}
        rate={rate}
        onClose={() => setSelectedVoucherEmployee(null)}
      />
    </div>
  );
};
