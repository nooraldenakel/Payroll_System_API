import React, { useState, useEffect, useMemo } from 'react';
import { Employee, PayrollPeriod } from '../types';
import { formatMoney } from '../services/api';
import { ViewEmployeeModal } from '../components/ViewEmployeeModal';
import { EditCompensationModal } from '../components/EditCompensationModal';
import { ConfirmModal, ConfirmModalProps } from '../components/ConfirmModal';

interface EmployeesViewProps {
  employees: Employee[];
  currency?: 'IQD' | 'USD';
  rate?: number;
  onAddEmployee: () => void;
  onDeleteEmployee: (id: string) => Promise<void>;
  onBatchDeleteEmployees?: (ids: string[]) => Promise<void>;
  onUpdateEmployeeStatus?: (id: string, status: 'PAID' | 'UNPAID' | 'STOPPED') => void;
  onUpdateEmployee?: (id: string, updated: Partial<Employee>) => Promise<void>;
  searchQuery: string;
  activePeriod?: PayrollPeriod | null;
  userRole?: string;
  initialDepartmentFilter?: string;
}

type SortField =
  | 'id'
  | 'name'
  | 'status'
  | 'baseSalary'
  | 'arrival'
  | 'bonus'
  | 'insurance'
  | 'absence'
  | 'searchFee'
  | 'netSalary'
  | 'paymentStatus'
  | 'paidAt';

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  currency = 'IQD',
  rate = 1310,
  onAddEmployee,
  onDeleteEmployee,
  onBatchDeleteEmployees,
  onUpdateEmployeeStatus,
  onUpdateEmployee,
  searchQuery: initialSearch = '',
  activePeriod,
  userRole,
  initialDepartmentFilter,
}) => {
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(employees);
  const [search, setSearch] = useState<string>(initialSearch);
  const [selectedDept, setSelectedDept] = useState<string>(initialDepartmentFilter || 'ALL');
  const [selectedCurrency, setSelectedCurrency] = useState<'ALL' | 'IQD' | 'USD'>('ALL');
  const [selectedState, setSelectedState] = useState<'ALL' | 'PAID' | 'UNPAID' | 'STOPPED'>('ALL');
  const [selectedWorkforce, setSelectedWorkforce] = useState('ALL');

  // Pagination & Sorting state (default to 10 per page matching user requirements)
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Multi-Selection State for Long-Press (Item 15)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = React.useRef<boolean>(false);

  // Table horizontal scroll ref
  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const [showMetrics, setShowMetrics] = useState<boolean>(true);

  const handleScrollHorizontal = (direction: 'left' | 'right') => {
    if (tableScrollRef.current) {
      const offset = direction === 'left' ? -350 : 350;
      tableScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleScrollToSide = (side: 'start' | 'end') => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTo({
        left: side === 'end' ? tableScrollRef.current.scrollWidth : 0,
        behavior: 'smooth',
      });
    }
  };

  // Modals state
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [confirmModalConfig, setConfirmModalConfig] = useState<ConfirmModalProps | null>(null);

  useEffect(() => {
    setLocalEmployees(employees);
  }, [employees]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  useEffect(() => {
    if (initialDepartmentFilter) {
      setSelectedDept(initialDepartmentFilter);
    }
  }, [initialDepartmentFilter]);

  // Long-press handling for touch and mouse (~500ms)
  const handleStartPress = (empId: string) => {
    if (userRole === 'Fiscal Auditor') return;
    isLongPressTriggered.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      setIsSelectionMode(true);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(empId)) next.delete(empId);
        else next.add(empId);
        return next;
      });
    }, 500);
  };

  const handleEndPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const toggleSelectEmployee = (empId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = paginated.map((e) => e.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setConfirmModalConfig({
      isOpen: true,
      title: `Delete ${count} Staff Member(s)?`,
      message: `Are you sure you want to permanently delete the ${count} selected employee record(s) from the payroll ledger? This action cannot be undone.`,
      variant: 'danger',
      confirmText: `Delete ${count} Record(s)`,
      cancelText: 'Cancel',
      onConfirm: async () => {
        setConfirmModalConfig(null);
        setIsBatchDeleting(true);
        try {
          const idsToDelete = Array.from(selectedIds);
          if (onBatchDeleteEmployees) {
            await onBatchDeleteEmployees(idsToDelete);
          } else {
            for (const id of idsToDelete) {
              await onDeleteEmployee(id);
            }
          }
          setSelectedIds(new Set());
          setIsSelectionMode(false);
        } finally {
          setIsBatchDeleting(false);
        }
      },
      onCancel: () => {
        setConfirmModalConfig(null);
      },
    });
  };

  const departments = useMemo(() => {
    return Array.from(new Set(localEmployees.map((e) => e.department))).filter(Boolean);
  }, [localEmployees]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Switch employee currency between USD and IQD vice versa (on clicking status badge)
  const handleToggleCurrency = async (e: React.MouseEvent, emp: Employee) => {
    e.stopPropagation();
    const nextCurrency: 'USD' | 'IQD' = emp.currency === 'USD' ? 'IQD' : 'USD';
    const nextIsForeign = nextCurrency === 'USD';

    // Recalculate arrival fee: if foreign has arrival, keep or scale, or recalculate
    const nextArrival = nextIsForeign
      ? emp.arrivalFee || Math.round(emp.baseSalary * 0.05)
      : 0;
    const absCost = (emp.absenceDays || 0) > 0 && emp.baseSalary > 0
      ? Math.round((emp.baseSalary / 30.0 * (emp.absenceDays || 0)) * 100.0) / 100.0
      : (emp.absence || 0);
    const nextNet = Math.max(
      0,
      emp.baseSalary + emp.bonus - emp.insurance - emp.searchFee - absCost - nextArrival
    );

    const updated: Employee = {
      ...emp,
      currency: nextCurrency,
      isForeign: nextIsForeign,
      arrivalFee: nextArrival,
      absence: absCost,
      netSalary: nextNet,
    };

    setLocalEmployees((prev) => prev.map((item) => (item.id === emp.id ? updated : item)));
    if (onUpdateEmployee) {
      await onUpdateEmployee(emp.id, updated);
    }
  };

  // Toggle Arrival Fee (0.05) on/off (Pic 5)
  const handleToggleArrivalFee = async (e: React.MouseEvent, emp: Employee) => {
    e.stopPropagation();
    const currentArrival = emp.arrivalFee || 0;
    let nextArrival = 0;

    if (currentArrival === 0) {
      // Activate arrival fee (0.05 * baseSalary)
      nextArrival = Math.round(emp.baseSalary * 0.05);
    } else {
      // Deactivate arrival fee
      nextArrival = 0;
    }

    const absCost = (emp.absenceDays || 0) > 0 && emp.baseSalary > 0
      ? Math.round((emp.baseSalary / 30.0 * (emp.absenceDays || 0)) * 100.0) / 100.0
      : (emp.absence || 0);
    const nextNet = Math.max(
      0,
      emp.baseSalary + emp.bonus - emp.insurance - emp.searchFee - absCost - nextArrival
    );

    const updated: Employee = {
      ...emp,
      arrivalFee: nextArrival,
      absence: absCost,
      netSalary: nextNet,
    };

    setLocalEmployees((prev) => prev.map((item) => (item.id === emp.id ? updated : item)));
    if (onUpdateEmployee) {
      await onUpdateEmployee(emp.id, updated);
    }
  };

  // Execute state toggle after confirmation or if active
  const proceedWithToggle = async (emp: Employee, isCurrentlyStopped: boolean) => {
    const nextState: 'PAID' | 'UNPAID' | 'STOPPED' =
      emp.paymentStatus === 'PAID' ? (isCurrentlyStopped ? 'STOPPED' : 'UNPAID') : 'PAID';
    const paidAt =
      nextState === 'PAID'
        ? new Date().toISOString().replace('T', ' ').slice(0, 16)
        : undefined;

    const updated: Employee = {
      ...emp,
      paymentStatus: nextState,
      paidAt,
    };

    setLocalEmployees((prev) => prev.map((item) => (item.id === emp.id ? updated : item)));
    if (onUpdateEmployeeStatus) {
      onUpdateEmployeeStatus(emp.id, nextState);
    }
    if (onUpdateEmployee) {
      await onUpdateEmployee(emp.id, updated);
    }
  };

  // Toggle state between Paid and Unpaid with rich Warning Modal if STOPPED or reverting PAID
  const handleToggleState = async (e: React.MouseEvent, emp: Employee) => {
    e.stopPropagation();

    const isCurrentlyStopped = emp.paymentStatus === 'STOPPED' || (emp.baseSalary || 0) <= 0;

    // --- Guard: Warn when reverting from PAID → UNPAID ---
    if (emp.paymentStatus === 'PAID') {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Revert Salary to Unpaid?',
        message: `The salary for "${emp.fullName}" has already been marked as PAID${emp.paidBy ? ` by ${emp.paidBy}` : ''}${emp.paidAt ? ` on ${emp.paidAt}` : ''}. Reverting this will cancel the recorded disbursement in the cycle ledger. Are you sure?`,
        variant: 'danger',
        confirmText: 'Yes, Revert to Unpaid',
        cancelText: 'Keep as Paid',
        employeeDetails: {
          name: emp.fullName,
          id: emp.employeeCode || emp.id,
          status: 'PAID',
          baseSalary: emp.baseSalary,
          netSalary: emp.netSalary,
          currency: emp.currency,
        },
        onConfirm: async () => {
          setConfirmModalConfig(null);
          await proceedWithToggle(emp, isCurrentlyStopped);
        },
        onCancel: () => {
          setConfirmModalConfig(null);
        },
      });
      return;
    }

    // --- Guard: Warn when disbursing to a STOPPED employee ---
    if (isCurrentlyStopped) {
      const reason = (emp.baseSalary || 0) <= 0 ? ' (Zero Base Salary: $0 / 0 IQD)' : ' (Withheld/Stopped Record)';
      setConfirmModalConfig({
        isOpen: true,
        title: 'Disburse Salary to Stopped Employee?',
        message: `Staff member "${emp.fullName}" is registered as STOPPED${reason}. Disbursing payment will officially record a payout for this employee in the cycle ledger. Are you sure you wish to proceed?`,
        variant: 'danger',
        confirmText: 'Yes, Disburse Anyway',
        cancelText: 'Cancel & Keep Stopped',
        employeeDetails: {
          name: emp.fullName,
          id: emp.employeeCode || emp.id,
          status: 'STOPPED',
          baseSalary: emp.baseSalary,
          netSalary: emp.netSalary,
          currency: emp.currency,
        },
        onConfirm: async () => {
          setConfirmModalConfig(null);
          await proceedWithToggle(emp, isCurrentlyStopped);
        },
        onCancel: () => {
          setConfirmModalConfig(null);
        },
      });
      return;
    }

    await proceedWithToggle(emp, isCurrentlyStopped);
  };

  // Save changes from Edit Modal (Pic 3)
  const handleSaveEdit = async (updatedFields: Partial<Employee>) => {
    if (!editingEmployee) return;
    const merged: Employee = {
      ...editingEmployee,
      ...updatedFields,
    };
    setLocalEmployees((prev) => prev.map((e) => (e.id === editingEmployee.id ? merged : e)));
    if (onUpdateEmployee) {
      await onUpdateEmployee(editingEmployee.id, updatedFields);
    }
    setEditingEmployee(null);
  };

  // Filter local employees
  const filtered = useMemo(() => {
    return localEmployees.filter((e) => {
      // Dept filter
      if (selectedDept !== 'ALL' && e.department !== selectedDept) return false;

      // State filter
      if (selectedState !== 'ALL') {
        if (selectedState === 'PAID' && e.paymentStatus !== 'PAID') return false;
        if (selectedState === 'UNPAID' && e.paymentStatus !== 'UNPAID') return false;
        if (selectedState === 'STOPPED' && e.paymentStatus !== 'STOPPED') return false;
      }

      // Workforce filter
      if (selectedWorkforce !== 'ALL') {
        const isF = e.currency === 'USD' || e.isForeign;
        if (selectedWorkforce === 'FOREIGN' && !isF) return false;
        if (selectedWorkforce === 'LOCAL' && isF) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = e.fullName.toLowerCase().includes(q);
        const matchesCode = (e.employeeCode || e.id).toLowerCase().includes(q);
        const matchesDept = e.department.toLowerCase().includes(q);
        const matchesSalary = String(e.baseSalary).includes(q) || String(e.netSalary).includes(q);
        const matchesState = e.paymentStatus.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDept && !matchesSalary && !matchesState) {
          return false;
        }
      }

      return true;
    });
  }, [localEmployees, selectedDept, selectedState, selectedWorkforce, search]);

  // Sorted list
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'id':
          valA = a.employeeCode || a.id;
          valB = b.employeeCode || b.id;
          break;
        case 'name':
          valA = a.fullName.toLowerCase();
          valB = b.fullName.toLowerCase();
          break;
        case 'status':
          valA = a.currency;
          valB = b.currency;
          break;
        case 'baseSalary':
          valA = a.baseSalary;
          valB = b.baseSalary;
          break;
        case 'arrival':
          valA = a.arrivalFee || 0;
          valB = b.arrivalFee || 0;
          break;
        case 'bonus':
          valA = a.bonus || 0;
          valB = b.bonus || 0;
          break;
        case 'insurance':
          valA = a.insurance || 0;
          valB = b.insurance || 0;
          break;
        case 'absence':
          valA = a.absenceDays !== undefined && a.absenceDays > 0 ? a.absenceDays : (a.absence || 0);
          valB = b.absenceDays !== undefined && b.absenceDays > 0 ? b.absenceDays : (b.absence || 0);
          break;
        case 'searchFee':
          valA = a.searchFee || 0;
          valB = b.searchFee || 0;
          break;
        case 'netSalary':
          valA = a.netSalary || 0;
          valB = b.netSalary || 0;
          break;
        case 'paymentStatus':
          valA = a.paymentStatus;
          valB = b.paymentStatus;
          break;
        case 'paidAt':
          valA = a.paidAt || '';
          valB = b.paidAt || '';
          break;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, sortField, sortAsc]);

  // Paginated list
  const paginated = useMemo(() => {
    if (pageSize === 'ALL') return sorted;
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(sorted.length / pageSize) || 1;

  // Header metric card calculations (matching Pic 2)
  const paidEmployees = localEmployees.filter((e) => e.paymentStatus === 'PAID');
  const unpaidEmployees = localEmployees.filter((e) => e.paymentStatus === 'UNPAID');
  const stoppedEmployees = localEmployees.filter((e) => e.paymentStatus === 'STOPPED');

  const paidTotalIqd = paidEmployees.reduce(
    (acc, e) => acc + (e.currency === 'USD' || e.isForeign ? (e.netSalary || 0) * rate : e.netSalary || 0),
    0
  );
  const unpaidTotalIqd = unpaidEmployees.reduce(
    (acc, e) => acc + (e.currency === 'USD' || e.isForeign ? (e.netSalary || 0) * rate : e.netSalary || 0),
    0
  );
  const deductionsTotalIqd = localEmployees.reduce(
    (acc, e) => {
      const isUsd = e.currency === 'USD' || e.isForeign;
      const arrival = isUsd ? (e.arrivalFee || 0) * rate : (e.arrivalFee || 0);
      const search = isUsd ? (e.searchFeeIqd || (e.searchFee || 0) * rate) : (e.searchFee || 0);
      const insurance = isUsd ? (e.insuranceIqd || (e.insurance || 0) * rate) : (e.insurance || 0);
      const absence = isUsd ? (e.absence || 0) * rate : (e.absence || 0);
      return acc + arrival + insurance + absence + search;
    },
    0
  );
  const searchFeesTotalIqd = localEmployees.reduce((acc, e) => {
    const isUsd = e.currency === 'USD' || e.isForeign;
    return acc + (isUsd ? (e.searchFeeIqd || (e.searchFee || 0) * rate) : (e.searchFee || 0));
  }, 0);
  const arrivalFeesTotalIqd = localEmployees.reduce((acc, e) => {
    const isUsd = e.currency === 'USD' || e.isForeign;
    return acc + (isUsd ? (e.arrivalFee || 0) * rate : (e.arrivalFee || 0));
  }, 0);

  const foreignCount = localEmployees.filter((e) => e.currency === 'USD' || e.isForeign).length;
  const localCount = localEmployees.length - foreignCount;

  const getInitials = (name: string) => {
    if (!name) return 'EM';
    const clean = name.replace(/^د\.\s*|^أ\.د\.\s*|^م\.\s*/, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)} ${parts[1].charAt(0)}`;
    }
    return clean.slice(0, 2);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 bg-[#f8fafc] text-slate-800 select-none">
      <div className="w-full px-1 sm:px-2 space-y-4 pb-20">
        {/* 4 Summary Metric Cards matching Pic 2 (Collapsible on small screens) */}
        {showMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {/* CARD 1: PAID FOR NOW */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    PAID FOR NOW
                  </span>
                  <div className="text-xl font-black font-mono text-emerald-600">
                    {formatMoney(paidTotalIqd, 'IQD')}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                </div>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold">
                  <span>≈ {formatMoney(paidTotalIqd / rate, 'USD')}</span>
                  <span className="text-[10px] text-emerald-600">({paidEmployees.length} Paid)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-emerald-700 font-bold">• {paidEmployees.length} of {localEmployees.length} Staff</span>
                  <span>{paidEmployees.length === 0 ? 'No payments yet' : 'Disbursements active'}</span>
                </div>
              </div>
            </div>

            {/* CARD 2: REMAINING LEFT */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    REMAINING LEFT
                  </span>
                  <div className="text-xl font-black font-mono text-indigo-900">
                    {formatMoney(unpaidTotalIqd, 'IQD')}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
                </div>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold">
                  <span>≈ {formatMoney(unpaidTotalIqd / rate, 'USD')}</span>
                  <span className="text-[10px] text-indigo-500">({unpaidEmployees.length} Remaining)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-indigo-700 font-bold">• {unpaidEmployees.length} Unpaid</span>
                  {stoppedEmployees.length > 0 && (
                    <span className="text-rose-500 font-bold">{stoppedEmployees.length} Stopped</span>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 3: DEDUCTIONS & FEES */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    DEDUCTIONS & FEES
                  </span>
                  <div className="text-xl font-black font-mono text-amber-600">
                    {formatMoney(deductionsTotalIqd, 'IQD')}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                </div>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Search Fees:</span>
                  <span className="font-bold text-amber-700">-{formatMoney(searchFeesTotalIqd, 'IQD')}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Arrival Fees (0.05):</span>
                  <span className="font-bold text-amber-700">-{formatMoney(arrivalFeesTotalIqd, 'IQD')}</span>
                </div>
              </div>
            </div>

            {/* CARD 4: OVERALL FACULTY */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    OVERALL FACULTY
                  </span>
                  <div className="text-xl font-black font-mono text-slate-900">
                    {localEmployees.length} Staff
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">group</span>
                </div>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                    {foreignCount} Foreign ($)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[11px] font-bold">
                    {localCount} Local (IQD)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Cycle: {activePeriod?.name || activePeriod?.code || 'Active Cycle'}</span>
                  <span className="font-bold text-slate-600">{filtered.length} Visible</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Toolbar matching Pic 2 */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[280px] flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search by employee name, ID, department, salary amount, or status..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-teal-600 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Workforce Filter */}
            <select
              value={selectedWorkforce}
              onChange={(e) => {
                setSelectedWorkforce(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-600 cursor-pointer"
            >
              <option value="ALL">All Workforce</option>
              <option value="LOCAL">Local Staff (IQD)</option>
              <option value="FOREIGN">Foreign Staff (USD $)</option>
            </select>

            {/* Salary States Filter */}
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-600 cursor-pointer"
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
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-600 cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">
              {filtered.length > 0 ? (
                <>
                  Showing <strong>{paginated.length}</strong> of <strong>{filtered.length}</strong> records
                </>
              ) : (
                '0 records'
              )}
            </span>

            {userRole !== 'Fiscal Auditor' && (
              <>
                {/* Toggle Summary Cards to maximize table vertical height on smaller screens */}
                <button
                  type="button"
                  onClick={() => setShowMetrics(!showMetrics)}
                  title={showMetrics ? 'Collapse Summary Cards to maximize table space' : 'Expand Summary Cards'}
                  className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-teal-600">
                    {showMetrics ? 'expand_less' : 'analytics'}
                  </span>
                  <span className="hidden sm:inline">{showMetrics ? 'Hide Cards' : 'Show Cards'}</span>
                </button>

                {/* Multi-Select Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    if (isSelectionMode) setSelectedIds(new Set());
                  }}
                  title="Toggle multi-selection checkboxes or press and hold any row for 500ms"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isSelectionMode
                      ? 'bg-teal-50 border-teal-300 text-teal-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">checklist</span>
                  <span>{isSelectionMode ? 'Exit Select' : 'Select'}</span>
                </button>

                {/* Enroll Staff Button */}
                <button
                  type="button"
                  disabled={!activePeriod}
                  onClick={activePeriod ? onAddEmployee : undefined}
                  title={!activePeriod ? 'Please select or create an active payroll period first' : 'Enroll Staff Member'}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                    !activePeriod
                      ? 'bg-slate-400 opacity-60 cursor-not-allowed'
                      : 'bg-teal-700 hover:bg-teal-600 cursor-pointer'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Enroll Staff</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Batch Selection Action Bar (Item 15) - active on selection or long-press */}
        {(isSelectionMode || selectedIds.size > 0) && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-teal-900 text-white rounded-xl shadow-md border border-teal-800 transition-all">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-teal-300">checklist</span>
              <span className="font-bold text-xs">
                <strong>{selectedIds.size}</strong> staff member(s) selected
              </span>
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="px-2.5 py-1 rounded-lg bg-teal-800 hover:bg-teal-700 text-[11px] font-semibold transition-colors cursor-pointer border border-teal-700"
              >
                {paginated.length > 0 && paginated.every((e) => selectedIds.has(e.id))
                  ? 'Deselect Page'
                  : 'Select Page'}
              </button>
            </div>

            {userRole !== 'Fiscal Auditor' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={selectedIds.size === 0 || isBatchDeleting}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds(new Set());
                    setIsSelectionMode(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-teal-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* High-Density Ledger Table matching Pic 2 & Pic 5 with STICKY headers */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
          {/* Quick Horizontal Jump Controls */}
          <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-teal-600">swap_horiz</span>
              <span className="text-[11px] font-semibold text-slate-500">Horizontal View:</span>
              <button
                type="button"
                onClick={() => handleScrollToSide('start')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
                title="Scroll table to view employee name and ID"
              >
                <span className="material-symbols-outlined text-[14px]">first_page</span>
                <span>Staff Info</span>
              </button>
              <button
                type="button"
                onClick={() => handleScrollToSide('end')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 text-[11px] font-bold transition-colors shadow-2xs cursor-pointer"
                title="Scroll table directly to Net Salary & Actions"
              >
                <span>Net Salary & Actions</span>
                <span className="material-symbols-outlined text-[14px]">last_page</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
              <span className="hidden sm:inline">Actions are pinned to the right edge • Scrollbar is always visible</span>
            </div>
          </div>

          <div
            ref={tableScrollRef}
            className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] min-h-[380px] relative table-scrollbar scroll-smooth"
          >
            <table className="w-full text-center text-xs whitespace-nowrap border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shadow-xs">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[9.5px] uppercase tracking-wider">
                  {/* Multi-Select Checkbox Header */}
                  {(isSelectionMode || selectedIds.size > 0) && (
                    <th className="sticky top-0 z-20 bg-slate-50 py-2.5 px-2 text-center border-b border-slate-200 w-9">
                      <input
                        type="checkbox"
                        checked={paginated.length > 0 && paginated.every((e) => selectedIds.has(e.id))}
                        onChange={toggleSelectAllVisible}
                        className="rounded border-slate-300 text-teal-700 focus:ring-teal-500 cursor-pointer w-4 h-4"
                        title="Select/Deselect All on this page"
                      />
                    </th>
                  )}
                  <th
                    onClick={() => handleSort('id')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-800 select-none border-b border-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span># / ID</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('name')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-800 select-none border-b border-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>EMPL NAME</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('status')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-800 select-none border-b border-slate-200"
                    title="Click column header to sort; click row badge to toggle currency"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>STATUS</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('baseSalary')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-700 select-none border-b border-slate-200 text-slate-400 font-semibold text-[11px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>BASE SALARY</span>
                      <span className="text-[10px] opacity-60">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('arrival')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1 text-center cursor-pointer hover:text-slate-800 select-none border-b border-slate-200"
                    title="Click row cell to activate/deactivate 5% arrival fee"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>ARRIVAL (0.05)</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('bonus')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1 text-center cursor-pointer hover:text-slate-800 select-none border-b border-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>BONUS</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('insurance')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-800 select-none border-b border-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>INSURANCE</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('absence')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-800 select-none border-b border-slate-200"
                    title="Click column header to sort by absence days; hover over row values for cost breakdown"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>ABSENCE (DAYS)</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('searchFee')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-800 select-none border-b border-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>SEARCH FEE</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('netSalary')}
                    className="sticky top-0 z-20 bg-emerald-50/90 py-2.5 px-2 text-center cursor-pointer hover:bg-emerald-100 select-none font-black text-emerald-950 border-b-2 border-emerald-600 shadow-2xs transition-all"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-emerald-700">payments</span>
                      <span className="tracking-wide text-xs">NET SALARY (PAYOUT)</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('paymentStatus')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-800 select-none border-b border-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>STATE</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('paidAt')}
                    className="sticky top-0 z-20 bg-slate-50 py-2.5 px-1.5 text-center cursor-pointer hover:text-slate-800 select-none border-b border-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>PAID DATE & TIME</span>
                      <span className="text-[11px] opacity-70">⇅</span>
                    </div>
                  </th>

                  <th className="sticky top-0 right-0 z-30 bg-slate-50 py-2.5 px-3 text-center border-b border-l border-slate-200 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] font-bold text-slate-700">
                    ACTIONS
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginated.map((emp, idx) => {
                  const displayId = (() => {
                    const match = emp.employeeCode?.match(/\d+/);
                    return match ? parseInt(match[0], 10) : ((currentPage - 1) * (pageSize === 'ALL' ? 0 : pageSize) + idx + 1);
                  })();
                  const isForeign = emp.currency === 'USD' || emp.isForeign;
                  const curr = isForeign ? 'USD' : 'IQD';
                  const isPaid = emp.paymentStatus === 'PAID';
                  const isStopped = emp.paymentStatus === 'STOPPED';
                  const hasArrival = (emp.arrivalFee || 0) > 0;

                  return (
                    <tr
                      key={emp.id}
                      onMouseDown={() => handleStartPress(emp.id)}
                      onMouseUp={handleEndPress}
                      onMouseLeave={handleEndPress}
                      onTouchStart={() => handleStartPress(emp.id)}
                      onTouchEnd={handleEndPress}
                      className={`transition-all duration-150 ease-out cursor-default border-b select-none ${
                        selectedIds.has(emp.id)
                          ? 'bg-teal-100/90 border-teal-300 font-semibold shadow-2xs'
                          : isStopped
                          ? 'bg-rose-50/95 hover:bg-rose-100 text-rose-950 border-rose-200 font-semibold shadow-2xs'
                          : 'hover:bg-teal-100/70 border-slate-100 text-slate-800'
                      } group`}
                    >
                      {/* Multi-Select Checkbox Cell */}
                      {(isSelectionMode || selectedIds.size > 0) && (
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(emp.id)}
                            onChange={() => toggleSelectEmployee(emp.id)}
                            className="rounded border-slate-300 text-teal-700 focus:ring-teal-500 cursor-pointer w-4 h-4"
                          />
                        </td>
                      )}

                      {/* ID Column matching Payroll Financial Report screen */}
                      <td
                        className={`py-2 px-1.5 font-mono text-center relative border-l-4 transition-all ${
                          isStopped
                            ? 'border-l-rose-500 font-bold text-rose-950 text-xs'
                            : 'border-l-transparent group-hover:border-l-teal-600 group-hover:bg-teal-200/50 font-bold text-slate-600 text-xs'
                        }`}
                      >
                        #{displayId}
                      </td>

                      {/* EMPL NAME (Tapping opens View Details Modal) */}
                      <td
                        onClick={() => {
                          if (isLongPressTriggered.current) return;
                          if (isSelectionMode) {
                            toggleSelectEmployee(emp.id);
                            return;
                          }
                          setViewingEmployee(emp);
                        }}
                        className="py-2 px-1.5 text-center cursor-pointer"
                        title="Click to view full employee details (Hold 500ms for multi-select)"
                      >
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight text-[13px] tracking-tight truncate max-w-[150px]">
                            {emp.fullName}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate max-w-[150px]">
                            {emp.department || 'General Staff'}
                          </p>
                        </div>
                      </td>

                      {/* STATUS / WORKFORCE (Clickable toggle between IQD and USD vice versa!) */}
                      <td className="py-2 px-1.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleCurrency(e, emp)}
                          title={`Currently ${curr}. Click to switch to ${isForeign ? 'IQD' : 'USD'}`}
                          className={`mx-auto px-2 py-0.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs hover:scale-105 active:scale-95 ${
                            isForeign
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-xs">{isForeign ? '💵' : '🏛️'}</span>
                          <span>{curr}</span>
                        </button>
                      </td>

                      {/* BASE SALARY (Subtle neutral reference) */}
                      <td className="py-2 px-1.5 text-center">
                        <span className="mx-auto px-2 py-0.5 rounded-lg bg-slate-100/80 text-slate-500 border border-slate-200/60 text-[11px] font-mono font-medium inline-block">
                          {formatMoney(emp.baseSalary, curr, rate)}
                        </span>
                      </td>

                      {/* ARRIVAL (0.05) */}
                      <td className="py-2 px-1 text-center">
                        {(() => {
                          if (!hasArrival) {
                            return (
                              <button
                                type="button"
                                onClick={(e) => handleToggleArrivalFee(e, emp)}
                                title="Click to activate 5% arrival fee"
                                className="px-2 py-0.5 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center bg-slate-50/60 text-slate-400 border border-slate-200 hover:border-amber-400 hover:text-amber-700 shadow-2xs"
                              >
                                -
                              </button>
                            );
                          }

                          const arrivalAmount = emp.arrivalFee || Math.round(emp.baseSalary * 0.05 * 100.0) / 100.0;
                          const baseAfterCut = Math.max(0, emp.baseSalary - arrivalAmount);
                          const tooltipTitle = `Arrival Fee (0.05):\nPercentage Cut: 5%\nAmount Cut: -${formatMoney(arrivalAmount, curr, rate)}\nBase Salary: ${formatMoney(emp.baseSalary, curr, rate)}\nBase After Cut: ${formatMoney(baseAfterCut, curr, rate)}\n* Subtracted from Base Salary towards Net Salary\n(Click to toggle on/off)`;

                          return (
                            <div
                              className="relative group/arrival inline-flex items-center justify-center"
                              title={tooltipTitle}
                            >
                              <button
                                type="button"
                                onClick={(e) => handleToggleArrivalFee(e, emp)}
                                className="px-2 py-0.5 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs bg-amber-50 text-amber-800 border border-amber-400 hover:bg-amber-100 hover:scale-105 active:scale-95"
                              >
                                <span className="material-symbols-outlined text-[12px] text-amber-600">flight_land</span>
                                <span>-5% ({formatMoney(arrivalAmount, curr, rate)})</span>
                              </button>

                              {/* Hover Tooltip Breakdown Card - Top 5 rows open downwards to prevent cutoff outside top bar */}
                              <div
                                className={`absolute left-1/2 -translate-x-1/2 ${
                                  idx < 5 ? 'top-full mt-2' : 'bottom-full mb-2'
                                } hidden group-hover/arrival:flex flex-col z-[9999] pointer-events-none w-64 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 text-[11px] animate-fade-in`}
                              >
                                <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                                    <span className="material-symbols-outlined text-[15px] text-amber-400">flight_land</span>
                                    <span>Arrival Fee Breakdown</span>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                                    Active (5%)
                                  </span>
                                </div>

                                <div className="space-y-1.5 font-mono text-slate-300">
                                  <div className="flex justify-between items-center text-[10.5px]">
                                    <span className="text-slate-400 font-sans">Base Salary:</span>
                                    <span className="font-bold text-slate-200">{formatMoney(emp.baseSalary, curr, rate)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10.5px]">
                                    <span className="text-slate-400 font-sans">Percentage Cut:</span>
                                    <span className="font-bold text-amber-300">5% (× 0.05)</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10.5px]">
                                    <span className="text-slate-400 font-sans">Amount Cut:</span>
                                    <span className="font-extrabold text-rose-400">
                                      -{formatMoney(arrivalAmount, curr, rate)}
                                    </span>
                                  </div>

                                  <div className="pt-2 mt-1 border-t border-slate-800 flex justify-between items-center text-xs">
                                    <span className="text-slate-200 font-bold font-sans">Base After Cut:</span>
                                    <span className="font-extrabold text-emerald-400">
                                      {formatMoney(baseAfterCut, curr, rate)}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                                  <div className="flex items-center gap-1 text-emerald-400 font-sans">
                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                    <span>Subtracted towards Net</span>
                                  </div>
                                  <span className="text-slate-400 font-sans text-[9.5px]">Click cell to toggle</span>
                                </div>

                                {/* Indicator arrow */}
                                {idx < 5 ? (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900/95" />
                                ) : (
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900/95" />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* BONUS */}
                      <td className="py-2 px-1 font-mono text-center">
                        {(emp.bonus || 0) > 0 ? (
                          <span className="mx-auto px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10.5px] font-bold border border-emerald-200 inline-block">
                            +{formatMoney(emp.bonus, curr, rate)}
                          </span>
                        ) : (
                          <span className="mx-auto px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 text-[10.5px] border border-slate-200 inline-block">
                            -
                          </span>
                        )}
                      </td>

                      {/* INSURANCE */}
                      <td className="py-2 px-1.5 font-mono text-center">
                        {(() => {
                          const insUsd = isForeign ? (emp.insurance || 0) : 0;
                          const insIqd = isForeign
                            ? (emp.insuranceIqd || Math.round((emp.insurance || 0) * rate))
                            : (emp.insurance || 0);
                          const hasIns = isForeign ? insUsd > 0 : insIqd > 0;

                          if (!hasIns) {
                            return (
                              <span className="mx-auto px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 text-[10.5px] border border-slate-200 inline-block">
                                -
                              </span>
                            );
                          }

                          return isForeign ? (
                            <div
                              className="flex flex-col items-center justify-center gap-0.5 cursor-help"
                              title={`Insurance Deduction:\nDollar: -${formatMoney(insUsd, 'USD', rate)}\nEquivalent: -${formatMoney(insIqd, 'IQD')}\nSubtracted from Net Salary`}
                            >
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[10.5px] font-bold border border-rose-200 inline-block">
                                -${formatMoney(insUsd, 'USD', rate)}
                              </span>
                              <span className="text-[9px] text-slate-400 font-sans font-medium">
                                {formatMoney(insIqd, 'IQD')}
                              </span>
                            </div>
                          ) : (
                            <span
                              title={`Insurance Deduction: -${formatMoney(insIqd, 'IQD')} (Subtracted from Net Salary)`}
                              className="mx-auto px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[10.5px] font-bold border border-rose-200 cursor-help inline-block"
                            >
                              -{formatMoney(insIqd, 'IQD')}
                            </span>
                          );
                        })()}
                      </td>

                      {/* ABSENCE (DAYS) */}
                      <td className="py-2 px-1.5 font-mono text-center">
                        {(() => {
                          const absDays = emp.absenceDays || 0;
                          const dailyRate = emp.baseSalary > 0 ? Math.round((emp.baseSalary / 30.0) * 100.0) / 100.0 : 0;
                          const totalCost = absDays > 0
                            ? Math.round((dailyRate * absDays) * 100.0) / 100.0
                            : (emp.absence || 0);

                          if (absDays <= 0 && (!emp.absence || emp.absence <= 0)) {
                            return (
                              <span className="mx-auto px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 text-[10.5px] border border-slate-200 inline-block">
                                -
                              </span>
                            );
                          }

                          const tooltipTitle = `Absence Days: ${absDays} ${absDays === 1 ? 'day' : 'days'}\nCost per Day (Base / 30): ${formatMoney(dailyRate, curr, rate)}\nTotal Absence Deduction: -${formatMoney(totalCost, curr, rate)} (${formatMoney(dailyRate, curr, rate)} × ${absDays} days)\n* Subtracted from Base Salary`;

                          return (
                            <div
                              className="relative group/abs inline-flex items-center justify-center cursor-help"
                              title={tooltipTitle}
                            >
                              <span className="px-2 py-0.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-[10.5px] font-bold font-mono inline-flex items-center gap-1 shadow-2xs group-hover/abs:bg-rose-100 group-hover/abs:border-rose-300 transition-all">
                                <span className="material-symbols-outlined text-[12px] text-rose-500">event_busy</span>
                                <span>-{formatMoney(totalCost, curr, rate)}</span>
                              </span>

                              {/* Hover Tooltip Breakdown Card - Top 5 rows open downwards to prevent cutoff outside top bar */}
                              <div
                                className={`absolute left-1/2 -translate-x-1/2 ${
                                  idx < 5 ? 'top-full mt-2' : 'bottom-full mb-2'
                                } hidden group-hover/abs:flex flex-col z-[9999] pointer-events-none w-64 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 text-[11px] animate-fade-in`}
                              >
                                <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                                    <span className="material-symbols-outlined text-[15px] text-rose-400">calculate</span>
                                    <span>Absence Deduction</span>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 text-[10px] font-mono font-bold">
                                    {absDays} {absDays === 1 ? 'day' : 'days'}
                                  </span>
                                </div>

                                <div className="space-y-1.5 font-mono text-slate-300">
                                  <div className="flex justify-between items-center text-[10.5px]">
                                    <span className="text-slate-400 font-sans">Absence Count:</span>
                                    <span className="font-bold text-amber-300">{absDays} {absDays === 1 ? 'Day' : 'Days'}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10.5px]">
                                    <span className="text-slate-400 font-sans">Base Salary:</span>
                                    <span className="font-bold text-slate-200">{formatMoney(emp.baseSalary, curr, rate)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10.5px]">
                                    <span className="text-slate-400 font-sans">Cost / Day (Base ÷ 30):</span>
                                    <span className="font-bold text-amber-300">{formatMoney(dailyRate, curr, rate)}</span>
                                  </div>

                                  <div className="pt-2 mt-1 border-t border-slate-800 flex justify-between items-center text-xs">
                                    <span className="text-slate-200 font-bold font-sans">Amount Cut:</span>
                                    <span className="font-extrabold text-rose-400">-{formatMoney(totalCost, curr, rate)}</span>
                                  </div>
                                </div>

                                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center gap-1 text-[10px] text-emerald-400 font-sans">
                                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                  <span>Subtracted from Base Salary</span>
                                </div>

                                {/* Indicator arrow */}
                                {idx < 5 ? (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900/95" />
                                ) : (
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900/95" />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* SEARCH FEE */}
                      <td className="py-2 px-1.5 font-mono text-center">
                        {(() => {
                          const searchUsd = isForeign ? (emp.searchFee || 0) : 0;
                          const searchIqd = isForeign
                            ? (emp.searchFeeIqd || Math.round((emp.searchFee || 0) * rate))
                            : (emp.searchFee || 0);
                          const hasSearch = isForeign ? searchUsd > 0 : searchIqd > 0;

                          if (!hasSearch) {
                            return (
                              <span className="mx-auto px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 text-[10.5px] border border-slate-200 inline-block">
                                -
                              </span>
                            );
                          }

                          return isForeign ? (
                            <div
                              className="flex flex-col items-center justify-center gap-0.5 cursor-help"
                              title={`Scientific Research Fee:\nDollar: -${formatMoney(searchUsd, 'USD', rate)}\nEquivalent: -${formatMoney(searchIqd, 'IQD')}\nSubtracted from Net Salary`}
                            >
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10.5px] font-bold border border-amber-200 inline-block">
                                -${formatMoney(searchUsd, 'USD', rate)}
                              </span>
                              <span className="text-[9px] text-slate-400 font-sans font-medium">
                                {formatMoney(searchIqd, 'IQD')}
                              </span>
                            </div>
                          ) : (
                            <span
                              title={`Scientific Research Fee Deduction: -${formatMoney(searchIqd, 'IQD')} (Subtracted from Net Salary)`}
                              className="mx-auto px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10.5px] font-bold border border-amber-200 cursor-help inline-block"
                            >
                              -{formatMoney(searchIqd, 'IQD')}
                            </span>
                          );
                        })()}
                      </td>

                      {/* THE NET SALARY (PAYOUT) - Prominent & Big as Employee Name */}
                      <td className="py-2 px-1.5 text-center">
                        {(() => {
                          const net = Math.max(0, emp.netSalary || 0);
                          if (isForeign) {
                            const hundreds = Math.floor(net / 100) * 100;
                            const remainder = Math.round((net - hundreds) * 100.0) / 100.0;
                            const remainderIqd = Math.round(remainder * rate);
                            const totalIqd = Math.round(net * rate);
                            const billCount = Math.floor(net / 100);

                            return (
                              <div
                                className="flex flex-col items-center justify-center gap-1 mx-auto max-w-[140px]"
                                title={`Net Salary: ${formatMoney(net, 'USD', rate)}\nCash Payout: ${formatMoney(hundreds, 'USD', rate)} (${billCount} bills) + ${formatMoney(remainderIqd, 'IQD')} cash\nTotal in IQD: ≈ ${formatMoney(totalIqd, 'IQD')}`}
                              >
                                {/* Prominent Net Salary in Dollar - Big as Employee Name */}
                                <div className="px-3.5 py-1 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-xs flex items-center justify-center gap-1 ring-1 ring-emerald-500/20">
                                  <span className="text-[14px] font-black font-mono tracking-tight leading-none text-emerald-950">
                                    {formatMoney(net, 'USD', rate)}
                                  </span>
                                </div>

                                {/* Compact Cash Disbursement: Hundreds on Left | Remainder on Right */}
                                <div className="grid grid-cols-2 gap-0.5 p-0.5 rounded-md bg-slate-50 border border-slate-200/90 text-[10px] font-mono w-full">
                                  {/* Left: Hundreds Payout */}
                                  <div className="flex flex-col items-center justify-center border-r border-slate-200/80 px-0.5">
                                    <span className="font-bold text-slate-800 text-[10.5px] leading-tight">
                                      {formatMoney(hundreds, 'USD', rate)}
                                    </span>
                                  </div>

                                  {/* Right: Remainder < $100 */}
                                  <div className="flex flex-col items-center justify-center px-0.5">
                                    <span className="font-bold text-amber-800 text-[10px] leading-tight">
                                      {remainder > 0 ? `+$${remainder.toFixed(remainder % 1 === 0 ? 0 : 2)}` : '$0'}
                                    </span>
                                    <span className="text-[8px] text-amber-700 font-bold font-sans">
                                      {remainder > 0 ? `${remainderIqd.toLocaleString()} IQD` : '0 IQD'}
                                    </span>
                                  </div>
                                </div>

                                {/* Subtitle: Total IQD */}
                                <div className="text-[9px] text-slate-500 font-mono">
                                  <span className="text-slate-400">≈ </span>
                                  <span className="font-bold text-slate-700">{totalIqd.toLocaleString()} IQD</span>
                                </div>
                              </div>
                            );
                          }

                          // Local employee: Prominent Net Salary Badge - Big as Employee Name
                          return (
                            <div className="flex items-center justify-center">
                              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-xs font-mono font-black text-[14px] tracking-tight inline-block ring-1 ring-emerald-500/20">
                                {formatMoney(net, 'IQD')}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* STATE (Circular toggle button with paid-by hover tooltip) */}
                      <td className="py-2 px-1.5 text-center">
                        <div className="relative group/state inline-flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleState(e, emp)}
                            title={isPaid ? `Paid${emp.paidBy ? ` by ${emp.paidBy}` : ''}${emp.paidAt ? ` on ${emp.paidAt}` : ''}. Click to revert.` : `Status is ${emp.paymentStatus}. Click to toggle.`}
                            className="p-1 rounded-full hover:bg-slate-100 transition-all cursor-pointer inline-flex items-center justify-center active:scale-90"
                          >
                            <span
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                isPaid
                                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                                  : isStopped
                                  ? 'border-rose-500 bg-rose-500 text-white'
                                  : 'border-slate-300 hover:border-slate-500 bg-transparent'
                              }`}
                            >
                              {isPaid && <span className="material-symbols-outlined text-[13px]">check</span>}
                              {isStopped && <span className="material-symbols-outlined text-[13px]">block</span>}
                            </span>
                          </button>

                          {/* Hover tooltip — only show when PAID and paidBy/paidAt data exists */}
                          {isPaid && (emp.paidBy || emp.paidAt) && (
                            <div
                              className={`absolute left-1/2 -translate-x-1/2 ${
                                idx < 5 ? 'top-full mt-2' : 'bottom-full mb-2'
                              } hidden group-hover/state:flex flex-col z-[9999] pointer-events-none w-56 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 text-[11px] animate-fade-in`}
                            >
                              <div className="flex items-center gap-1.5 border-b border-slate-700/80 pb-2 mb-2">
                                <span className="material-symbols-outlined text-[15px] text-emerald-400">receipt_long</span>
                                <span className="font-bold text-slate-200 tracking-wide">Voucher Disbursed</span>
                              </div>
                              <div className="space-y-1.5 font-mono text-slate-300">
                                {emp.paidBy && (
                                  <div className="flex justify-between items-center text-[10.5px]">
                                    <span className="text-slate-400 font-sans">Paid by:</span>
                                    <span className="font-bold text-emerald-300">{emp.paidBy}</span>
                                  </div>
                                )}
                                {emp.paidAt && (
                                  <div className="flex justify-between items-center text-[10.5px]">
                                    <span className="text-slate-400 font-sans">Date &amp; Time:</span>
                                    <span className="font-semibold text-slate-200">{emp.paidAt}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center gap-1 text-[10px] text-amber-400 font-sans">
                                <span className="material-symbols-outlined text-[13px]">warning</span>
                                <span>Click to revert disbursement</span>
                              </div>
                              {/* Arrow */}
                              {idx < 5 ? (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900/95" />
                              ) : (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900/95" />
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* PAID DATE & TIME */}
                      <td className="py-2 px-1.5 text-center font-mono text-[10.5px] text-slate-500">
                        {isPaid && emp.paidAt ? (
                          <span className="text-emerald-700 font-semibold">{emp.paidAt}</span>
                        ) : (
                          <span className="text-slate-400">-- Not Paid --</span>
                        )}
                      </td>

                      {/* ACTIONS - Sticky to right edge */}
                      <td
                        className={`sticky right-0 z-10 py-2 px-2 text-center border-l border-slate-200/90 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] transition-all ${
                          selectedIds.has(emp.id)
                            ? 'bg-teal-100'
                            : isStopped
                            ? 'bg-rose-50 group-hover:bg-rose-100'
                            : 'bg-white group-hover:bg-teal-100/70'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          {/* View (Eye icon) */}
                          <button
                            type="button"
                            onClick={() => setViewingEmployee(emp)}
                            className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="View Employee Details"
                          >
                            <span className="material-symbols-outlined text-[17px]">visibility</span>
                          </button>

                          {userRole !== 'Fiscal Auditor' && (
                            <>
                              {/* Edit (Pencil icon) */}
                              <button
                                type="button"
                                onClick={() => setEditingEmployee(emp)}
                                className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Compensation Breakdown"
                              >
                                <span className="material-symbols-outlined text-[17px]">edit</span>
                              </button>

                              {/* Delete (Trash icon) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmModalConfig({
                                    isOpen: true,
                                    title: 'Delete Staff Member?',
                                    message: `Are you sure you want to delete ${emp.fullName} from the payroll ledger? This action cannot be undone.`,
                                    variant: 'danger',
                                    confirmText: 'Delete Record',
                                    cancelText: 'Keep Employee',
                                    employeeDetails: {
                                      name: emp.fullName,
                                      id: emp.employeeCode || emp.id,
                                      status: emp.paymentStatus,
                                      baseSalary: emp.baseSalary,
                                      netSalary: emp.netSalary,
                                      currency: emp.currency,
                                    },
                                    onConfirm: async () => {
                                      setConfirmModalConfig(null);
                                      await onDeleteEmployee(emp.id);
                                    },
                                    onCancel: () => {
                                      setConfirmModalConfig(null);
                                    },
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete staff record"
                              >
                                <span className="material-symbols-outlined text-[17px]">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-16 text-center text-slate-400 space-y-2">
                      <span className="material-symbols-outlined text-4xl text-slate-300">group_off</span>
                      <p className="text-sm font-bold text-slate-600">No staff members match the selected criteria</p>
                      <p className="text-xs text-slate-400">Try adjusting search query or filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls matching ReportsView (Item 8) */}
          {sorted.length > 0 && (
            <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-4">
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

                {/* Status breakdown pill */}
                <div className="hidden md:flex items-center gap-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    {sorted.filter((e) => e.paymentStatus === 'PAID').length} Paid
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                    {sorted.filter((e) => e.paymentStatus === 'UNPAID').length} Unpaid
                  </span>
                  {sorted.some((e) => e.paymentStatus === 'STOPPED') && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                      {sorted.filter((e) => e.paymentStatus === 'STOPPED').length} Stopped
                    </span>
                  )}
                  <span className="text-slate-400 font-sans">
                    Total: <b className="text-slate-700">{sorted.length}</b> staff
                  </span>
                </div>
              </div>

              {/* Page navigation matching ReportsView */}
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

      {/* View Employee Modal (Pic 4) */}
      <ViewEmployeeModal
        isOpen={Boolean(viewingEmployee)}
        employee={viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        rate={rate}
      />

      {/* Edit Compensation Modal (Pic 3) */}
      <EditCompensationModal
        isOpen={Boolean(editingEmployee)}
        employee={editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onSave={handleSaveEdit}
        rate={rate}
      />

      {/* Enhanced Rich Warning & Confirmation Modal */}
      {confirmModalConfig && <ConfirmModal {...confirmModalConfig} />}
    </div>
  );
};
