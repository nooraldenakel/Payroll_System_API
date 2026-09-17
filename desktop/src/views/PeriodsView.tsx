import React, { useState, useMemo } from 'react';
import { PayrollPeriod } from '../types';
import { api, formatMoney } from '../services/api';
import { ConfirmModal, ConfirmModalProps } from '../components/ConfirmModal';

interface PeriodsViewProps {
  periods: PayrollPeriod[];
  activePeriod: PayrollPeriod | null;
  currentUserEmail?: string;
  currency?: 'IQD' | 'USD';
  rate?: number;
  onSelectPeriod: (p: PayrollPeriod) => void;
  onCreatePeriod: () => void;
  onRecalculate: (id: string) => Promise<void>;
  onClosePeriod: (id: string) => Promise<void>;
  onActivatePeriod?: (id: string) => Promise<void>;
  onUpdatePeriod?: (id: string, updated: Partial<PayrollPeriod>) => Promise<void>;
  onDeletePeriod?: (id: string) => Promise<void>;
  onViewRoster: (p: PayrollPeriod) => void;
}

export const PeriodsView: React.FC<PeriodsViewProps> = ({
  periods,
  activePeriod,
  currentUserEmail,
  currency = 'IQD',
  rate = 1310,
  onSelectPeriod,
  onCreatePeriod,
  onRecalculate,
  onClosePeriod,
  onActivatePeriod,
  onUpdatePeriod,
  onDeletePeriod,
  onViewRoster,
}) => {
  // Search & Filter States
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');

  // Modals & Action States
  const [inspectingPeriod, setInspectingPeriod] = useState<PayrollPeriod | null>(null);
  const [isEditingInModal, setIsEditingInModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PayrollPeriod>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Enhanced Rich Warning & Confirmation Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<ConfirmModalProps | null>(null);

  // Protected Past Cycle Confirmation Modal
  const [confirmSwitchPeriod, setConfirmSwitchPeriod] = useState<PayrollPeriod | null>(null);

  // Deletion Clearance Modal
  const [deletingPeriod, setDeletingPeriod] = useState<PayrollPeriod | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper: Format Total Ledger with 'M' (e.g. 164.43M IQD)
  const formatLedgerKpi = (amount: number, curr: string = 'IQD') => {
    if (!amount || amount === 0) return `0 ${curr}`;
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(2)}M ${curr}`;
    }
    return `${amount.toLocaleString()} ${curr}`;
  };

  // Helper: Extract Avatar Initials/Month from Period Name (e.g. A / AUG, $ / SEP, J / JUL)
  const getPeriodAvatar = (p: PayrollPeriod) => {
    const name = p.name || '';
    const matchMonth = name.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i);
    const m = matchMonth ? matchMonth[0].toUpperCase() : (p.code?.slice(0, 3).toUpperCase() || 'CYC');
    const top = p.status === 'DRAFT' ? '$' : (m[0] || 'A');
    return { top, bottom: m };
  };

  // Metrics across all periods
  const openCount = useMemo(() => periods.filter((p) => p.status === 'OPEN').length, [periods]);
  const archivedCount = useMemo(
    () => periods.filter((p) => p.status === 'ARCHIVED' || p.status === 'CLOSED').length,
    [periods]
  );
  const draftCount = useMemo(() => periods.filter((p) => p.status === 'DRAFT').length, [periods]);
  const totalStaff = useMemo(
    () => periods.reduce((max, p) => Math.max(max, p.employeeCount || 0), 0) || 120,
    [periods]
  );

  // Filtered periods
  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchCode = p.code?.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }

      // Status
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'OPEN' && p.status !== 'OPEN') return false;
        if (filterStatus === 'DRAFT' && p.status !== 'DRAFT') return false;
        if (filterStatus === 'ARCHIVED' && p.status !== 'ARCHIVED' && p.status !== 'CLOSED') return false;
      }

      // Fiscal Year
      if (filterYear !== 'ALL') {
        if (!p.startDate?.includes(filterYear) && !p.name?.includes(filterYear)) return false;
      }

      return true;
    });
  }, [periods, search, filterStatus, filterYear]);

  // Open Inspect / Edit Modal
  const handleOpenInspect = (p: PayrollPeriod, editMode: boolean = false) => {
    setInspectingPeriod(p);
    setIsEditingInModal(editMode);
    setEditForm({
      name: p.name,
      code: p.code,
      startDate: p.startDate,
      endDate: p.endDate,
      payDate: p.payDate,
      status: p.status,
      exchangeRate: p.exchangeRate && p.exchangeRate !== 1310 ? p.exchangeRate : (rate || 1310),
    });
    setActionSuccessMsg(null);
  };

  // Save changes from Edit Modal
  const handleSaveEdit = async () => {
    if (!inspectingPeriod || !onUpdatePeriod) return;
    setIsSavingEdit(true);
    try {
      await onUpdatePeriod(inspectingPeriod.id, editForm);
      setInspectingPeriod({ ...inspectingPeriod, ...editForm } as PayrollPeriod);
      setIsEditingInModal(false);
      setActionSuccessMsg('Period settings successfully updated!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to save period updates: ${err.message || 'Error'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Activate Draft Period
  const handleActivateDraft = async (p: PayrollPeriod, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdatePeriod) {
      await onUpdatePeriod(p.id, { status: 'OPEN' });
    }
    onSelectPeriod({ ...p, status: 'OPEN' });
  };

  // Archive Period with Rich Warning Modal
  const handleArchive = (p: PayrollPeriod, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModalConfig({
      isOpen: true,
      variant: 'warning',
      badgeLabel: 'Seal & Archive Payroll Cycle',
      title: `Archive Cycle: ${p.name}`,
      message: `You are about to seal and archive cycle "${p.name}". Once archived, all live staff compensation records will be securely locked and hidden from active ledger displays until explicitly reactivated.`,
      confirmText: 'Archive Cycle Now',
      bulletPoints: [
        'Cycle records will be sealed to prevent accidental live modifications',
        'Staff records for this cycle will be hidden from the active roster view',
        'Can be reactivated at any time by authorized payroll officers'
      ],
      contextDetails: [
        { label: 'Cycle Name', value: p.name },
        { label: 'Reference Code', value: p.code || 'N/A' },
        { label: 'Enrolled Staff', value: `${p.employeeCount || 0} Members` },
      ],
      onConfirm: async () => {
        setConfirmModalConfig(null);
        await onClosePeriod(p.id);
      },
      onCancel: () => setConfirmModalConfig(null),
    });
  };

  // Activate Archived Period with Confirmation Modal (Item 6)
  const handleActivatePeriod = (p: PayrollPeriod, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModalConfig({
      isOpen: true,
      variant: 'info',
      badgeLabel: 'Restore Archived Cycle',
      title: `Activate Cycle: ${p.name}`,
      message: `Reactivate cycle "${p.name}"? This will make it the active payroll cycle and display its records on the staff roster and executive dashboard.`,
      confirmText: 'Activate Cycle',
      contextDetails: [
        { label: 'Cycle Name', value: p.name },
        { label: 'Reference Code', value: p.code || 'N/A' },
      ],
      onConfirm: async () => {
        setConfirmModalConfig(null);
        if (onActivatePeriod) {
          await onActivatePeriod(p.id);
        } else if (onUpdatePeriod) {
          await onUpdatePeriod(p.id, { status: 'OPEN' });
          onSelectPeriod({ ...p, status: 'OPEN' });
        }
      },
      onCancel: () => setConfirmModalConfig(null),
    });
  };

  // Reopen Period
  const handleReopen = async (p: PayrollPeriod, e: React.MouseEvent) => {
    e.stopPropagation();
    await handleActivatePeriod(p, e);
  };

  // Switch Period Handler (Checks if protected past month)
  const handleSwitchPeriod = (p: PayrollPeriod, e: React.MouseEvent) => {
    e.stopPropagation();
    const isArchived = p.status === 'ARCHIVED' || p.status === 'CLOSED';
    if (isArchived) {
      setConfirmSwitchPeriod(p);
    } else {
      onSelectPeriod(p);
    }
  };

  // Clearance Deletion Handler
  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword.trim()) {
      setDeleteError('Clearance password is required to delete an archived period.');
      return;
    }
    if (!deletingPeriod) return;

    setIsDeleting(true);
    setDeleteError('');
    try {
      const emailToVerify = (currentUserEmail || '').trim();
      if (emailToVerify) {
        try {
          await api.login(emailToVerify, deletePassword);
        } catch {
          setDeleteError('Authentication failed: Invalid clearance password. Deletion rejected.');
          setIsDeleting(false);
          return;
        }
      }

      if (onDeletePeriod) {
        await onDeletePeriod(deletingPeriod.id);
      } else {
        await api.deletePeriod(deletingPeriod.id);
      }
      setDeletingPeriod(null);
      setDeletePassword('');
      if (inspectingPeriod?.id === deletingPeriod.id) {
        setInspectingPeriod(null);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete period.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc] text-slate-900 select-none">
      <div className="w-full px-2 sm:px-4 md:px-6 space-y-5 pb-20">
        {/* =========================================================================
            TOP 4 METRIC CARDS (Matching User Uploaded Picture)
            ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: CURRENT ACTIVE MONTH */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#0f4a47] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {activePeriod?.status === 'ARCHIVED' ? 'SELECTED (ARCHIVED)' : 'CURRENT ACTIVE MONTH'}
                  </span>
                  <div className="text-lg font-black text-slate-900">
                    {activePeriod?.name || 'August 2026'}
                  </div>
                </div>
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full mt-1 ${
                  activePeriod?.status === 'ARCHIVED' ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'
                }`}
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="font-mono text-xs text-slate-400">
                {activePeriod?.code || 'PR-2608-gov'}
              </span>
              {activePeriod && (
                activePeriod.status === 'ARCHIVED' ? (
                  <button
                    type="button"
                    onClick={(e) => handleActivatePeriod(activePeriod, e)}
                    className="px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[15px]">lock_open</span>
                    <span>Activate Cycle</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleArchive(activePeriod)}
                    className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[15px]">lock</span>
                    <span>Archive Cycle</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* CARD 2: RECORDED CYCLES */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    RECORDED CYCLES
                  </span>
                  <div className="text-lg font-black text-slate-900">
                    {periods.length} Total Periods
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center text-xs font-mono text-slate-500 pt-1 border-t border-slate-100">
              <span className="text-emerald-600 font-bold">{openCount} Open</span>
              <span className="mx-1.5 text-slate-300">•</span>
              <span className="text-slate-600 font-bold">{archivedCount} Archived</span>
              <span className="mx-1.5 text-slate-300">•</span>
              <span className="text-amber-600 font-bold">{draftCount} Draft</span>
            </div>
          </div>

          {/* CARD 3: WORKFORCE BASE */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[20px]">group</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    WORKFORCE BASE
                  </span>
                  <div className="text-lg font-black text-slate-900">
                    {totalStaff} Staff Members
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="font-mono text-slate-500">
                Peg: 1 USD = {rate?.toLocaleString() || '1,310'} IQD
              </span>
              <span className="text-teal-700 font-bold font-mono">Dual Currency</span>
            </div>
          </div>

          {/* CARD 4: PROTECTED PAST MONTHS (Dark Navy Card) */}
          <div className="p-4 rounded-2xl bg-[#0c1524] text-white border border-slate-800 shadow-md flex flex-col justify-between space-y-2.5">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10.5px] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">shield</span>
                <span>PROTECTED PAST MONTHS</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Switching to past cycles prompts confirmation and tracks any historical adjustments under strict audit oversight.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-bold pt-1 border-t border-slate-800">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
              <span>Zero data loss on switch.</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SEARCH AND FILTER BAR
            ========================================================================= */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search period by name (e.g. 'July 2026') or reference ID..."
              className="w-full pl-9 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:text-slate-900 shadow-2xs transition-all"
            />
          </div>

          {/* Status & Fiscal Year Filters + Create Period Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold px-3 py-2 shadow-2xs outline-none cursor-pointer hover:bg-slate-50"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Active (Open)</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold px-3 py-2 shadow-2xs outline-none cursor-pointer hover:bg-slate-50"
            >
              <option value="ALL">All Fiscal Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>

            <button
              type="button"
              onClick={onCreatePeriod}
              className="px-3.5 py-2 bg-[#0f4a47] hover:bg-[#0b3836] text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>New Cycle</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            PERIOD CARDS GRID (Cards matching User Uploaded Picture)
            ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPeriods.map((period) => {
            const isActive = activePeriod?.id === period.id;
            const isDraft = period.status === 'DRAFT';
            const isArchived = period.status === 'ARCHIVED' || period.status === 'CLOSED';
            const avatar = getPeriodAvatar(period);

            return (
              <div
                key={period.id}
                className={`rounded-3xl p-5 shadow-2xs flex flex-col justify-between space-y-4 transition-all relative ${
                  isActive
                    ? 'bg-white border-2 border-teal-700 shadow-md ring-1 ring-teal-700/20'
                    : isDraft
                    ? 'bg-white border-t-4 border-t-amber-500 border-x border-b border-slate-200'
                    : 'bg-white border-t-4 border-t-slate-400 border-x border-b border-slate-200'
                }`}
              >
                {/* Header Row: Avatar, Title, Ref ID, Status Pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar with top initial and bottom month */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-black leading-tight shrink-0 shadow-2xs ${
                        isActive
                          ? 'bg-[#0f4a47] text-white'
                          : isDraft
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className="text-[14px]">{avatar.top}</span>
                      <span className="text-[8.5px] font-mono tracking-wider opacity-80">
                        {avatar.bottom}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-slate-900 text-base tracking-tight">
                          {period.name}
                        </h4>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-md bg-[#0f4a47] text-white text-[9px] font-bold uppercase tracking-wider">
                            CURRENT CYCLE
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-slate-400 italic">
                        Ref: {period.code || 'PR-2608-gov'}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isActive ? (
                      <span className="px-3 py-1 rounded-full bg-[#0f4a47] text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Active (Open)</span>
                      </span>
                    ) : isDraft ? (
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>Draft</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        <span>Archived</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics Boxes (2 Sub-boxes: Staff Records & Total Ledger) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-0.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
                      STAFF RECORDS
                    </span>
                    <div className="font-black font-mono text-slate-900 text-sm">
                      {period.employeeCount || 0} Staff
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-0.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
                      TOTAL LEDGER
                    </span>
                    <div className="font-black font-mono text-slate-900 text-sm">
                      {formatLedgerKpi(period.totalGross || period.totalNet, currency)}
                    </div>
                  </div>
                </div>

                {/* Creator & Date Line */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                    <span>{isDraft ? 'System Scheduled' : 'Aziz Sulaiman'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-slate-500">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">
                      calendar_today
                    </span>
                    <span>{period.startDate || 'Aug 1, 2026'}</span>
                  </div>
                </div>

                {/* Middle Action Buttons (Inspect + Action) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenInspect(period)}
                    className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-500">
                      manage_search
                    </span>
                    <span>Inspect</span>
                  </button>

                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => handleArchive(period)}
                      className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[15px]">lock</span>
                      <span>Archive</span>
                    </button>
                  ) : isArchived ? (
                    <button
                      type="button"
                      onClick={(e) => handleActivatePeriod(period, e)}
                      className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      <span>Activate Cycle</span>
                    </button>
                  ) : isDraft ? (
                    <button
                      type="button"
                      onClick={(e) => handleActivateDraft(period, e)}
                      className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px] text-amber-700">
                        arrow_upward
                      </span>
                      <span>Activate</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleActivatePeriod(period, e)}
                      className="py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      <span>Activate Cycle</span>
                    </button>
                  )}
                </div>

                {/* Bottom Primary Action Button */}
                <div>
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => onViewRoster(period)}
                      className="w-full py-2.5 bg-[#0f4a47] hover:bg-[#0b3836] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[18px]">group</span>
                      <span>Open Active Roster</span>
                    </button>
                  ) : isDraft ? (
                    <button
                      type="button"
                      onClick={(e) => handleSwitchPeriod(period, e)}
                      className="w-full py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[18px]">cached</span>
                      <span>Switch to {period.name}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleSwitchPeriod(period, e)}
                      className="w-full py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[18px]">history</span>
                      <span>Switch to Archived {period.name}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          INSPECT & EDIT PERIOD MODAL
          ========================================================================= */}
      {inspectingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-2xl bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5 animate-scale-in text-slate-800 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0f4a47] text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {inspectingPeriod.name}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Reference ID: {inspectingPeriod.code}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingInModal(!isEditingInModal)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isEditingInModal
                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                      : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isEditingInModal ? 'visibility' : 'edit'}
                  </span>
                  <span>{isEditingInModal ? 'View Mode' : 'Edit Period'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectingPeriod(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {actionSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{actionSuccessMsg}</span>
              </div>
            )}

            {/* Content: View or Edit Mode */}
            {!isEditingInModal ? (
              <div className="space-y-4 text-xs">
                {/* 3 KPI Summary Cards inside Modal */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                    <div className="font-bold text-slate-900">{inspectingPeriod.status}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Staff</span>
                    <div className="font-bold text-slate-900 font-mono">
                      {inspectingPeriod.employeeCount || 0} Staff
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Net Ledger</span>
                    <div className="font-bold text-emerald-700 font-mono">
                      {formatMoney(inspectingPeriod.totalNet || 0, currency, rate)}
                    </div>
                  </div>
                </div>

                {/* Breakdown List */}
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Period Name:</span>
                    <span className="font-bold text-slate-800">{inspectingPeriod.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                    <span className="text-slate-500">Period Code:</span>
                    <span className="font-bold text-slate-800">{inspectingPeriod.code}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                    <span className="text-slate-500">Cycle Date Range:</span>
                    <span className="font-bold text-slate-800">
                      {inspectingPeriod.startDate} → {inspectingPeriod.endDate}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                    <span className="text-slate-500">Official Disbursal Date:</span>
                    <span className="font-bold text-slate-800">{inspectingPeriod.payDate}</span>
                  </div>
                  <div className="flex justify-between py-1 font-mono">
                    <span className="text-slate-500">Exchange Peg:</span>
                    <span className="font-bold text-teal-800">
                      1 USD = {(rate || inspectingPeriod.exchangeRate || 1310).toLocaleString()} IQD
                    </span>
                  </div>
                </div>

                {/* Action Row inside modal */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {/* Recalculate button with clear tooltip explaining that it recomputes totals from DB staff records */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await onRecalculate(inspectingPeriod.id);
                          setActionSuccessMsg('Period aggregates recalculated from individual employee records!');
                        }}
                        title="Recalculates period financial aggregates (Gross, Deductions, Net, and Staff Count) directly by summing all individual employee records stored in the database for this cycle."
                        className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px] text-teal-700">
                          calculate
                        </span>
                        <span>Recalculate</span>
                      </button>
                      <span
                        className="material-symbols-outlined text-[16px] text-slate-400 cursor-help"
                        title="Recomputes period totals directly from individual employee records in the database."
                      >
                        info
                      </span>
                    </div>

                    {/* Delete button (Enforce Archive first requirement with Rich Warning Modal - Item 5) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (inspectingPeriod.status !== 'ARCHIVED' && inspectingPeriod.status !== 'CLOSED') {
                          setConfirmModalConfig({
                            isOpen: true,
                            variant: 'warning',
                            badgeLabel: 'Governance Policy Restriction',
                            title: 'Period Archival Required Before Deletion',
                            message: `Institutional Rule: You cannot delete active cycle "${inspectingPeriod.name}". All cycles must first be sealed and archived before clearance deletion can be authorized. Would you like to archive this cycle now?`,
                            confirmText: 'Seal & Archive Cycle Now',
                            cancelText: 'Dismiss Notice',
                            bulletPoints: [
                              'Active or draft cycles cannot be directly purged to prevent accidental data loss',
                              'Archiving the cycle safely secures the ledger and unlocks deletion clearance'
                            ],
                            contextDetails: [
                              { label: 'Current Cycle', value: inspectingPeriod.name },
                              { label: 'Current Status', value: inspectingPeriod.status, badge: true },
                            ],
                            onConfirm: async () => {
                              setConfirmModalConfig(null);
                              await onClosePeriod(inspectingPeriod.id);
                              setInspectingPeriod(null);
                            },
                            onCancel: () => setConfirmModalConfig(null),
                          });
                          return;
                        }
                        setDeletingPeriod(inspectingPeriod);
                      }}
                      title={
                        inspectingPeriod.status !== 'ARCHIVED' && inspectingPeriod.status !== 'CLOSED'
                          ? 'Click to view archive requirement'
                          : 'Delete archived period'
                      }
                      className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                        inspectingPeriod.status !== 'ARCHIVED' && inspectingPeriod.status !== 'CLOSED'
                          ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {inspectingPeriod.status !== 'ARCHIVED' && inspectingPeriod.status !== 'CLOSED' ? 'lock' : 'delete'}
                      </span>
                      <span>{inspectingPeriod.status !== 'ARCHIVED' && inspectingPeriod.status !== 'CLOSED' ? 'Archive to Delete' : 'Delete'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onViewRoster(inspectingPeriod);
                      setInspectingPeriod(null);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-[#0f4a47] hover:bg-[#0b3836] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    <span>View Cycle Roster</span>
                  </button>
                </div>
              </div>
            ) : (
              /* EDIT FORM */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveEdit();
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Period Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-xs font-bold outline-none focus:bg-white focus:text-slate-900 focus:border-teal-600 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Period Reference Code</label>
                    <input
                      type="text"
                      required
                      value={editForm.code || ''}
                      onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-xs font-mono outline-none focus:bg-white focus:text-slate-900 focus:border-teal-600 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Start Date</label>
                    <input
                      type="date"
                      value={editForm.startDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-xs font-mono outline-none focus:bg-white focus:text-slate-900 focus:border-teal-600 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">End Date</label>
                    <input
                      type="date"
                      value={editForm.endDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-xs font-mono outline-none focus:bg-white focus:text-slate-900 focus:border-teal-600 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Status</label>
                    <select
                      value={editForm.status || 'OPEN'}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold outline-none focus:bg-white focus:text-slate-900 focus:border-teal-600 shadow-2xs cursor-pointer"
                    >
                      <option value="OPEN">OPEN (Active Run)</option>
                      <option value="DRAFT">DRAFT (Scheduled)</option>
                      <option value="ARCHIVED">ARCHIVED (Sealed)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Exchange Peg (USD to IQD)</label>
                    <input
                      type="number"
                      value={editForm.exchangeRate || rate || 1310}
                      onChange={(e) =>
                        setEditForm({ ...editForm, exchangeRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-xs font-mono outline-none focus:bg-white focus:text-slate-900 focus:border-teal-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingInModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 rounded-xl bg-[#0f4a47] hover:bg-[#0b3836] text-white font-bold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Period Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          PROTECTED PAST CYCLE CONFIRMATION MODAL
          ========================================================================= */}
      {confirmSwitchPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 animate-scale-in text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
              <span className="material-symbols-outlined text-[28px]">shield</span>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Protected Past Cycle Switch
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You are switching active context to archived cycle{' '}
                <strong className="text-slate-900 font-bold">{confirmSwitchPeriod.name}</strong>. Any
                historical modifications will be audited under strict governance.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 font-mono text-center">
              ✓ Zero data loss guaranteed on cycle switch.
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSwitchPeriod(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectPeriod(confirmSwitchPeriod);
                  setConfirmSwitchPeriod(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Confirm & Switch Cycle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ENHANCED CLEARANCE PASSWORD DELETION MODAL
          ========================================================================= */}
      {deletingPeriod && (
        <div
          id="delete-clearance-modal-backdrop"
          onClick={(e) => {
            if ((e.target as HTMLElement).id === 'delete-clearance-modal-backdrop') {
              setDeletingPeriod(null);
              setDeletePassword('');
              setDeleteError('');
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-[32px] p-7 sm:p-8 border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] space-y-4 animate-modal-pop text-slate-800 overflow-hidden ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

            {/* Glowing Emblem & Header */}
            <div className="flex items-start gap-4 mb-2 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-xl shadow-rose-500/35 ring-8 ring-rose-100/80 animate-danger-glow flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[32px]">lock_reset</span>
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider mb-1.5 bg-rose-50 text-rose-800 border border-rose-200/90 ring-1 ring-rose-300/50 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                  Irreversible Deletion Clearance
                </span>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  Authorize Cycle Deletion
                </h3>
              </div>
            </div>

            {/* Warning Callout Box */}
            <div className="p-4 rounded-2xl border-l-4 border-l-rose-600 border-y border-r border-rose-200 bg-gradient-to-r from-rose-50/90 via-rose-50/50 to-white flex items-start gap-3 shadow-2xs relative z-10">
              <span className="material-symbols-outlined text-[22px] text-rose-600 shrink-0 mt-0.5">
                warning
              </span>
              <p className="text-xs text-rose-950 font-medium leading-relaxed">
                You are authorizing the permanent removal of cycle <strong className="font-black text-slate-900">{deletingPeriod.name}</strong>.
                All associated staff payout snapshots, historical adjustments, and cycle metrics will be permanently purged.
              </p>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2 relative z-10 animate-fade-in">
                <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDelete} className="space-y-4 text-xs relative z-10">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Authorized Officer Password</span>
                  <span className="text-[10px] text-slate-400 font-normal">Super Admin clearance required</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your clearance password to confirm..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-xs font-medium outline-none focus:bg-white focus:text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-2xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingPeriod(null);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer shadow-2xs transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 hover:from-rose-700 hover:to-rose-900 text-white font-black text-xs cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[17px]">delete_forever</span>
                  <span>{isDeleting ? 'Verifying...' : 'Authorize Deletion'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rich Warning & Confirmation Modal */}
      {confirmModalConfig && <ConfirmModal {...confirmModalConfig} />}
    </div>
  );
};
